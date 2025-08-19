// src/core/ioc/providers.ts
import { IndexManager } from '../storage/IndexManager';
import { CacheManager } from '../storage/CacheManager';
import { SearchEngine } from '../search/SearchEngine';
import { QueryProcessor } from '../../mappers/QueryProcessor';
import { IndexMapper } from '../../mappers/IndexMapper';
import { InMemoryAdapter } from '../storage/InMemoryAdapter';
import { IndexedDBAdapter } from '../storage/IndexedDBAdapter';
import { PersistenceManager } from '../storage/PersistenceManager';
import { Container } from './container';

/**
 * Service identifiers for dependency injection
 */
export const ServiceIdentifiers = {
  CACHE_MANAGER: 'cache-manager',
  INDEX_MANAGER: 'index-manager',
  SEARCH_ENGINE: 'search-engine',
  QUERY_PROCESSOR: 'query-processor',
  INDEX_MAPPER: 'index-mapper',
  STORAGE_ADAPTER: 'storage-adapter',
  PERSISTENCE_MANAGER: 'persistence-manager'
};

/**
 * Register core services with the IoC container
 * @param container IoC container
 * @param config Configuration object for services
 */
export function registerCoreServices(
  container: Container,
  config: {
    storage?: 'memory' | 'indexeddb';
    indexConfig?: any;
    cacheOptions?: any;
  } = {}
): void {
  // Register storage adapter based on config
  if (config.storage === 'indexeddb') {
    container.register(
      ServiceIdentifiers.STORAGE_ADAPTER,
      IndexedDBAdapter,
      true
    );
  } else {
    container.register(
      ServiceIdentifiers.STORAGE_ADAPTER,
      InMemoryAdapter,
      true
    );
  }

  // Register persistence manager
  container.register(
    ServiceIdentifiers.PERSISTENCE_MANAGER,
    () => {
      const storageAdapter = container.get(ServiceIdentifiers.STORAGE_ADAPTER);
      return new PersistenceManager({
        storage: { type: config.storage || 'memory' },
        autoFallback: true
      });
    },
    true
  );

  // Register cache manager
  container.register(
    ServiceIdentifiers.CACHE_MANAGER,
    () => new CacheManager(config.cacheOptions || {}),
    true
  );

  // Register query processor
  container.register(
    ServiceIdentifiers.QUERY_PROCESSOR,
    QueryProcessor,
    true
  );

  // Register index mapper
  container.register(
    ServiceIdentifiers.INDEX_MAPPER,
    IndexMapper,
    true
  );

  // Register index manager
  container.register(
    ServiceIdentifiers.INDEX_MANAGER,
    () => new IndexManager(config.indexConfig || {
      name: 'default',
      version: 1,
      fields: ['title', 'content', 'tags']
    }),
    true
  );

  // Register search engine
  container.register(
    ServiceIdentifiers.SEARCH_ENGINE,
    () => {
      const indexManager = container.get<IndexManager>(ServiceIdentifiers.INDEX_MANAGER);
      const cacheManager = container.get<CacheManager>(ServiceIdentifiers.CACHE_MANAGER);
      const queryProcessor = container.get<QueryProcessor>(ServiceIdentifiers.QUERY_PROCESSOR);
      
      return new SearchEngine({
        indexManager,
        cacheManager,
        queryProcessor
      });
    },
    true
  );
}
