// src/core/storage/index.ts

// Core interfaces and factories
export * from './StorageAdapter';

// Adapters
export * from './InMemoryAdapter';
export * from './IndexedDBAdapter';
export * from './LocalStorageCacheAdapter';
export * from './IndexedDBCacheAdapter';

// Document storage
export * from './IndexedDocument';
export * from './IndexManager';
export * from './IncrementalIndexManager';

// Cache management
export * from './CacheManager';

// Persistence
export * from './PersistenceManager';

// Re-export from adapter modules
export { 
  BrowserFileSystemAdapter 
} from '../adapters/browser/BrowserFileSystemAdapter';

export { 
  NodeFileSystemAdapter 
} from '../adapters/node/NodeFileSystemAdapter';

export {
  BaseFileSystemAdapter,
  FileHandler,
  FileSystemOptions
} from '../adapters/common/FileSystemAdapter';

export {
  BlobHandler,
  BlobHandlerOptions,
  BlobProcessingResult
} from '../adapters/browser/BlobHandler';

/**
 * Create and return the appropriate storage adapter based on the environment
 * This is a convenience function to simplify the creation of storage adapters
 * 
 * @param type - The type of storage adapter to create
 * @param options - Options for configuring the storage adapter
 * @returns A StorageAdapter instance
 */
export function createStorage(
  type: 'memory' | 'indexeddb' | 'filesystem' | 'localstorage' = 'memory',
  options: Record<string, unknown> = {}
) {
  const { createStorageAdapter } = require('./StorageAdapter');
  return createStorageAdapter(type, options);
}

/**
 * Create and return a cache storage adapter
 * This is a convenience function to simplify the creation of cache storage adapters
 * 
 * @param type - The type of cache storage adapter to create
 * @param options - Options for configuring the cache storage adapter
 * @returns A KeyValueStorageAdapter instance
 */
export function createCacheStorage(
  type: 'memory' | 'indexeddb' | 'localstorage' = 'memory',
  options: Record<string, unknown> = {}
) {
  const { createKeyValueStorageAdapter } = require('./StorageAdapter');
  return createKeyValueStorageAdapter({ type, ...options });
}