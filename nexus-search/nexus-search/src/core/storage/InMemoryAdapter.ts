// src/core/storage/InMemoryAdapter.ts
import { BaseStorageAdapter } from './StorageAdapter';
import { IndexConfig, SerializedIndex, MetricsResult } from '@/types';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';

/**
 * In-memory implementation of the StorageAdapter interface
 * This provides a fast, volatile storage solution suitable for
 * testing, development, and non-persistent use cases.
 */
export class InMemoryAdapter extends BaseStorageAdapter {
  private storage: Map<string, unknown>;
  private metadataStorage: Map<string, IndexConfig>;
  protected performanceMonitor: PerformanceMonitor;

  constructor() {
    super();
    this.storage = new Map<string, unknown>();
    this.metadataStorage = new Map<string, IndexConfig>();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize the storage adapter
   */
  async initialize(): Promise<void> {
    return this.performanceMonitor.measure('initialize', async () => {
      this.initialized = true;
    });
  }

  /**
   * Store an index with the given name
   * @param name - Unique identifier for the index
   * @param data - The serialized index data to store
   */
  async storeIndex(name: string, data: SerializedIndex): Promise<void> {
    return this.performanceMonitor.measure('storeIndex', async () => {
      this.storage.set(`index:${name}`, data);
    });
  }

  /**
   * Retrieve an index by its name
   * @param name - Unique identifier for the index
   * @returns The serialized index or null if not found
   */
  async getIndex(name: string): Promise<SerializedIndex | null> {
    return this.performanceMonitor.measure('getIndex', async () => {
      const data = this.storage.get(`index:${name}`);
      return data as SerializedIndex || null;
    });
  }

  /**
   * Update metadata for a specific index
   * @param name - Unique identifier for the index
   * @param config - The configuration to update
   */
  async updateMetadata(name: string, config: IndexConfig): Promise<void> {
    return this.performanceMonitor.measure('updateMetadata', async () => {
      this.metadataStorage.set(name, config);
    });
  }

  /**
   * Retrieve metadata for a specific index
   * @param name - Unique identifier for the index
   * @returns The index configuration or null if not found
   */
  async getMetadata(name: string): Promise<IndexConfig | null> {
    return this.performanceMonitor.measure('getMetadata', async () => {
      return this.metadataStorage.get(name) || null;
    });
  }

  /**
   * Remove an index from storage
   * @param name - Unique identifier for the index to remove
   */
  async removeIndex(name: string): Promise<void> {
    return this.performanceMonitor.measure('removeIndex', async () => {
      this.storage.delete(`index:${name}`);
      this.metadataStorage.delete(name);
    });
  }

  /**
   * Clear all indices from storage
   */
  async clearIndices(): Promise<void> {
    return this.performanceMonitor.measure('clearIndices', async () => {
      // Filter and remove only index-related entries
      for (const key of this.storage.keys()) {
        if (key.startsWith('index:')) {
          this.storage.delete(key);
        }
      }
      this.metadataStorage.clear();
    });
  }

  /**
   * Check if an index exists in storage
   * @param name - Unique identifier for the index
   * @returns Boolean indicating existence
   */
  async hasIndex(name: string): Promise<boolean> {
    return this.performanceMonitor.measure('hasIndex', async () => {
      return this.storage.has(`index:${name}`);
    });
  }

  /**
   * List all available indices in storage
   * @returns Array of index names
   */
  async listIndices(): Promise<string[]> {
    return this.performanceMonitor.measure('listIndices', async () => {
      const indices: string[] = [];
      
      for (const key of this.storage.keys()) {
        if (key.startsWith('index:')) {
          indices.push(key.replace('index:', ''));
        }
      }
      
      return indices;
    });
  }

  /**
   * Generic key-value storage get method
   * @param key - The key to look up
   * @returns The stored string value or undefined
   */
  async get(key: string): Promise<string | undefined> {
    return this.performanceMonitor.measure('get', async () => {
      const value = this.storage.get(`kv:${key}`);
      return value as string | undefined;
    });
  }

  /**
   * Generic key-value storage set method
   * @param key - The key to store under
   * @param value - The string value to store
   */
  async set(key: string, value: string): Promise<void> {
    return this.performanceMonitor.measure('set', async () => {
      this.storage.set(`kv:${key}`, value);
    });
  }

  /**
   * Generic key-value storage remove method
   * @param key - The key to remove
   */
  async remove(key: string): Promise<void> {
    return this.performanceMonitor.measure('remove', async () => {
      this.storage.delete(`kv:${key}`);
    });
  }

  /**
   * Generic key-value storage keys method
   * @returns Array of all keys in the key-value store
   */
  async keys(): Promise<string[]> {
    return this.performanceMonitor.measure('keys', async () => {
      const kvKeys: string[] = [];
      
      for (const key of this.storage.keys()) {
        if (key.startsWith('kv:')) {
          kvKeys.push(key.replace('kv:', ''));
        }
      }
      
      return kvKeys;
    });
  }

  /**
   * Clear all data in storage
   */
  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      this.storage.clear();
      this.metadataStorage.clear();
    });
  }

  /**
   * Close the storage adapter
   */
  async close(): Promise<void> {
    return this.performanceMonitor.measure('close', async () => {
      // No need to close in-memory storage, but we can clear it
      this.storage.clear();
      this.metadataStorage.clear();
      this.initialized = false;
    });
  }

  /**
   * Get metrics for the adapter
   */
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}

