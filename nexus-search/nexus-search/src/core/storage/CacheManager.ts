// src/core/storage/CacheManager.ts
import { SearchResult } from "@/types";
import { StorageAdapter } from './StorageAdapter';

/**
 * Interface for cache entries
 */
export interface CacheEntry<T = SearchResult<unknown>[]> {
    /** The cached data */
    data: T;
    /** When the entry was created */
    timestamp: number;
    /** When entry was last accessed */
    lastAccessed: number;
    /** Number of times this entry was accessed */
    accessCount: number;
}

/**
 * Cache strategy types for eviction policies
 */
export enum CacheStrategyType {
    LRU = 'LRU',
    MRU = 'MRU'
}

export type CacheStrategy = keyof typeof CacheStrategyType;

/**
 * Cache status information
 */
export interface CacheStatus {
    size: number;
    maxSize: number;
    strategy: CacheStrategy;
    ttl: number;
    utilization: number;
    oldestEntryAge: number | null;
    newestEntryAge: number | null;
    memoryUsage: {
        bytes: number;
        formatted: string;
    };
}

/**
 * Options for the cache manager
 */
export interface CacheOptions {
    maxSize?: number;
    ttlMinutes?: number;
    strategy?: CacheStrategy;
    persist?: boolean;
}

/**
 * CacheManager provides caching capabilities for search results and other data
 * with configurable eviction strategies and persistence options.
 */
export class CacheManager {
    private cache: Map<string, CacheEntry>;
    private readonly maxSize: number;
    private readonly ttl: number;
    private strategy: CacheStrategy;
    private accessOrder: string[];
    private storage: StorageAdapter | null;
    private stats: {
        hits: number;
        misses: number;
        evictions: number;
    };

