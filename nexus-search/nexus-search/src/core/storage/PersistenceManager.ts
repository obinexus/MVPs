// src/core/storage/PersistenceManager.ts
import { IndexConfig, SerializedIndex, StorageOptions } from "@/core/types";
import { StorageAdapter } from "./StorageAdapter";
import { InMemoryAdapter } from "./InMemoryAdapter";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import { CacheManager } from "./CacheManager";

/**
 * Options for PersistenceManager
 */
export interface PersistenceOptions {
  /**
   * Storage options
   */
  storage?: StorageOptions;
  
  /**
   * Cache options
   */
  cache?: {
    enabled: boolean;
    maxSize?: number;
    ttlMinutes?: number;
  };
  
  /**
   * Automatic fallback to in-memory storage if persistent storage fails
   */
  autoFallback?: boolean;
}

/**
 * PersistenceManager provides a unified interface for data persistence
 * with caching capabilities and fallback mechanisms.
 */
export class PersistenceManager {
  private adapter: StorageAdapter;
  private fallbackAdapter: StorageAdapter | null = null;
  private cache: CacheManager | null = null;
  private readonly options: PersistenceOptions;
  private initialized: boolean = false;

  /**
   * Creates a new PersistenceManager instance.
   * @param options - Configuration options
   */
  constructor(options: PersistenceOptions = {}) {
    this.options = {
      storage: {
        type: 'memory',
        maxSize: 1000,
        ttl: 300000 // 5 minutes in milliseconds
      },
      cache: {
        enabled: true,
        maxSize: 100,
        ttlMinutes: 5
      },
      autoFallback: true,
      ...options
    };

    // Create storage adapter based on options
    this.adapter = this.createAdapter(this.options.storage?.type || 'memory');
    
    // Initialize cache if enabled
    if (this.options.cache?.enabled) {
      this.cache = new CacheManager(
        this.options.cache.maxSize || 100,
        this.options.cache.ttlMinutes || 5
      );
    }
  }

  /**
   * Creates a storage adapter based on the specified type.
   * @param type - Storage type ('memory' or 'indexeddb')
   * @returns The created storage adapter
   */
  private createAdapter(type: string): StorageAdapter {
    switch (type) {
      case 'indexeddb':
        return new IndexedDBAdapter();
      case 'memory':
      default:
        return new InMemoryAdapter();
    }
  }

  /**
   * Initializes the persistence manager and its components.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize primary adapter
      await this.adapter.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize primary storage adapter:', error);
      
      if (this.options.autoFallback) {
        console.warn('Falling back to in-memory storage');
        this.fallbackAdapter = new InMemoryAdapter();
        await this.fallbackAdapter.initialize();
        this.adapter = this.fallbackAdapter;
        this.initialized = true;
      } else {
        throw new Error(`Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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
   * Stores an index with caching.
   * @param name - Index name
   * @param data - Serialized index data
   */
  async storeIndex(name: string, data: SerializedIndex): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.adapter.storeIndex(name, data);
      
      // Update cache if enabled
      if (this.cache) {
        this.cache.set(`index:${name}`, [{ data, score: 1, matches: [], id: name, docId: name, term: "", item: data }]);
      }
    } catch (error) {
      console.error(`Failed to store index '${name}':`, error);
      throw new Error(`Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves an index with caching.
   * @param name - Index name
   * @returns The serialized index or null if not found
   */
  async getIndex(name: string): Promise<SerializedIndex | null> {
    await this.ensureInitialized();
    
    // Try to get from cache first
    if (this.cache) {
      const cachedResult = this.cache.get(`index:${name}`);
      if (cachedResult && cachedResult.length > 0) {
        return cachedResult[0].data as SerializedIndex;
      }
    }
    
    try {
      const data = await this.adapter.getIndex(name);
      
      // Update cache if data found and cache is enabled
      if (data && this.cache) {
        this.cache.set(`index:${name}`, [{ data, score: 1, matches: [], id: name, docId: name, term: "", item: data }]);
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to retrieve index '${name}':`, error);
      throw new Error(`Retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates metadata for a specific index with caching.
   * @param name - Index name
   * @param config - Index configuration
   */
  async updateMetadata(name: string, config: IndexConfig): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.adapter.updateMetadata(name, config);
      
      // Update cache if enabled
      if (this.cache) {
        this.cache.set(`meta:${name}`, [{ data: config, score: 1, matches: [], id: name, docId: name, term: "", item: config }]);
      }
    } catch (error) {
      console.error(`Failed to update metadata for '${name}':`, error);
      throw new Error(`Metadata update error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves metadata for a specific index with caching.
   * @param name - Index name
   * @returns The index configuration or null if not found
   */
  async getMetadata(name: string): Promise<IndexConfig | null> {
    await this.ensureInitialized();
    
    // Try to get from cache first
    if (this.cache) {
      const cachedResult = this.cache.get(`meta:${name}`);
      if (cachedResult && cachedResult.length > 0) {
        return cachedResult[0].data as IndexConfig;
      }
    }
    
    try {
      const config = await this.adapter.getMetadata(name);
      
      // Update cache if data found and cache is enabled
      if (config && this.cache) {
        this.cache.set(`meta:${name}`, [{ data: config, score: 1, matches: [], id: name, docId: name, term: "", item: config }]);
      }
      
      return config;
    } catch (error) {
      console.error(`Failed to retrieve metadata for '${name}':`, error);
      throw new Error(`Metadata retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Removes an index and its metadata.
   * @param name - Index name
   */
  async removeIndex(name: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.adapter.removeIndex(name);
      
      // Remove from cache if enabled
      if (this.cache) {
        this.cache.get(`index:${name}`);
        this.cache.get(`meta:${name}`);
      }
    } catch (error) {
      console.error(`Failed to remove index '${name}':`, error);
      throw new Error(`Removal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clears all indices and metadata.
   */
  async clearIndices(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.adapter.clearIndices();
      
      // Clear cache if enabled
      if (this.cache) {
        this.cache.clear();
      }
    } catch (error) {
      console.error('Failed to clear indices:', error);
      throw new Error(`Clear error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if an index exists.
   * @param name - Index name
   * @returns Boolean indicating whether the index exists
   */
  async hasIndex(name: string): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      return await this.adapter.hasIndex(name);
    } catch (error) {
      console.error(`Failed to check if index '${name}' exists:`, error);
      throw new Error(`Check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all available indices.
   * @returns Array of index names
   */
  async listIndices(): Promise<string[]> {
    await this.ensureInitialized();
    
    try {
      return await this.adapter.listIndices();
    } catch (error) {
      console.error('Failed to list indices:', error);
      throw new Error(`List error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets cache statistics if caching is enabled.
   * @returns Cache statistics or null if caching is disabled
   */
  getCacheStats(): ReturnType<CacheManager['getStats']> | null {
    return this.cache ? this.cache.getStats() : null;
  }

  /**
   * Closes the persistence manager and releases resources.
   */
  async close(): Promise<void> {
    try {
      await this.adapter.close();
      
      if (this.fallbackAdapter) {
        await this.fallbackAdapter.close();
      }
      
      if (this.cache) {
        this.cache.clear();
      }
      
      this.initialized = false;
    } catch (error) {
      console.error('Failed to close persistence manager:', error);
      throw new Error(`Close error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}