// src/core/storage/IncrementalIndexManager.ts
import { IndexMapper } from "@/mappers";
import { 
  IndexConfig, 
  SearchOptions, 
  SearchResult, 
  IndexedDocument, 
  SearchableDocument, 
  SerializedIndex,
  DocumentValue
} from "@/core/types";
import { createSearchableFields } from "@/utils";
import { PersistenceManager, PersistenceOptions } from "./PersistenceManager";

/**
 * Options for IncrementalIndexManager
 */
export interface IncrementalIndexOptions {
  /**
   * Index configuration
   */
  config: IndexConfig;
  
  /**
   * Persistence options
   */
  persistence?: PersistenceOptions;
  
  /**
   * Auto-save configuration
   */
  autoSave?: {
    enabled: boolean;
    interval?: number;
    threshold?: number;
  };
  
  /**
   * Batch processing options
   */
  batch?: {
    enabled: boolean;
    size?: number;
    concurrency?: number;
  };
}

/**
 * IncrementalIndexManager provides incremental document indexing capabilities
 * with persistence support. It allows for efficient indexing of large document sets
 * through batching and incremental updates.
 */
export class IncrementalIndexManager {
  private indexMapper: IndexMapper;
  private documents: Map<string, IndexedDocument>;
  private config: IndexConfig;
  private persistenceManager: PersistenceManager;
  private pendingChanges: Set<string> = new Set();
  private autoSaveTimer: number | null = null;
  private options: IncrementalIndexOptions;
  private initialized: boolean = false;
  private isSaving: boolean = false;
  private lastSaved: number = 0;

  /**
   * Creates a new IncrementalIndexManager instance.
   * @param options - Configuration options
   */
  constructor(options: IncrementalIndexOptions) {
    this.config = options.config;
    this.options = {
      autoSave: {
        enabled: true,
        interval: 30000, // 30 seconds
        threshold: 100 // changes before auto-save
      },
      batch: {
        enabled: true,
        size: 100,
        concurrency: 1
      },
      ...options
    };
    
    this.indexMapper = new IndexMapper();
    this.documents = new Map();
    this.persistenceManager = new PersistenceManager(options.persistence);
  }

