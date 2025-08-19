import { 
    IndexedDocument, 
    DocumentLink, 
    SearchOptions, 
    SearchResult, 
    DocumentBase,
    DocumentContent
} from "@/types";
import { TrieNode } from "./TrieNode";

export class TrieSearch {
    private root: TrieNode;
    private documents: Map<string, IndexedDocument>;
    private documentLinks: Map<string, DocumentLink[]>;
    private totalDocuments: number;
    private maxWordLength: number;

    constructor(maxWordLength = 50) {
        this.root = new TrieNode();
        this.documents = new Map();
        this.documentLinks = new Map();
        this.totalDocuments = 0;
        this.maxWordLength = maxWordLength;
    }

    /**
     * Insert a word into the trie with document reference 
     */
    public insert(word: string, id: string): void {
        if (word.length > this.maxWordLength) return;
        this.insertWord(word, id);
    }

    /**
     * Remove a document and all its references
     */
    public removeData(id: string): void {
        this.removeDocument(id);
    }

    /**
     * Add a document to the search index
     */
    public addDocument(document: IndexedDocument): void {
        if (!document || !document.id) return;

        // Validate document has required fields property
        if (!document.fields) {
            console.warn(`Document ${document.id} missing required fields property`);
            return;
        }

        this.documents.set(document.id, document);
        this.totalDocuments++;

        // Index all text fields
        Object.entries(document.fields).forEach(([key, field]) => {
            if (typeof field === 'string') {
                this.indexText(field, document.id);
            } else if (Array.isArray(field)) {
                field.forEach(item => {
                    if (typeof item === 'string') {
                        this.indexText(item, document.id);
                    }
                });
            } else if (key === 'content' && field && typeof field === 'object') {
                // Handle content object specifically - extract text field
                const content = field as Record<string, unknown>;
                if (content.text && typeof content.text === 'string') {
                    this.indexText(content.text, document.id);
                }
            }
        });
    }

    /**
     * Search for a single term
     */
    public searchWord(term: string): SearchResult<string>[] {
        return this.search(term);
    }

