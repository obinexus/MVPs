import { MetricsResult } from "@/types";
/**
 * Storage method interfaces
 */
export interface StorageAdapter {
    initialize(): Promise<void>;
    store(key: string, data: unknown): Promise<void>;
    retrieve(key: string): Promise<unknown>;
    clear(): Promise<void>;
    close(): Promise<void>;
}
/**
 * Memory-based storage adapter implementation
 */
export declare class MemoryStorageAdapter implements StorageAdapter {
    private storage;
    private performanceMonitor;
    private initialized;
    constructor();
    initialize(): Promise<void>;
    store(key: string, data: unknown): Promise<void>;
    retrieve(key: string): Promise<unknown>;
    clear(): Promise<void>;
    close(): Promise<void>;
    getMetrics(): MetricsResult;
}
/**
 * IndexedDB storage adapter implementation
 */
export declare class IndexedDBAdapter implements StorageAdapter {
    private db;
    private readonly dbName;
    private readonly storeName;
    private readonly version;
    private performanceMonitor;
    private initialized;
    constructor(dbName: string, storeName?: string, version?: number);
    initialize(): Promise<void>;
    store(key: string, data: unknown): Promise<void>;
    retrieve(key: string): Promise<unknown>;
    clear(): Promise<void>;
    close(): Promise<void>;
    getMetrics(): MetricsResult;
}
/**
 * Factory to create the appropriate storage adapter based on environment
 */
export declare class StorageAdapterFactory {
    static createAdapter(type: 'memory' | 'indexeddb' | 'filesystem', options?: Record<string, unknown>): StorageAdapter;
    static createManager(_type: 'memory' | 'indexeddb' | 'filesystem', _options?: Record<string, unknown>): StorageManager;
}
