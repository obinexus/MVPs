// src/types/storage.ts
import { IndexConfig } from './compactability';
import { SerializedState } from './state';
import { IndexedDocument } from './document';

/**
 * Storage method interfaces
 */
export interface StorageEntry<T> {
  id: string;
  data: T;
  timestamp: number;
}

/**
 * Storage options configuration
 */
export interface StorageOptions {
  type: 'memory' | 'indexeddb' | 'filesystem' | 'localstorage';
  options?: StorageOptionsConfig;
  maxSize?: number;
  ttl?: number;
}

/**
 * Advanced storage options for configuration
 */
export interface StorageOptionsConfig {
  prefix?: string;
  compression?: boolean;
  encryption?: boolean;
  backupEnabled?: boolean;
  dbName?: string;
  storeName?: string;
  basePath?: string;
  encoding?: string;
  createIfMissing?: boolean;
  throttleWrites?: boolean;
}

/**
 * File system specific options
 */
export interface FileSystemOptions {
  basePath?: string;
  encoding?: string;
  createIfMissing?: boolean;
  throttleWrites?: boolean;
  throttleDelay?: number;
}

/**
 * Handler for file operations
 */
export interface FileHandler {
  readFile(filePath: string, options?: { encoding?: string }): Promise<string | Uint8Array>;
  writeFile(filePath: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(dirPath: string): Promise<string[]>;
  unlink(filePath: string): Promise<void>;
  stat(filePath: string): Promise<{ size: number; lastModified: number }>;
}

/**
 * IndexedDB database schema for search
 */
export interface SearchDBSchema extends IDBDatabase {
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

/**
 * Metadata entry for search index
 */
export interface MetadataEntry {
  id: string;
  config: IndexConfig;
  lastUpdated: number;
}

/**
 * Database configuration
 */
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

/**
 * Serialized index for storage
 */
export interface SerializedIndex {
  documents: Array<{
    key: string;
    value: IndexedDocument;
  }>;
  indexState: SerializedState;
  config: IndexConfig;
}

/**
 * Blob processing result
 */
export interface BlobProcessingResult {
  content: string;
  metadata: {
    type: string;
    size: number;
    lastModified?: number;
    name?: string;
    encoding?: string;
    [key: string]: unknown;
  };
}

/**
 * Options for Blob handling
 */
export interface BlobHandlerOptions {
  chunkSize?: number;
  defaultEncoding?: string;
  detailedMetrics?: boolean;
}

/**
 * Cache storage options
 */
export interface CacheStorageOptions {
  maxSize?: number;
  ttlMinutes?: number;
  strategy?: 'LRU' | 'MRU';
  persist?: boolean;
  prefix?: string;
  type?: 'memory' | 'indexeddb' | 'localstorage';
  serializeFn?: <T>(data: T) => string;
  deserializeFn?: <T>(data: string) => T;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  expiresAt?: number;
  size?: number;
}

/**
 * Cache status information
 */
export interface CacheStatus {
  size: number;
  maxSize: number;
  strategy: 'LRU' | 'MRU';
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
 * Cache metrics
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  averageAccessCount: number;
  mostAccessedKeys: Array<{ key: string; count: number }>;
}

/**
 * Persistence options for index storage
 */
export interface PersistenceOptions {
  storage?: StorageOptions;
  cache?: {
    enabled: boolean;
    maxSize?: number;
    ttlMinutes?: number;
  };
  autoFallback?: boolean;
}

/**
 * Incremental index options
 */
export interface IncrementalIndexOptions {
  config: IndexConfig;
  persistence?: PersistenceOptions;
  autoSave?: {
    enabled: boolean;
    interval?: number;
    threshold?: number;
  };
  batch?: {
    enabled: boolean;
    size?: number;
    concurrency?: number;
  };
}

/**
 * File-related utility interfaces
 */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  path?: string;
  extension?: string;
}

/**
 * Upload configuration options
 */
export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  processImmediately?: boolean;
  generateThumbnails?: boolean;
  namingStrategy?: 'original' | 'timestamp' | 'uuid' | 'hash';
  path?: string;
}

/**
 * Extended for Node.js environments
 */
export interface NodeStorageOptions extends StorageOptions {
  fsSync?: boolean;
  tempDir?: string;
  logErrors?: boolean;
  watchForChanges?: boolean;
}