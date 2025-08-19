import { MetricsResult } from '@/types';
import { StorageAdapter } from './StorageAdapter';
/**
 * File system storage adapter implementation for Node.js environments
 */
export declare class FileSystemAdapter implements StorageAdapter {
    private basePath;
    private fs;
    private performanceMonitor;
    private initialized;
    constructor(basePath: string);
    private loadFsModule;
    initialize(): Promise<void>;
    store(key: string, data: unknown): Promise<void>;
    retrieve(key: string): Promise<unknown>;
    clear(): Promise<void>;
    close(): Promise<void>;
    private getFilePath;
    private fileExists;
    getMetrics(): MetricsResult;
}
