// src/core/storage/LocalStorageCacheAdapter.ts
import { KeyValueStorageAdapter } from './StorageAdapter';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { MetricsResult } from '@/types';

/**
 * LocalStorage implementation of the KeyValueStorageAdapter interface
 * Provides persistent cache storage in browser environments using localStorage
 */
export class LocalStorageCacheAdapter implements KeyValueStorageAdapter {
  private readonly prefix: string;
  private isAvailable: boolean;
  private performanceMonitor: PerformanceMonitor;

  /**
   * Create a new LocalStorageCacheAdapter
   * @param prefix - Prefix for all keys to avoid collisions
   */
  constructor(prefix: string = 'nexus-cache:') {
    this.prefix = prefix;
    this.isAvailable = this.checkAvailability();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Check if localStorage is available in this environment
   */
  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      // Test localStorage by setting and removing a value
      const testKey = '__nexus_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      return true;
    } catch (error) {
      console.warn('LocalStorage is not available:', error);
      return false;
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    // No specific initialization needed for localStorage
    return Promise.resolve();
  }

  /**
   * Get a value from localStorage
   * @param key - The key to look up
   * @returns The stored value or undefined if not found
   */
  async get(key: string): Promise<string | undefined> {
    return this.performanceMonitor.measure('get', async () => {
      if (!this.isAvailable) return undefined;

      try {
        const fullKey = this.prefix + key;
        const value = localStorage.getItem(fullKey);
        return value !== null ? value : undefined;
      } catch (error) {
        console.error('LocalStorage get error:', error);
        return undefined;
      }
    });
  }

  /**
   * Set a value in localStorage
   * @param key - The key to store under
   * @param value - The value to store
   */
  async set(key: string, value: string): Promise<void> {
    return this.performanceMonitor.measure('set', async () => {
      if (!this.isAvailable) return;

      try {
        const fullKey = this.prefix + key;
        localStorage.setItem(fullKey, value);
      } catch (error) {
        // Handle quota exceeded errors
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded. Attempting to clean up old entries...');
          this.pruneOldEntries();
          
          try {
            // Try again after pruning
            const fullKey = this.prefix + key;
            localStorage.setItem(fullKey, value);
          } catch (retryError) {
            console.error('Failed to store in localStorage even after pruning:', retryError);
          }
        } else {
          console.error('LocalStorage set error:', error);
        }
      }
    });
  }

  /**
   * Remove a value from localStorage
   * @param key - The key to remove
   */
  async remove(key: string): Promise<void> {
    return this.performanceMonitor.measure('remove', async () => {
      if (!this.isAvailable) return;

      try {
        const fullKey = this.prefix + key;
        localStorage.removeItem(fullKey);
      } catch (error) {
        console.error('LocalStorage remove error:', error);
      }
    });
  }

  /**
   * Get all keys in localStorage that match our prefix
   * @returns Array of keys with the prefix removed
   */
  async keys(): Promise<string[]> {
    return this.performanceMonitor.measure('keys', async () => {
      if (!this.isAvailable) return [];
      
      try {
        const result: string[] = [];
        const prefixLength = this.prefix.length;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            result.push(key.substring(prefixLength));
          }
        }
        
        return result;
      } catch (error) {
        console.error('LocalStorage keys error:', error);
        return [];
      }
    });
  }

  /**
   * Clear all values in localStorage that match our prefix
   */
  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      if (!this.isAvailable) return;
      
      try {
        const keysToDelete: string[] = [];
        
        // Identify keys with our prefix
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToDelete.push(key);
          }
        }
        
        // Delete identified keys
        for (const key of keysToDelete) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('LocalStorage clear error:', error);
      }
    });
  }

  /**
   * Close the adapter - no specific action needed for localStorage
   */
  async close(): Promise<void> {
    // No specific close operation for localStorage
    return Promise.resolve();
  }

  /**
   * Get the estimated total size of localStorage in bytes
   */
  getTotalSize(): number {
    if (!this.isAvailable) return 0;
    
    try {
      let totalSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
        }
      }
      
      // Account for string encoding (2 bytes per character in UTF-16)
      return totalSize * 2;
    } catch (error) {
      console.error('LocalStorage size calculation error:', error);
      return 0;
    }
  }

  /**
   * Get the current used size of our prefixed entries in bytes
   */
  getUsedSize(): number {
    if (!this.isAvailable) return 0;
    
    try {
      let usedSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key) || '';
          usedSize += key.length + value.length;
        }
      }
      
      // Account for string encoding (2 bytes per character in UTF-16)
      return usedSize * 2;
    } catch (error) {
      console.error('LocalStorage size calculation error:', error);
      return 0;
    }
  }

  /**
   * Prune old entries if storage is getting full
   */
  private pruneOldEntries(): void {
    if (!this.isAvailable) return;
    
    try {
      // Get all our keys and sort by trying to find embedded timestamps
      const ourKeys: { key: string; timestamp: number }[] = [];
      const timestampPattern = /(\d{13})/; // Look for 13-digit timestamps
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          // Try to extract timestamp from key or use index as fallback
          const match = key.match(timestampPattern);
          const timestamp = match ? parseInt(match[1], 10) : i;
          ourKeys.push({ key, timestamp });
        }
      }
      
      // Sort by timestamp (oldest first)
      ourKeys.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove 25% of the oldest entries
      const removeCount = Math.ceil(ourKeys.length * 0.25);
      
      for (let i = 0; i < removeCount && i < ourKeys.length; i++) {
        localStorage.removeItem(ourKeys[i].key);
      }
    } catch (error) {
      console.error('LocalStorage pruning error:', error);
    }
  }

  /**
   * Check if localStorage is getting full (over 80% capacity)
   */
  isStorageNearlyFull(): boolean {
    if (!this.isAvailable) return false;
    
    try {
      // Typical localStorage limit is 5-10MB
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const currentSize = this.getTotalSize();
      
      return (currentSize / estimatedLimit) > 0.8;
    } catch (error) {
      console.error('LocalStorage capacity check error:', error);
      return false;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}