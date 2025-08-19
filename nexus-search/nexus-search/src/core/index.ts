// Main package entry point

// Export core components
export * from './search/SearchEngine';
export * from './search/SearchOptions';
export * from './search/SearchResult';

// Export document processors
export * from './documents/DocumentProcessor';

// Export storage adapters
export * from './storage/StorageAdapter';

// Export file system adapters
export * from './adapters/common/FileSystemAdapter';

// Export type definitions
export * from './types';
// Core module exports
export * from './algorithms/TrieSearch';
export * from './search/SearchEngine';
export * from './storage/IndexedDBAdapter';
export * from './storage/InMemoryAdapter';

// Type exports
export * from './types';