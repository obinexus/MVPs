import { SerializedState, MetricsResult } from "@/types";
import { IndexedDocument } from "@/storage/IndexedDocument";
import { StorageAdapter } from "./StorageAdapter";
/**
 * Comprehensive storage manager that can use different adapters
 */
export declare class StorageManager {
    private adapter;
    private optimizationEnabled;
    private cache;
    private readonly performanceMonitor;
    constructor(adapter: StorageAdapter, optimizationEnabled?: boolean);
    initialize(): Promise<void>;
    storeDocument(document: IndexedDocument): Promise<void>;
    retrieveDocument(id: string): Promise<IndexedDocument | null>;
    storeIndex(indexName: string, data: SerializedState): Promise<void>;
    retrieveIndex(indexName: string): Promise<SerializedState | null>;
    clearAll(): Promise<void>;
    clearCache(): Promise<void>;
    close(): Promise<void>;
    getMetrics(): MetricsResult;
    setAdapter(adapter: StorageAdapter): void;
    setOptimizationEnabled(enabled: boolean): void;
}