/**
 * Memory-based implementation of the KeyValueStorageAdapter interface
 * Specifically designed for caching use cases
 */
export class MemoryCacheAdapter {
  private storage: Map<string, string>;
  private readonly prefix: string;
  private performanceMonitor: PerformanceMonitor;

  constructor(prefix: string = 'nexus-cache:') {
    this.storage = new Map<string, string>();
    this.prefix = prefix;
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize the adapter - no-op for memory implementation
   */
  async initialize(): Promise<void> {
    // No initialization needed for in-memory cache
    return Promise.resolve();
  }

  /**
   * Get a value from the cache
   * @param key - The key to look up
   * @returns The stored value or undefined
   */
  async get(key: string): Promise<string | undefined> {
    return this.performanceMonitor.measure('get', async () => {
      return this.storage.get(this.prefix + key);
    });
  }

  /**
   * Set a value in the cache
   * @param key - The key to store under
   * @param value - The value to store
   */
  async set(key: string, value: string): Promise<void> {
    return this.performanceMonitor.measure('set', async () => {
      this.storage.set(this.prefix + key, value);
    });
  }

  /**
   * Remove a value from the cache
   * @param key - The key to remove
   */
  async remove(key: string): Promise<void> {
    return this.performanceMonitor.measure('remove', async () => {
      this.storage.delete(this.prefix + key);
    });
  }

  /**
   * Get all keys in the cache
   * @returns Array of keys (with prefix removed)
   */
  async keys(): Promise<string[]> {
    return this.performanceMonitor.measure('keys', async () => {
      const result: string[] = [];
      const prefixLength = this.prefix.length;
      
      for (const key of this.storage.keys()) {
        if (key.startsWith(this.prefix)) {
          result.push(key.substring(prefixLength));
        }
      }
      
      return result;
    });
  }

  /**
   * Close the adapter - no-op for memory implementation
   */
  async close(): Promise<void> {
    this.storage.clear();
    return Promise.resolve();
  }

  /**
   * Clear all values in the cache
   */
  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      const keysToDelete: string[] = [];
      
      // Identify keys with our prefix
      for (const key of this.storage.keys()) {
        if (key.startsWith(this.prefix)) {
          keysToDelete.push(key);
        }
      }
      
      // Delete identified keys
      for (const key of keysToDelete) {
        this.storage.delete(key);
      }
    });
  }
}