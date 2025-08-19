/**
 * SearchEngine.ts
 * Main facade for the NexusSearch engine, integrating all components
 */
import { IndexManager } from "./IndexManager";
import { QueryProcessor } from "./QueryProcessor";
import { CacheManager } from "@/storage/CacheManager";
import { SearchStorage } from "@/storage/SearchStorage";
import { TrieSearch } from "@/core/algorithms/TrieSearch";
import { bfsRegexTraversal, dfsRegexTraversal } from "@/core/algorithms";
import { calculateScore, extractMatches } from "@/utils";

import {
    SearchOptions,
    SearchResult,
    SearchEngineConfig,
    SearchEventListener,
    SearchEvent,
    IndexNode,
    DocumentContent,
    ExtendedSearchOptions,
    RegexSearchConfig,
    RegexSearchResult,
    DocumentValue,
    IndexedDocument
} from "@/core/types";

/**
 * SearchEngine is the main entry point for search functionality
 * Integrates all components and provides a simplified API for search operations
 */
export class SearchEngine {
    // Core components
    private readonly indexManager: IndexManager;
    private readonly queryProcessor: QueryProcessor;
    private readonly storage: SearchStorage;
    private readonly cache: CacheManager;
    private readonly trie: TrieSearch = new TrieSearch();
    
    // Configuration and state
    private readonly config: SearchEngineConfig;
    private readonly documentSupport: boolean;
    private isInitialized = false;
    
    // Data structures
    private readonly documents: Map<string, IndexedDocument>;
    private readonly eventListeners: Set<SearchEventListener>;
    private readonly trieRoot: IndexNode;

    /**
     * Create a new SearchEngine instance
     * @param config Configuration for the search engine
     */
    constructor(config: SearchEngineConfig) {
        // Validate config
        if (!config || !config.name) {
            throw new Error('Invalid search engine configuration');
        }

        // Initialize configuration
        this.config = {
            ...config,
            search: {
                ...config.search,
                defaultOptions: config.search?.defaultOptions || {}
            }
        };
        this.documentSupport = config.documentSupport?.enabled ?? false;

        // Initialize core components
        this.indexManager = new IndexManager({
            name: config.name,
            version: config.version,
            fields: config.fields,
            options: config.search?.defaultOptions
        });
        this.queryProcessor = new QueryProcessor();
        const storageConfig = {
            type: (config.storage?.type === 'indexeddb' ? 'indexeddb' : 'memory') as 'memory' | 'indexeddb',
            options: config.storage?.options
        };
        this.storage = new SearchStorage(storageConfig);
        this.cache = new CacheManager();
        this.trie.clear();

        // Initialize data structures
        this.documents = new Map();
        this.eventListeners = new Set();
        this.trieRoot = { 
            id: '', 
            value: '', 
            score: 0, 
            children: new Map(), 
            depth: 0 
        };

        // Bind methods that need 'this' context
        this.search = this.search.bind(this);
        this.addDocument = this.addDocument.bind(this);
        this.removeDocument = this.removeDocument.bind(this);
    }