    /**
     * Perform search with various options
     */
    public search(query: string, options: SearchOptions = {}): SearchResult<string>[] {
        const {
            fuzzy = false,
            maxDistance = 2,
            prefixMatch = false,
            maxResults = 10,
            minScore = 0.1,
            caseSensitive = false
        } = options;

        const words = this.tokenize(query, caseSensitive);
        const results = new Map<string, SearchResult<string>>();

        if (words.length === 0) return [];

        words.forEach(word => {
            let matches: SearchResult<string>[] = [];

            if (fuzzy) {
                matches = this.fuzzySearch(word, maxDistance);
            } else if (prefixMatch) {
                matches = this.prefixSearch(word);
            } else {
                matches = this.exactSearch(word);
            }

            matches.forEach(match => {
                const existing = results.get(match.docId);
                if (!existing || existing.score < match.score) {
                    results.set(match.docId, match);
                }
            });
        });

        return Array.from(results.values())
            .filter(result => result.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Export trie state for serialization (legacy method)
     */
    public exportState(): unknown {
        return this.serializeState();
    }

    /**
     * Serialize trie state
     */
    public serializeState(): unknown {
        return {
            trie: this.serializeTrie(this.root),
            documents: Array.from(this.documents.entries()),
            documentLinks: Array.from(this.documentLinks.entries()),
            totalDocuments: this.totalDocuments,
            maxWordLength: this.maxWordLength
        };
    }

    /**
     * Deserialize trie state
     */
    public deserializeState(state: unknown): void {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state data');
        }

        const typedState = state as {
            trie: unknown;
            documents: [string, IndexedDocument][];
            documentLinks: [string, DocumentLink[]][];
            totalDocuments: number;
            maxWordLength: number;
        };

        this.root = this.deserializeTrie(typedState.trie as { 
            prefixCount: number; 
            isEndOfWord: boolean; 
            documentRefs: string[]; 
            children: Record<string, unknown>;
            weight?: number;
        });
        this.documents = new Map(typedState.documents);
        this.documentLinks = new Map(typedState.documentLinks);
        this.totalDocuments = typedState.totalDocuments || 0;
        this.maxWordLength = typedState.maxWordLength || 50;
    }

    /**
     * Add document data
     * 
     * Creates a new document with provided content and adds it to the search index
     * 
     * @param documentId Document ID
     * @param content Text content for the document
     * @param document Base document with other metadata
     */
    public addData(documentId: string, content: string, document: IndexedDocument): void {
        if (!documentId || typeof content !== 'string') return;
        
        // Create a normalized document content object
        const contentObj: DocumentContent = { text: content };
        
        // Create a document with all required properties
        const normalizedDocument: IndexedDocument = {
            id: documentId,
            fields: {
                content: contentObj,
                title: document.fields?.title || '',
                author: document.fields?.author || '',
                tags: Array.isArray(document.fields?.tags) ? [...document.fields.tags] : [],
                version: document.fields?.version || '1.0'
            },
            metadata: document.metadata ? { ...document.metadata } : {
                lastModified: Date.now(), // Minimum required metadata
                indexed: Date.now()
            },
            versions: Array.isArray(document.versions) ? [...document.versions] : [],
            relations: Array.isArray(document.relations) ? [...document.relations] : [],
            document: () => document,
            base: function (): DocumentBase {
                return {
                    id: this.id,
                    title: this.fields.title,
                    author: this.fields.author,
                    tags: this.fields.tags,
                    version: this.fields.version,
                    metadata: this.metadata,
                    versions: this.versions,
                    relations: this.relations
                };
            },
            title: document.fields?.title || '',
            author: document.fields?.author || '',
            tags: Array.isArray(document.fields?.tags) ? [...document.fields.tags] : [],
            version: document.fields?.version || '1.0',
            content: contentObj // This is the required property that was missing in tests
        };

        this.addDocument(normalizedDocument);
    }

    /**
     * Perform fuzzy search with edit distance
     */
    public fuzzySearch(word: string, maxDistance: number): SearchResult<string>[] {
        const results: SearchResult<string>[] = [];
        
        const searchState = {
            word,
            maxDistance,
            results
        };

        this.fuzzySearchRecursive(this.root, "", 0, 0, searchState);
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Remove a document from the index
     */
    public removeDocument(documentId: string): void {
        const docExists = this.documents.has(documentId);
        
        // Remove document references and update weights
        this.removeDocumentRefs(this.root, documentId);
        this.documents.delete(documentId);
        this.documentLinks.delete(documentId);
        
        // Only decrement if the document actually existed
        if (docExists) {
            this.totalDocuments = Math.max(0, this.totalDocuments - 1);
        }
        
        this.pruneEmptyNodes(this.root);
    }

    /**
     * Get autocomplete suggestions for a prefix
     */
    public getSuggestions(prefix: string, maxResults = 5): string[] {
        let current = this.root;
        
        // Navigate to prefix node
        for (const char of prefix) {
            if (!current.hasChild(char)) {
                return [];
            }
            const child = current.getChild(char);
            if (!child) {
                return [];
            }
            current = child;
        }

        // Collect suggestions
        const suggestions: Array<{ word: string; score: number }> = [];
        this.collectSuggestions(current, prefix, suggestions);

        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map(suggestion => suggestion.word);
    }

    /**
     * Clear the trie and all its data
     */
    public clear(): void {
        this.root = new TrieNode();
        this.documents.clear();
        this.documentLinks.clear();
        this.totalDocuments = 0;
    }

    /*** PRIVATE METHODS ***/

    private indexText(text: string, documentId: string): void {
        if (!text) return;
        
        const words = this.tokenize(text);
        const uniqueWords = new Set(words);

        uniqueWords.forEach(word => {
            if (word.length <= this.maxWordLength) {
                this.insertWord(word, documentId);
            }
        });
    }

    private insertWord(word: string, documentId: string): void {
        let current = this.root;
        current.prefixCount++;

        for (const char of word) {
            if (!current.hasChild(char)) {
                current = current.addChild(char);
            } else {
                const child = current.getChild(char);
                if (child) {
                    current = child;
                } else {
                    return;
                }
            }
            current.prefixCount++;
        }

        current.isEndOfWord = true;
        current.documentRefs.add(documentId);
        current.incrementWeight();
    }

    private exactSearch(word: string): SearchResult<string>[] {
        const results: SearchResult<string>[] = [];
        let current = this.root;

        for (const char of word) {
            if (!current.hasChild(char)) {
                return results;
            }
            const child = current.getChild(char);
            if (!child) return [];
            current = child;
        }

        if (current.isEndOfWord) {
            current.documentRefs.forEach(docId => {
                const doc = this.documents.get(docId);
                if (doc) {
                    results.push({
                        docId,
                        score: this.calculateScore(current, word),
                        term: word,
                        id: docId,
                        document: doc,
                        item: docId,
                        matches: [word]
                    });
                }
            });
        }

        return results;
    }

    private prefixSearch(prefix: string): SearchResult<string>[] {
        const results: SearchResult<string>[] = [];
        let current = this.root;

        // Navigate to prefix node
        for (const char of prefix) {
            if (!current.hasChild(char)) {
                return results;
            }
            const child = current.getChild(char);
            if (!child) {
                return [];
            }
            current = child;
        }

        // Collect all words with this prefix
        this.collectWords(current, prefix, results);
        return results;
    }

    private collectWords(node: TrieNode, currentWord: string, results: SearchResult<string>[]): void {
        if (node.isEndOfWord) {
            node.documentRefs.forEach(docId => {
                const doc = this.documents.get(docId);
                if (doc) {
                    results.push({
                        docId,
                        score: this.calculateScore(node, currentWord),
                        term: currentWord,
                        id: docId,
                        document: doc,
                        item: docId,
                        matches: [currentWord]
                    });
                }
            });
        }

        node.children.forEach((child, char) => {
            this.collectWords(child, currentWord + char, results);
        });
    }

    private fuzzySearchRecursive(
        node: TrieNode, 
        current: string,
        currentDistance: number,
        depth: number,
        state: { word: string; maxDistance: number; results: SearchResult<string>[] }
    ): void {
        if (currentDistance > state.maxDistance) return;

        if (node.isEndOfWord) {
            const distance = this.calculateLevenshteinDistance(state.word, current);
            if (distance <= state.maxDistance) {
                node.documentRefs.forEach(docId => {
                    const doc = this.documents.get(docId);
                    if (doc) {
                        state.results.push({
                            docId,
                            score: this.calculateFuzzyScore(node, current, distance),
                            term: current,
                            distance,
                            id: docId,
                            document: doc,
                            item: docId,
                            matches: [current]
                        });
                    }
                });
            }
        }

        node.children.forEach((child, char) => {
            // Try substitution
            const substitutionCost = char !== state.word[depth] ? 1 : 0;
            this.fuzzySearchRecursive(
                child, 
                current + char, 
                currentDistance + substitutionCost,
                depth + 1,
                state
            );

            // Try insertion
            this.fuzzySearchRecursive(
                child,
                current + char,
                currentDistance + 1,
                depth,
                state
            );

            // Try deletion
            if (depth < state.word.length) {
                this.fuzzySearchRecursive(
                    node,
                    current,
                    currentDistance + 1,
                    depth + 1,
                    state
                );
            }
        });
    }

    private calculateScore(node: TrieNode, term: string): number {
        if (this.totalDocuments === 0 || node.documentRefs.size === 0) {
            return node.getWeight(); // Fallback if no documents
        }
        
        const tfIdf = (node.frequency / Math.max(1, this.totalDocuments)) * 
                     Math.log(this.totalDocuments / Math.max(1, node.documentRefs.size));
        const positionBoost = 1 / (node.depth + 1);
        const lengthNorm = 1 / Math.sqrt(Math.max(1, term.length));

        return node.getScore() * tfIdf * positionBoost * lengthNorm;
    }

    private calculateFuzzyScore(node: TrieNode, term: string, distance: number): number {
        const exactScore = this.calculateScore(node, term);
        // Exponential decay based on distance - prevents division by zero
        return exactScore * Math.exp(-Math.max(0.001, distance));
    }

    private calculateLevenshteinDistance(s1: string, s2: string): number {
        if (!s1 || !s2) return Math.max(s1.length, s2.length);
        
        const dp: number[][] = Array(s1.length + 1).fill(0)
            .map(() => Array(s2.length + 1).fill(0));
        for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
        for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                const substitutionCost = s1[i - 1] !== s2[j - 1] ? 1 : 0;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,              // deletion
                    dp[i][j - 1] + 1,              // insertion
                    dp[i - 1][j - 1] + substitutionCost  // substitution
                );
            }
        }
        return dp[s1.length][s2.length];
    }
    
    private tokenize(text: string, caseSensitive = false): string[] {
        if (!text) return [];
        
        const normalized = caseSensitive ? text : text.toLowerCase();
        return normalized
            .split(/[\s,.!?;:'"()[\]{}/\\]+/)
            .filter(word => word.length > 0);
    }
    
    private removeDocumentRefs(node: TrieNode, documentId: string): void {
        if (node.documentRefs.has(documentId)) {
            node.documentRefs.delete(documentId);
            node.decrementWeight();
            node.prefixCount = Math.max(0, node.prefixCount - 1);
        }
        node.children.forEach(child => {
            this.removeDocumentRefs(child, documentId);
        });
    }
    
    private pruneEmptyNodes(node: TrieNode): boolean {
        // Remove empty child nodes
        node.children.forEach((child, char) => {
            if (this.pruneEmptyNodes(child)) {
                node.children.delete(char);
            }
        });
        return node.shouldPrune();
    }
    
    private collectSuggestions(
        node: TrieNode, 
        currentWord: string, 
        suggestions: Array<{ word: string; score: number }>
    ): void {
        if (node.isEndOfWord) {
            suggestions.push({
                word: currentWord,
                score: node.getScore()
            });
        }
        node.children.forEach((child, char) => {
            this.collectSuggestions(child, currentWord + char, suggestions);
        });
    }
    
    private serializeTrie(node: TrieNode): unknown {
        const serializedNode = {
            prefixCount: node.prefixCount,
            isEndOfWord: node.isEndOfWord,
            documentRefs: Array.from(node.documentRefs),
            weight: node.getWeight(),
            children: {} as Record<string, unknown>
        };
        node.children.forEach((child, char) => {
            serializedNode.children[char] = this.serializeTrie(child);
        });
        return serializedNode;
    }
    
    private deserializeTrie(data: { 
        prefixCount: number; 
        isEndOfWord: boolean; 
        documentRefs: string[]; 
        children: Record<string, unknown>;
        weight?: number;
    }): TrieNode {
        const node = new TrieNode();
        node.prefixCount = data.prefixCount || 0;
        node.isEndOfWord = data.isEndOfWord || false;
        node.documentRefs = new Set(data.documentRefs || []);
        
        // Restore weight if available
        if (typeof data.weight === 'number' && data.weight > 0) {
            // Set weight by incrementing the appropriate number of times
            const times = Math.ceil(data.weight);
            for (let i = 0; i < times; i++) {
                node.incrementWeight(i === times - 1 ? data.weight % 1 || 1 : 1);
            }
        }
        // Restore children
        for (const char in data.children) {
            if (Object.prototype.hasOwnProperty.call(data.children, char)) {
                node.children.set(char, this.deserializeTrie(data.children[char] as { 
                    prefixCount: number; 
                    isEndOfWord: boolean; 
                    documentRefs: string[]; 
                    children: Record<string, unknown>;
                    weight?: number;
                }));
            }
        }
        return node;
    }
}