  /**
   * Initializes the index manager.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize the persistence manager
      await this.persistenceManager.initialize();
      
      // Try to load existing index
      const indexName = `${this.config.name}-v${this.config.version}`;
      const storedIndex = await this.persistenceManager.getIndex(indexName);
      
      if (storedIndex) {
        await this.loadFromStorage(storedIndex);
      } else {
        this.indexMapper = new IndexMapper();
        this.documents = new Map();
      }
      
      // Start auto-save if enabled
      if (this.options.autoSave?.enabled) {
        this.startAutoSave();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize IncrementalIndexManager:', error);
      throw new Error(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensures the manager is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Loads an index from storage.
   * @param storedIndex - The serialized index
   */
  private async loadFromStorage(storedIndex: SerializedIndex): Promise<void> {
    try {
      // Recreate indexMapper from stored state
      this.indexMapper = new IndexMapper();
      if (storedIndex.indexState) {
        this.indexMapper.importState(storedIndex.indexState as any);
      }
      
      // Recreate documents map
      this.documents = new Map(
        storedIndex.documents.map(item => [item.key, item.value])
      );
      
      // Update config if provided
      if (storedIndex.config) {
        this.config = storedIndex.config;
      }
    } catch (error) {
      console.error('Failed to load index from storage:', error);
      throw new Error(`Loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Starts the auto-save timer.
   */
  private startAutoSave(): void {
    // Clear any existing timer
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer as any);
    }
    
    // Set up new timer
    this.autoSaveTimer = setInterval(() => {
      this.checkAndSave();
    }, this.options.autoSave?.interval || 30000) as unknown as number;
  }

  /**
   * Checks if auto-save should be triggered and saves if needed.
   */
  private async checkAndSave(): Promise<void> {
    // Skip if already saving or no changes
    if (this.isSaving || this.pendingChanges.size === 0) {
      return;
    }
    
    // Check if threshold is reached or time interval has passed
    const threshold = this.options.autoSave?.threshold || 100;
    const interval = this.options.autoSave?.interval || 30000;
    const now = Date.now();
    
    if (this.pendingChanges.size >= threshold || now - this.lastSaved >= interval) {
      await this.saveIndex();
    }
  }

  /**
   * Saves the current index state to storage.
   */
  async saveIndex(): Promise<void> {
    if (this.isSaving) return;
    
    this.isSaving = true;
    
    try {
      const indexName = `${this.config.name}-v${this.config.version}`;
      const serializedIndex: SerializedIndex = {
        documents: Array.from(this.documents.entries()).map(([key, value]) => ({
          key,
          value
        })),
        indexState: this.indexMapper.exportState(),
        config: this.config
      };
      
      await this.persistenceManager.storeIndex(indexName, serializedIndex);
      await this.persistenceManager.updateMetadata(indexName, this.config);
      
      this.pendingChanges.clear();
      this.lastSaved = Date.now();
    } catch (error) {
      console.error('Failed to save index:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Adds a document to the index.
   * @param document - The document to add
   * @returns Promise resolving to the document ID
   */
  async addDocument<T extends IndexedDocument>(document: T): Promise<string> {
    await this.ensureInitialized();
    
    const id = document.id || this.generateDocumentId(this.documents.size);
    this.documents.set(id, document);
    
    // Create searchable document for indexing
    const searchableDoc = this.createSearchableDocument(document, id);
    
    // Index the document
    this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
    
    // Mark as pending change
    this.pendingChanges.add(id);
    
    return id;
  }

  /**
   * Adds multiple documents to the index with optional batching.
   * @param documents - Array of documents to add
   * @returns Promise resolving to an array of document IDs
   */
  async addDocuments<T extends IndexedDocument>(documents: T[]): Promise<string[]> {
    await this.ensureInitialized();
    
    if (!documents.length) return [];
    
    const documentIds: string[] = [];
    
    if (this.options.batch?.enabled && documents.length > (this.options.batch.size || 100)) {
      // Process in batches
      const batchSize = this.options.batch.size || 100;
      const batches = Math.ceil(documents.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, documents.length);
        const batch = documents.slice(start, end);
        
        const batchIds = await this.processBatch(batch);
        documentIds.push(...batchIds);
      }
    } else {
      // Process all at once
      for (const doc of documents) {
        const id = await this.addDocument(doc);
        documentIds.push(id);
      }
    }
    
    // Auto-save if many documents were added
    if (this.options.autoSave?.enabled && documentIds.length >= (this.options.autoSave.threshold || 100)) {
      await this.saveIndex();
    }
    
    return documentIds;
  }

  /**
   * Processes a batch of documents.
   * @param batch - Array of documents to process
   * @returns Promise resolving to an array of document IDs
   */
  private async processBatch<T extends IndexedDocument>(batch: T[]): Promise<string[]> {
    const documentIds: string[] = [];
    
    for (const doc of batch) {
      const id = doc.id || this.generateDocumentId(this.documents.size);
      this.documents.set(id, doc);
      
      const searchableDoc = this.createSearchableDocument(doc, id);
      this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
      
      this.pendingChanges.add(id);
      documentIds.push(id);
    }
    
    return documentIds;
  }

  /**
   * Creates a searchable document from an indexed document.
   * @param document - The indexed document
   * @param id - Document ID
   * @returns A searchable document
   */
  private createSearchableDocument(document: IndexedDocument, id: string): SearchableDocument {
    const contentRecord: Record<string, DocumentValue> = {};
    
    for (const field of this.config.fields) {
      if (field in document.fields) {
        contentRecord[field] = document.fields[field] as DocumentValue;
      }
    }
    
    return {
      id,
      version: this.config.version.toString(),
      content: createSearchableFields({
        content: contentRecord,
        id,
        version: this.config.version.toString()
      }, this.config.fields),
      metadata: document.metadata
    };
  }

  /**
   * Updates an existing document in the index.
   * @param document - The document to update
   * @returns Promise resolving when the update is complete
   */
  async updateDocument<T extends IndexedDocument>(document: T): Promise<void> {
    await this.ensureInitialized();
    
    const id = document.id;
    if (!this.documents.has(id)) {
      throw new Error(`Document ${id} not found`);
    }
    
    // Update document in storage
    this.documents.set(id, document);
    
    // Create searchable document
    const searchableDoc = this.createSearchableDocument(document, id);
    
    // Update in index
    this.indexMapper.updateDocument(searchableDoc, id, this.config.fields);
    
    // Mark as pending change
    this.pendingChanges.add(id);
  }

  /**
   * Removes a document from the index.
   * @param documentId - ID of the document to remove
   * @returns Promise resolving when the removal is complete
   */
  async removeDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();
    
    if (this.documents.has(documentId)) {
      // Remove from index
      this.indexMapper.removeDocument(documentId);
      
      // Remove from documents map
      this.documents.delete(documentId);
      
      // Mark as pending change
      this.pendingChanges.add(documentId);
    }
  }

  /**
   * Searches the index for documents matching the query.
   * @param query - Search query
   * @param options - Search options
   * @returns Promise resolving to search results
   */
  async search<T extends IndexedDocument>(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult<T>[]> {
    await this.ensureInitialized();
    
    // Handle empty query
    if (!query?.trim()) return [];
    
    try {
      const searchResults = this.indexMapper.search(query, {
        fuzzy: options.fuzzy ?? false,
        maxResults: options.maxResults ?? 10
      });
      
      return searchResults
        .filter(result => this.documents.has(result.item))
        .map(result => {
          const item = this.documents.get(result.item) as T;
          return {
            id: item.id,
            docId: item.id,
            term: query,
            document: item,
            metadata: item.metadata,
            item,
            score: result.score,
            matches: result.matches
          };
        })
        .filter(result => result.score >= (options.threshold ?? 0.5));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Gets a document by ID.
   * @param id - Document ID
   * @returns The document or undefined if not found
   */
  getDocument(id: string): IndexedDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Gets all documents in the index.
   * @returns Map of document IDs to documents
   */
  getAllDocuments(): Map<string, IndexedDocument> {
    return new Map(this.documents);
  }

  /**
   * Gets the count of documents in the index.
   * @returns Number of documents
   */
  getSize(): number {
    return this.documents.size;
  }

  /**
   * Gets the current index configuration.
   * @returns Index configuration
   */
  getConfig(): IndexConfig {
    return { ...this.config };
  }

  /**
   * Clears the index.
   * @returns Promise resolving when clearing is complete
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.indexMapper = new IndexMapper();
    this.pendingChanges.clear();
    
    // Save empty state
    await this.saveIndex();
  }

  /**
   * Generates a document ID.
   * @param index - Current index
   * @returns Generated document ID
   */
  private generateDocumentId(index: number): string {
    return `${this.config.name}-${index}-${Date.now()}`;
  }

  /**
   * Closes the index manager and releases resources.
   * @returns Promise resolving when closing is complete
   */
  async close(): Promise<void> {
    // Stop auto-save timer
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer as any);
      this.autoSaveTimer = null;
    }
    
    // Save any pending changes
    if (this.pendingChanges.size > 0) {
      await this.saveIndex();
    }
    
    // Close persistence manager
    await this.persistenceManager.close();
    
    // Reset state
    this.initialized = false;
  }
}