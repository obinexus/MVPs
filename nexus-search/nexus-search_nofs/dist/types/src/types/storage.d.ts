import { DBSchema } from 'idb';
import { IndexConfig } from './config';
export interface StorageEntry<T> {
    id: string;
    data: T;
    timestamp: number;
}
export interface StorageOptions {
    type: 'memory' | 'indexeddb';
    options?: StorageOptionsConfig;
    maxSize?: number;
    ttl?: number;
}
export interface StorageOptionsConfig {
    prefix?: string;
    compression?: boolean;
    encryption?: boolean;
    backupEnabled?: boolean;
}
export interface SearchDBSchema extends DBSchema {
    searchIndices: {
        key: string;
        value: {
            id: string;
            data: unknown;
            timestamp: number;
        };
        indexes: {
            'timestamp': number;
        };
    };
    metadata: {
        key: string;
        value: MetadataEntry;
        indexes: {
            'lastUpdated': number;
        };
    };
}
export interface MetadataEntry {
    id: string;
    config: IndexConfig;
    lastUpdated: number;
}
export interface DatabaseConfig {
    name: string;
    version: number;
    stores: Array<{
        name: string;
        keyPath: string;
        indexes: Array<{
            name: string;
            keyPath: string;
            options?: IDBIndexParameters;
        }>;
    }>;
}