    /**
     * Initialize the search engine and its components
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize storage
            await this.storage.initialize();

            // Initialize index manager
            this.indexManager.initialize();

            // Load existing indexes if any
            await this.loadExistingIndexes();

            this.isInitialized = true;

            // Emit initialization event
            this.emitEvent({
                type: 'engine:initialized',
                timestamp: Date.now()
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to initialize search engine: ${errorMessage}`);
        }
    }

    /**
     * Load existing indexes from storage
     */
    private async loadExistingIndexes(): Promise<void> {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
                const documents = this.indexManager.getAllDocuments();
                
                for (const [id, doc] of documents) {
                    this.documents.set(id, doc);
                    this.trie.addDocument(doc);
                }
            }
        } catch (error) {
            console.warn('Failed to load stored indexes:', error);
        }
    }

    /**
     * Add a document to the search index
     * @param document Document to add
     */
    async addDocument(document: IndexedDocument): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Normalize and validate document
        const normalizedDoc = this.normalizeDocument(document);
        if (!this.validateDocument(normalizedDoc)) {
            throw new Error(`Invalid document structure: ${document.id}`);
        }

        try {
            // Store the document
            this.documents.set(normalizedDoc.id, normalizedDoc);
            
            // Index the document
            this.indexManager.addDocument(normalizedDoc);
            
            // Add to trie for fast search
            this.trie.addDocument(normalizedDoc);
            
            // Clear relevant cache entries to ensure fresh results
            this.cache.clear();
            
            // Emit event
            this.emitEvent({
                type: 'index:complete',
                timestamp: Date.now(),
                data: { documentId: normalizedDoc.id }
            });
        } catch (error) {
            this.emitEvent({
                type: 'index:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to add document: ${error}`);
        }
    }

    /**
     * Add multiple documents to the search index
     * @param documents Array of documents to add
     */
    async addDocuments(documents: IndexedDocument[]): Promise<void> {
        this.emitEvent({
            type: 'index:start',
            timestamp: Date.now(),
            data: { documentCount: documents.length }
        });
        
        for (const doc of documents) {
            await this.addDocument(doc);
        }
        
        this.emitEvent({
            type: 'bulk:update:complete',
            timestamp: Date.now(),
            data: { documentCount: documents.length }
        });
    }

    /**
     * Perform a search with the specified query and options
     * @param query Search query string
     * @param options Search options
     * @returns Array of search results
     */
    async search<T>(query: string, options: SearchOptions = {}): Promise<SearchResult<T>[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!query.trim()) {
            return [];
        }

        const searchOptions = {
            ...this.config.search?.defaultOptions,
            ...options,
            fields: options.fields || this.config.fields
        };

        // Generate cache key for this query and options
        const cacheKey = this.generateCacheKey(query, searchOptions);
        
        // Check cache first
        const cachedResults = this.cache.get(cacheKey);
        if (cachedResults) {
            return cachedResults as SearchResult<T>[];
        }

        this.emitEvent({
            type: 'search:start',
            timestamp: Date.now(),
            data: { query, options: searchOptions }
        });

        try {
            // Process the query
            const processedQuery = this.queryProcessor.process(query);
            if (!processedQuery) return [];

            let searchResults: SearchResult<T>[];
            
            // Check if this is a regex search
            if (searchOptions.regex) {
                // Special handling for regex searches using BFS/DFS
                searchResults = await this.performRegexSearch(
                    processedQuery,
                    searchOptions as ExtendedSearchOptions
                ) as unknown as SearchResult<T>[];
            } else {
                // Standard search
                searchResults = await this.performStandardSearch<T>(
                    processedQuery, 
                    searchOptions
                );
            }

            // Cache results
            this.cache.set(cacheKey, searchResults);
            
            this.emitEvent({
                type: 'search:complete',
                timestamp: Date.now(),
                data: { 
                    query, 
                    resultCount: searchResults.length,
                    searchTime: Date.now() - performance.now()
                }
            });

            return searchResults;
        } catch (error) {
            this.emitEvent({
                type: 'search:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            
            console.error('Search error:', error);
            throw new Error(`Search failed: ${error}`);
        }
    }

    /**
     * Perform standard (non-regex) search
     */
    private async performStandardSearch<T>(
        processedQuery: string,
        searchOptions: SearchOptions
    ): Promise<SearchResult<T>[]> {
        // Split into separate terms for multi-term search
        const terms = processedQuery.split(/\s+/).filter(Boolean);
        const searchResults = new Map<string, SearchResult<T>>();

        // Search through each field
        for (const field of searchOptions.fields) {
            for (const term of terms) {
                // Search for each term
                for (const [docId, document] of this.documents) {
                    const score = calculateScore(document, term, field, {
                        fuzzy: searchOptions.fuzzy,
                        caseSensitive: searchOptions.caseSensitive,
                        fieldWeight: searchOptions.boost?.[field] || 1
                    });

                    if (score > (searchOptions.threshold || 0)) {
                        const existingResult = searchResults.get(docId);
                        
                        // Combined score for multi-term queries
                        const combinedScore = existingResult 
                            ? existingResult.score + score
                            : score;
                            
                        // Create new matches array or combine with existing
                        const matches = existingResult
                            ? [...existingResult.matches, term]
                            : [term];
                            
                        searchResults.set(docId, {
                            id: docId,
                            docId,
                            item: document as unknown as T,
                            score: combinedScore,
                            matches,
                            metadata: {
                                ...document.metadata,
                                lastAccessed: Date.now(),
                                lastModified: document.metadata?.lastModified ?? Date.now()
                            },
                            document: document as unknown as IndexedDocument,
                            term: processedQuery
                        });
                    }
                }
            }
        }

        // Sort and limit results
        let results = Array.from(searchResults.values())
            .sort((a, b) => b.score - a.score);

        // Apply field extraction if requested
        if (searchOptions.includeMatches) {
            results = results.map(result => ({
                ...result,
                matches: extractMatches(
                    result.document,
                    processedQuery,
                    searchOptions.fields,
                    {
                        fuzzy: searchOptions.fuzzy,
                        caseSensitive: searchOptions.caseSensitive
                    }
                )
            }));
        }

        // Apply pagination
        if (searchOptions.page && searchOptions.pageSize) {
            const startIdx = (searchOptions.page - 1) * searchOptions.pageSize;
            results = results.slice(startIdx, startIdx + searchOptions.pageSize);
        } else if (searchOptions.maxResults) {
            results = results.slice(0, searchOptions.maxResults);
        }

        return results;
    }

    /**
     * Perform regex-based search using BFS or DFS traversal
     */
    public async performRegexSearch(
        query: string,
        options: ExtendedSearchOptions
    ): Promise<SearchResult<IndexedDocument>[]> {
        const regexConfig: RegexSearchConfig = {
            maxDepth: options.regexConfig?.maxDepth || 50,
            timeoutMs: options.regexConfig?.timeoutMs || 5000,
            caseSensitive: options.regexConfig?.caseSensitive || false,
            wholeWord: options.regexConfig?.wholeWord || false
        };

        const regex = this.createRegexFromOption(options.regex || '');

        // Determine search strategy based on regex complexity
        const regexResults = this.isComplexRegex(regex) ?
            dfsRegexTraversal(
                this.trieRoot,
                regex,
                options.maxResults || 10,
                regexConfig
            ) :
            bfsRegexTraversal(
                this.trieRoot,
                regex,
                options.maxResults || 10,
                regexConfig
            );

        // Map regex results to SearchResult format
        return regexResults.map(result => {
            const document = this.documents.get(result.id);
            if (!document) {
                throw new Error(`Document not found for id: ${result.id}`);
            }

            return {
                id: result.id,
                docId: result.id,
                term: result.matches[0] || query, // Use first match or query as term
                score: result.score,
                matches: result.matches,
                document: document,
                item: document,
                metadata: {
                    ...document.metadata,
                    lastAccessed: Date.now(),
                    lastModified: document.metadata?.lastModified !== undefined ? document.metadata.lastModified : Date.now()
                }
            };
        }).filter(result => result.score >= (options.minScore || 0));
    }

    /**
     * Creates a RegExp object from various input types
     */
    private createRegexFromOption(regexOption: string | RegExp | object): RegExp {
        if (regexOption instanceof RegExp) {
            return regexOption;
        }
        if (typeof regexOption === 'string') {
            return new RegExp(regexOption);
        }
        if (typeof regexOption === 'object' && regexOption !== null) {
            const pattern = 'pattern' in regexOption ? (regexOption as { pattern: string }).pattern : '';
            const flags = 'flags' in regexOption ? (regexOption as { flags: string }).flags : '';
            return new RegExp(pattern || '', flags || '');
        }
        return new RegExp('');
    }

    /**
     * Determines if a regex pattern is complex
     */
    private isComplexRegex(regex: RegExp): boolean {
        const pattern = regex.source;
        return (
            pattern.includes('{') ||
            pattern.includes('+') ||
            pattern.includes('*') ||
            pattern.includes('?') ||
            pattern.includes('|') ||
            pattern.includes('(?') ||
            pattern.includes('[') ||
            pattern.length > 20  // Additional complexity check based on pattern length
        );
    }

    /**
     * Remove a document from the index
     * @param documentId ID of the document to remove
     */
    public async removeDocument(documentId: string): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }

        try {
            this.documents.delete(documentId);
            this.trie.removeDocument(documentId);
            await this.indexManager.removeDocument(documentId);
            this.cache.clear();

            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            } catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }

            this.emitEvent({
                type: 'remove:complete',
                timestamp: Date.now(),
                data: { documentId }
            });
        } catch (error) {
            this.emitEvent({
                type: 'remove:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to remove document: ${error}`);
        }
    }

    /**
     * Clear the entire search index
     */
    public async clearIndex(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await this.storage.clearIndices();
            this.documents.clear();
            this.trie.clear();
            this.indexManager.clear();
            this.cache.clear();

            this.emitEvent({
                type: 'index:clear',
                timestamp: Date.now()
            });
        } catch (error) {
            this.emitEvent({
                type: 'index:clear:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to clear index: ${error}`);
        }
    }

    /**
     * Update an existing document
     * @param document Updated document data
     */
    public async updateDocument(document: IndexedDocument): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
    
        // Normalize the document while preserving as much of the original structure as possible
        const normalizedDoc = this.normalizeDocument(document);
    
        // Validate the normalized document
        if (!this.validateDocument(normalizedDoc)) {
            throw new Error(`Invalid document structure: ${document.id}`);
        }
    
        // Handle versioning if enabled
        if (this.documentSupport && this.config.documentSupport?.versioning?.enabled) {
            await this.handleVersioning(normalizedDoc);
        }
    
        // Update documents, trie, and index manager
        this.documents.set(normalizedDoc.id, normalizedDoc);
        this.trie.addDocument(normalizedDoc);
        await this.indexManager.updateDocument(normalizedDoc);
        
        // Clear cache to ensure fresh results
        this.cache.clear();
    }

    /**
     * Handle document versioning
     */
    private async handleVersioning(doc: IndexedDocument): Promise<void> {
        const existingDoc = this.getDocument(doc.id);
        if (!existingDoc) return;

        const maxVersions = this.config.documentSupport?.versioning?.maxVersions ?? 10;
        const versions = existingDoc.versions || [];

        if (doc.fields.content !== existingDoc.fields.content) {
            versions.push({
                version: Number(existingDoc.fields.version),
                content: existingDoc.fields.content,
                modified: new Date(existingDoc.fields.modified || Date.now()),
                author: existingDoc.fields.author
            });

            // Keep only the latest versions
            if (versions.length > maxVersions) {
                versions.splice(0, versions.length - maxVersions);
            }

            doc.versions = versions;
            doc.fields.version = String(Number(doc.fields.version || 0) + 1);
        }
    }

    /**
     * Validate a document structure
     */
    private validateDocument(doc: IndexedDocument): boolean {
        return (
            typeof doc.id === 'string' &&
            doc.id.length > 0 &&
            typeof doc.fields === 'object' &&
            doc.fields !== null
        );
    }

    /**
     * Normalize a document to ensure consistent structure
     */
    private normalizeDocument(doc: IndexedDocument): IndexedDocument {
        // Ensure doc has a fields object, defaulting to an empty object if not present
        const fields = doc.fields || {};

        // Create a new IndexedDocument with normalized and default values
        return {
            id: doc.id, // Preserve original ID
            fields: {
                // Preserve other potential fields from the original document
                ...fields,

                // Additional fields with fallbacks
                title: fields.title || '',
                content: fields.content || { text: '' },
                author: fields.author || '',
                tags: Array.isArray(fields.tags) ? fields.tags : [],
                version: fields.version || '1.0',
                links: doc.links || [],
                ranks: doc.ranks || [],
                body: fields.body || '', // Additional fallback for body
                type: fields.type || 'document' // Add a default type
            },
            metadata: {
                // Normalize metadata with defaults
                ...(doc.metadata || {}),
                indexed: doc.metadata?.indexed || Date.now(),
                lastModified: doc.metadata?.lastModified || Date.now(),
            },
            versions: doc.versions || [],
            relations: doc.relations || [],
            document: doc.document || (() => doc),
            base: doc.base || (() => ({
                id: doc.id,
                title: fields.title || '',
                author: fields.author || '',
                tags: Array.isArray(fields.tags) ? fields.tags : [],
                version: fields.version || '1.0',
                metadata: doc.metadata,
                versions: doc.versions || [],
                relations: doc.relations || []
            })),
            title: fields.title || '',
            author: fields.author || '',
            tags: Array.isArray(fields.tags) ? fields.tags : [],
            version: fields.version || '1.0',
            content: fields.content || { text: '' }
        };
    }

    /**
     * Helper method to normalize content
     */
    private normalizeContent(content: unknown): DocumentContent {
        if (!content) return {};
        if (typeof content === 'string') return { text: content };
        if (typeof content === 'object') return content as DocumentContent;
        return { value: String(content) };
    }

    /**
     * Get a document by ID
     */
    public getDocument(id: string): IndexedDocument | undefined {
        return this.documents.get(id);
    }

    /**
     * Get all documents in the index
     */
    public getAllDocuments(): IndexedDocument[] {
        return Array.from(this.documents.values());
    }

    /**
     * Generate a cache key for a search query
     */
    private generateCacheKey(query: string, options: SearchOptions): string {
        return `${this.config.name}-${query}-${JSON.stringify(options)}`;
    }

    /**
     * Register an event listener
     */
    public addEventListener(listener: SearchEventListener): void {
        this.eventListeners.add(listener);
    }

    /**
     * Remove an event listener
     */
    public removeEventListener(listener: SearchEventListener): void {
        this.eventListeners.delete(listener);
    }

    /**
     * Emit search engine events
     */
    private emitEvent(event: SearchEvent): void {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    /**
     * Close the search engine and release resources
     */
    public async close(): Promise<void> {
        try {
            await this.storage.close();
            this.cache.clear();
            this.documents.clear();
            this.isInitialized = false;

            this.emitEvent({
                type: 'engine:closed',
                timestamp: Date.now()
            });
        } catch (error) {
            console.warn('Error during close:', error);
        }
    }

    /**
     * Get statistics about the search engine
     */
    public getStats(): {
        documentCount: number;
        indexSize: number;
        cacheSize: number;
        initialized: boolean;
    } {
        return {
            documentCount: this.documents.size,
            indexSize: this.indexManager.getSize(),
            cacheSize: this.cache.getSize(),
            initialized: this.isInitialized
        };
    }

    /**
     * Check if the search engine is initialized
     */
    public isReady(): boolean {
        return this.isInitialized;
    }
}