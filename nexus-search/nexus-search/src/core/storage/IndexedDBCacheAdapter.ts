// src/core/storage/IndexedDBCacheAdapter.ts
import { KeyValueStorageAdapter } from './StorageAdapter';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { MetricsResult } from '@/types';

/**
 * IndexedDB implementation of the KeyValueStorageAdapter interface
 * Provides persistent cache storage in browser environments using IndexedDB
 * This offers greater storage capacity than localStorage and better performance for larger datasets
 */
export class IndexedDBCacheAdapter implements KeyValueStorageAdapter {
  private readonly prefix: string;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;
  private db: IDBDatabase | null = null;
  private isAvailable: boolean;
  private initPromise: Promise<void> | null = null;
  private performanceMonitor: PerformanceMonitor;

  /**
   * Create a new IndexedDBCacheAdapter
   * @param prefix - Prefix for all keys to avoid collisions
   * @param dbName - Name of the IndexedDB database
   * @param storeName - Name of the object store
   * @param version - Database version
   */
  constructor(
    prefix: string = 'nexus-cache:',
    dbName: string = 'nexus-cache-db',
    storeName: string = 'cache',
    version: number = 1
  ) {
    this.prefix = prefix;
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.isAvailable = this.checkAvailability();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Check if IndexedDB is available in this environment
   */
  private checkAvailability(): boolean {
    try {
      return typeof window !== 'undefined' && 
             typeof indexedDB !== 'undefined' && 
             indexedDB !== null;
    } catch (error) {
      console.warn('IndexedDB is not available:', error);
      return false;
    }
  }

  /**
   * Initialize the adapter by opening the IndexedDB connection
   */
  async initialize(): Promise<void> {
    if (!this.isAvailable) {
      return Promise.resolve();
    }

    if (this.db) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            // Create store with a composite key of prefix + key
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };
        
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
          reject(new Error(`Failed to open IndexedDB: ${(event.target as IDBOpenDBRequest).error}`));
        };
      } catch (error) {
        console.error('IndexedDB initialization error:', error);
        reject(new Error(`IndexedDB initialization error: ${error}`));
      }
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('IndexedDB is not available in this environment');
    }
    
    if (!this.db) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
  }

  /**
   * Get a value from IndexedDB
   * @param key - The key to look up
   * @returns The stored value or undefined if not found
   */
  async get(key: string): Promise<string | undefined> {
    return this.performanceMonitor.measure('get', async () => {
      try {
        await this.ensureInitialized();
        
        return new Promise<string | undefined>((resolve, reject) => {
          try {
            const transaction = this.db!.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const fullKey = this.prefix + key;
            
            const request = objectStore.get(fullKey);
            
            request.onsuccess = (event) => {
              const result = (event.target as IDBRequest).result;
              if (result) {
                resolve(result.value);
              } else {
                resolve(undefined);
              }
            };
            
            request.onerror = (event) => {
              console.error('IndexedDB get error:', (event.target as IDBRequest).error);
              reject(new Error(`Failed to get value: ${(event.target as IDBRequest).error}`));
            };
          } catch (error) {
            console.error('IndexedDB get operation error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.warn('IndexedDB get failed:', error);
        return undefined;
      }
    });
  }

  /**
   * Set a value in IndexedDB
   * @param key - The key to store under
   * @param value - The value to store
   */
  async set(key: string, value: string): Promise<void> {
    return this.performanceMonitor.measure('set', async () => {
      try {
        await this.ensureInitialized();
        
        return new Promise<void>((resolve, reject) => {
          try {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const fullKey = this.prefix + key;
            
            const request = objectStore.put({
              key: fullKey,
              value,
              timestamp: Date.now()
            });
            
            request.onsuccess = () => {
              resolve();
            };
            
            request.onerror = (event) => {
              console.error('IndexedDB set error:', (event.target as IDBRequest).error);
              reject(new Error(`Failed to set value: ${(event.target as IDBRequest).error}`));
            };
          } catch (error) {
            console.error('IndexedDB set operation error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.warn('IndexedDB set failed:', error);
      }
    });
  }

  /**
   * Remove a value from IndexedDB
   * @param key - The key to remove
   */
  async remove(key: string): Promise<void> {
    return this.performanceMonitor.measure('remove', async () => {
      try {
        await this.ensureInitialized();
        
        return new Promise<void>((resolve, reject) => {
          try {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const fullKey = this.prefix + key;
            
            const request = objectStore.delete(fullKey);
            
            request.onsuccess = () => {
              resolve();
            };
            
            request.onerror = (event) => {
              console.error('IndexedDB remove error:', (event.target as IDBRequest).error);
              reject(new Error(`Failed to remove value: ${(event.target as IDBRequest).error}`));
            };
          } catch (error) {
            console.error('IndexedDB remove operation error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.warn('IndexedDB remove failed:', error);
      }
    });
  }

  /**
   * Get all keys in IndexedDB that match our prefix
   * @returns Array of keys with the prefix removed
   */
  async keys(): Promise<string[]> {
    return this.performanceMonitor.measure('keys', async () => {
      try {
        await this.ensureInitialized();
        
        return new Promise<string[]>((resolve, reject) => {
          try {
            const transaction = this.db!.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAllKeys();
            
            request.onsuccess = (event) => {
              const allKeys = (event.target as IDBRequest).result as string[];
              const prefixLength = this.prefix.length;
              const matchingKeys = allKeys
                .filter(key => typeof key === 'string' && key.startsWith(this.prefix))
                .map(key => (key as string).substring(prefixLength));
              
              resolve(matchingKeys);
            };
            
            request.onerror = (event) => {
              console.error('IndexedDB keys error:', (event.target as IDBRequest).error);
              reject(new Error(`Failed to get keys: ${(event.target as IDBRequest).error}`));
            };
          } catch (error) {
            console.error('IndexedDB keys operation error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.warn('IndexedDB keys failed:', error);
        return [];
      }
    });
  }

  /**
   * Clear all values in IndexedDB that match our prefix
   */
  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      try {
        await this.ensureInitialized();
        
        const keys = await this.keys();
        
        // Delete each key individually
        const promises = keys.map(key => this.remove(key));
        await Promise.allSettled(promises);
      } catch (error) {
        console.warn('IndexedDB clear failed:', error);
      }
    });
  }

  /**
   * Close the IndexedDB connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Prune old entries from the cache based on timestamp
   * @param maxAge - Maximum age in milliseconds
   */
  async pruneOldEntries(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    return this.performanceMonitor.measure('pruneOldEntries', async () => {
      try {
        await this.ensureInitialized();
        
        return new Promise<number>((resolve, reject) => {
          try {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            
            const cutoffTime = Date.now() - maxAge;
            let deletedCount = 0;
            
            // We need to get all entries and filter them
            const request = objectStore.openCursor();
            
            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
              
              if (cursor) {
                const entry = cursor.value;
                
                // Check if this is our prefixed entry and if it's old enough to delete
                if (typeof entry.key === 'string' && 
                    entry.key.startsWith(this.prefix) && 
                    entry.timestamp < cutoffTime) {
                  
                  // Delete the entry
                  const deleteRequest = cursor.delete();
                  deleteRequest.onsuccess = () => {
                    deletedCount++;
                  };
                }
                
                // Move to next entry
                cursor.continue();
              } else {
                // No more entries, we're done
                resolve(deletedCount);
              }
            };
            
            request.onerror = (event) => {
              console.error('IndexedDB pruning error:', (event.target as IDBRequest).error);
              reject(new Error(`Failed to prune old entries: ${(event.target as IDBRequest).error}`));
            };
          } catch (error) {
            console.error('IndexedDB pruning operation error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.warn('IndexedDB pruning failed:', error);
        return 0;
      }
    });
  }

  /**
   * Get database statistics
   * @returns Statistics about the cache database
   */
  async getStats(): Promise<{ 
    entryCount: number; 
    totalSize: number; 
    oldestEntryAge: number | null;
    newestEntryAge: number | null;
  }> {
    try {
      await this.ensureInitialized();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const objectStore = transaction.objectStore(this.storeName);
          const request = objectStore.getAll();
          
          request.onsuccess = (event) => {
            const entries = (event.target as IDBRequest).result;
            
            // Filter entries that match our prefix
            const ourEntries = entries.filter(
              entry => typeof entry.key === 'string' && entry.key.startsWith(this.prefix)
            );
            
            if (ourEntries.length === 0) {
              resolve({
                entryCount: 0,
                totalSize: 0,
                oldestEntryAge: null,
                newestEntryAge: null
              });
              return;
            }
            
            // Calculate size (approximate)
            let totalSize = 0;
            const now = Date.now();
            let oldestTimestamp = now;
            let newestTimestamp = 0;
            
            for (const entry of ourEntries) {
              // Estimate size: key + value + timestamp (8 bytes)
              const valueSize = typeof entry.value === 'string' ? entry.value.length * 2 : 0;
              const keySize = typeof entry.key === 'string' ? entry.key.length * 2 : 0;
              totalSize += keySize + valueSize + 8;
              
              // Track oldest and newest timestamps
              if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
              }
              if (entry.timestamp > newestTimestamp) {
                newestTimestamp = entry.timestamp;
              }
            }
            
            resolve({
              entryCount: ourEntries.length,
              totalSize: totalSize,
              oldestEntryAge: now - oldestTimestamp,
              newestEntryAge: now - newestTimestamp
            });
          };
          
          request.onerror = (event) => {
            console.error('IndexedDB stats error:', (event.target as IDBRequest).error);
            reject(new Error(`Failed to get stats: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          console.error('IndexedDB stats operation error:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.warn('IndexedDB stats failed:', error);
      return {
        entryCount: 0,
        totalSize: 0,
        oldestEntryAge: null,
        newestEntryAge: null
      };
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}