    /**
     * Create a new CacheManager
     */
    constructor(
        options: CacheOptions = {},
        storage?: StorageAdapter
    ) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.ttl = (options.ttlMinutes || 5) * 60 * 1000;
        this.strategy = options.strategy || 'LRU';
        this.accessOrder = [];
        this.storage = storage || null;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        
        // Load from persistent storage if enabled and available
        if (options.persist && this.storage) {
            this.loadFromStorage();
        }
    }

    /**
     * Set a value in the cache
     */
    set(key: string, data: SearchResult<unknown>[]): void {
        if (this.cache.size >= this.maxSize) {
            this.evict();
        }

        const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1
        };

        this.cache.set(key, entry);
        this.updateAccessOrder(key);
        
        // Persist to storage if available
        if (this.storage) {
            this.persistToStorage(key, entry).catch(console.error);
        }
    }

    /**
     * Get a value from the cache
     */
    get(key: string): SearchResult<unknown>[] | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (this.isExpired(entry.timestamp)) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.stats.misses++;
            return null;
        }

        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.updateAccessOrder(key);
        this.stats.hits++;

        return entry.data;
    }

    /**
     * Check if key exists in cache
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        
        if (this.isExpired(entry.timestamp)) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            return false;
        }
        
        return true;
    }

    /**
     * Remove an item from the cache
     */
    async remove(key: string): Promise<boolean> {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        
        if (this.storage) {
            await this.storage.remove(`cache:${key}`);
        }
        
        return true;
    }


    /**
     * Clear all items from the cache
     */
    async clear(): Promise<void> {
        this.cache.clear();
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        
        if (this.storage) {
            // Only clear cache-related items from storage
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(k => k.startsWith('cache:'));
            for (const key of cacheKeys) {
                await this.storage.remove(key);
            }
        }
    }

    /**
     * Get the current size of the cache
     */
    getSize(): number {
        return this.cache.size;
    }

    /**
     * Get statistics about the cache
     */
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            strategy: this.strategy
        };
    }

    /**
     * Get detailed status of the cache
     */
    getStatus(): CacheStatus {
        const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
        const now = Date.now();
        
        // Calculate memory usage estimation
        const memoryBytes = this.calculateMemoryUsage();
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            strategy: this.strategy,
            ttl: this.ttl,
            utilization: this.cache.size / this.maxSize,
            oldestEntryAge: timestamps.length ? now - Math.min(...timestamps) : null,
            newestEntryAge: timestamps.length ? now - Math.max(...timestamps) : null,
            memoryUsage: {
                bytes: memoryBytes,
                formatted: this.formatBytes(memoryBytes)
            }
        };
    }

    /**
     * Change the cache eviction strategy
     */
    setStrategy(newStrategy: CacheStrategy): void {
        if (newStrategy === this.strategy) return;
        
        this.strategy = newStrategy;
        const entries = [...this.accessOrder];
        this.accessOrder = [];
        entries.forEach(key => this.updateAccessOrder(key));
    }

    /**
     * Remove expired entries from the cache
     */
    prune(): number {
        let prunedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry.timestamp)) {
                this.cache.delete(key);
                this.removeFromAccessOrder(key);
                prunedCount++;
            }
        }
        return prunedCount;
    }

    /**
     * Analyze cache performance
     */
    analyze(): {
        hitRate: number;
        averageAccessCount: number;
        mostAccessedKeys: Array<{ key: string; count: number }>;
    } {
        const totalAccesses = this.stats.hits + this.stats.misses;
        const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;

        let totalAccessCount = 0;
        const accessCounts = new Map<string, number>();

        for (const [key, entry] of this.cache.entries()) {
            totalAccessCount += entry.accessCount;
            accessCounts.set(key, entry.accessCount);
        }

        const averageAccessCount = this.cache.size > 0 
            ? totalAccessCount / this.cache.size 
            : 0;

        const mostAccessedKeys = Array.from(accessCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, count]) => ({ key, count }));

        return {
            hitRate,
            averageAccessCount,
            mostAccessedKeys
        };
    }


    // Private helper methods

    /**
     * Check if an entry has expired
     */
    private isExpired(timestamp: number): boolean {
        return Date.now() - timestamp > this.ttl;
    }

    /**
     * Evict an entry based on the current strategy
     */
    private evict(): void {
        const keyToEvict = this.strategy === 'LRU' 
            ? this.findLRUKey()
            : this.findMRUKey();

        if (keyToEvict) {
            this.cache.delete(keyToEvict);
            this.removeFromAccessOrder(keyToEvict);
            this.stats.evictions++;
            
            // Remove from storage if available
            if (this.storage) {
                this.storage.remove(`cache:${keyToEvict}`).catch(console.error);
            }
        }
    }

    /**
     * Find the least recently used key
     */
    private findLRUKey(): string | null {
        return this.accessOrder[0] || null;
    }

    /**
     * Find the most recently used key
     */
    private findMRUKey(): string | null {
        return this.accessOrder[this.accessOrder.length - 1] || null;
    }

    /**
     * Update the access order for a key
     */
    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);

        if (this.strategy === 'LRU') {
            this.accessOrder.push(key); // Most recently used at end
        } else {
            this.accessOrder.unshift(key); // Most recently used at start
        }
    }

    /**
     * Remove a key from the access order
     */
    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    /**
     * Calculate memory usage of the cache
     */
    private calculateMemoryUsage(): number {
        let totalSize = 0;

        // Estimate size of cache entries
        for (const [key, entry] of this.cache.entries()) {
            // Key size (2 bytes per character in UTF-16)
            totalSize += key.length * 2;

            // Entry overhead (timestamp, lastAccessed, accessCount)
            totalSize += 8 * 3; // 8 bytes per number

            // Estimate size of cached data
            totalSize += this.estimateDataSize(entry.data);
        }

        // Add overhead for Map structure and class properties
        totalSize += 8 * (
            1 + // maxSize
            1 + // ttl
            1 + // strategy string reference
            this.accessOrder.length + // access order array
            3   // stats object numbers
        );

        return totalSize;
    }

    /**
     * Estimate the size of cached data
     */
    private estimateDataSize(data: SearchResult<unknown>[]): number {
        let size = 0;
        
        for (const result of data) {
            // Basic properties
            size += 8; // score (number)
            size += result.matches.join('').length * 2; // matches array strings
            
            // Estimate item size (conservative estimate)
            const itemStr = JSON.stringify(result.item);
            size += (itemStr ? itemStr.length : 0) * 2;
            
            // Metadata if present
            if (result.metadata) {
                const metaStr = JSON.stringify(result.metadata);
                size += (metaStr ? metaStr.length : 0) * 2;
            }
        }

        return size;
    }

    /**
     * Format bytes to human-readable format
     */
    private formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    
    /**
     * Load saved cache items from storage
     */
    private async loadFromStorage(): Promise<void> {
        if (!this.storage) return;
        
        try {
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(k => k.startsWith('cache:'));
            
            for (const storageKey of cacheKeys) {
                const serializedEntry = await this.storage.get(storageKey);
                if (serializedEntry) {
                    try {
                        const entry = JSON.parse(serializedEntry) as CacheEntry;
                        const key = storageKey.replace(/^cache:/, '');
                        
                        // Skip expired entries
                        if (this.isExpired(entry.timestamp)) {
                            await this.storage.remove(storageKey);
                            continue;
                        }
                        
                        this.cache.set(key, entry);
                        this.updateAccessOrder(key);
                    } catch (err) {
                        console.error('Failed to parse cached entry:', err);
                        await this.storage.remove(storageKey);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load cache from storage:', err);
        }
    }

    /**
     * Persist a cache entry to storage
     */
    private async persistToStorage(key: string, entry: CacheEntry): Promise<void> {
        if (!this.storage) return;
        
        try {
            const serialized = JSON.stringify(entry);
            await this.storage.set(`cache:${key}`, serialized);
        } catch (err) {
            console.error('Failed to persist cache entry:', err);
        }
    }
}

