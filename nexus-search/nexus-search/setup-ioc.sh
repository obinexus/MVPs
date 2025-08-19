#!/bin/bash

# Script to set up IoC directory structure and files for NexusSearch

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up IoC structure for NexusSearch...${NC}"

# Create directories
mkdir -p src/core/ioc

# Create Registry file
echo -e "${YELLOW}Creating Registry...${NC}"
cat > src/core/ioc/registry.ts << 'EOL'
// src/core/ioc/registry.ts

/**
 * Registry for IoC container
 * Stores provider definitions
 */
export class Registry {
  private providers: Map<string, any>;

  constructor() {
    this.providers = new Map();
  }

  /**
   * Set a provider in the registry
   * @param token Identifier for the provider
   * @param provider Constructor or factory function for the provider
   */
  set<T>(token: string, provider: any): void {
    this.providers.set(token, provider);
  }

  /**
   * Get a provider from the registry
   * @param token Identifier for the provider
   */
  get<T>(token: string): any {
    return this.providers.get(token);
  }

  /**
   * Check if a provider exists in the registry
   * @param token Identifier for the provider
   */
  has(token: string): boolean {
    return this.providers.has(token);
  }

  /**
   * Remove a provider from the registry
   * @param token Identifier for the provider
   */
  delete(token: string): boolean {
    return this.providers.delete(token);
  }

  /**
   * Get all provider tokens
   */
  keys(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }
}
EOL

# Create Container file
echo -e "${YELLOW}Creating Container...${NC}"
cat > src/core/ioc/container.ts << 'EOL'
// src/core/ioc/container.ts
import { Registry } from './registry';

type ProviderFactory<T> = () => T;
type ProviderType<T> = { new(...args: any[]): T } | ProviderFactory<T>;

/**
 * Container for dependency injection
 * Manages the instantiation and retrieval of services
 */
export class Container {
  private registry: Registry;
  private instances: Map<string, any>;
  private singletons: Set<string>;

  constructor(registry?: Registry) {
    this.registry = registry || new Registry();
    this.instances = new Map();
    this.singletons = new Set();
  }

  /**
   * Register a provider with the container
   * @param token Identifier for the provider
   * @param provider Constructor or factory function for the provider
   * @param singleton Whether the provider should be a singleton
   */
  register<T>(
    token: string,
    provider: ProviderType<T>,
    singleton: boolean = true
  ): void {
    this.registry.set(token, provider);
    if (singleton) {
      this.singletons.add(token);
    }
  }

  /**
   * Get an instance of a registered provider
   * @param token Identifier for the provider
   * @param args Optional arguments to pass to the constructor or factory
   */
  get<T>(token: string, ...args: any[]): T {
    // Check if it's a singleton and already instantiated
    if (this.singletons.has(token) && this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    // Get the provider from the registry
    const provider = this.registry.get<T>(token);
    if (!provider) {
      throw new Error(`Provider not registered for token: ${token}`);
    }

    // Instantiate the provider
    let instance: T;
    if (typeof provider === 'function' && !this.isConstructor(provider)) {
      // It's a factory function
      instance = (provider as ProviderFactory<T>)();
    } else {
      // It's a constructor
      const Constructor = provider as { new(...args: any[]): T };
      instance = new Constructor(...args);
    }

    // Store the instance if it's a singleton
    if (this.singletons.has(token)) {
      this.instances.set(token, instance);
    }

    return instance;
  }

  /**
   * Remove a provider from the container
   * @param token Identifier for the provider
   */
  unregister(token: string): boolean {
    this.instances.delete(token);
    this.singletons.delete(token);
    return this.registry.delete(token);
  }

  /**
   * Check if a provider is registered
   * @param token Identifier for the provider
   */
  has(token: string): boolean {
    return this.registry.has(token);
  }

  /**
   * Clear all providers and instances
   */
  clear(): void {
    this.registry.clear();
    this.instances.clear();
    this.singletons.clear();
  }

  /**
   * Check if a function is a constructor
   * @param fn Function to check
   */
  private isConstructor(fn: Function): boolean {
    return !!fn.prototype && !!fn.prototype.constructor.name;
  }
}
EOL

# Create Providers file
echo -e "${YELLOW}Creating Providers...${NC}"
cat > src/core/ioc/providers.ts << 'EOL'
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
EOL

# Create main index file
echo -e "${YELLOW}Creating main index file...${NC}"
cat > src/core/ioc/index.ts << 'EOL'
// src/core/ioc/index.ts
export * from './container';
export * from './registry';
export * from './providers';

// Create and export a default container instance
import { Container } from './container';
import { registerCoreServices } from './providers';

// Create a default container with core services
const defaultContainer = new Container();
registerCoreServices(defaultContainer);

export { defaultContainer };
EOL

# Update storage index file
echo -e "${YELLOW}Updating storage/index.ts...${NC}"
mkdir -p src/core/storage
cat > src/core/storage/index.ts << 'EOL'
// src/core/storage/index.ts
export * from './CacheManager';
export * from './StorageAdapter';
export * from './IndexManager';
export * from './IndexedDBAdapter';
export * from './PersistenceManager';
export * from './InMemoryAdapter';
export * from './IncrementalIndexManager';

// Export the correct IndexedDocument implementation
export * from './IndexedDocument'; // Make sure this file exists
EOL

# Create a CLI example using IoC
echo -e "${YELLOW}Creating CLI example with IoC...${NC}"
mkdir -p src/cli
cat > src/cli/search-cli.ts << 'EOL'
// src/cli/search-cli.ts
import { ServiceIdentifiers } from '../core/ioc/providers';
import { defaultContainer } from '../core/ioc';
import { SearchEngine } from '../core/search/SearchEngine';

/**
 * CLI interface for NexusSearch
 */
export class SearchCLI {
  private searchEngine: SearchEngine;

  constructor() {
    // Get the search engine from the IoC container
    this.searchEngine = defaultContainer.get<SearchEngine>(ServiceIdentifiers.SEARCH_ENGINE);
  }

  /**
   * Initialize the CLI
   */
  async initialize(): Promise<void> {
    try {
      await this.searchEngine.initialize();
      console.log('Search engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize search engine:', error);
      process.exit(1);
    }
  }

  /**
   * Perform a search
   * @param query Search query
   * @param options Search options
   */
  async search(query: string, options: any = {}): Promise<any> {
    try {
      const results = await this.searchEngine.search(query, options);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Add a document to the index
   * @param document Document to add
   */
  async addDocument(document: any): Promise<void> {
    try {
      await this.searchEngine.addDocument(document);
      console.log(`Document ${document.id || 'unknown'} added successfully`);
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  }

  /**
   * Close the CLI and release resources
   */
  async close(): Promise<void> {
    try {
      await this.searchEngine.close();
      console.log('Search engine closed successfully');
    } catch (error) {
      console.error('Failed to close search engine:', error);
    }
  }
}

// Example usage as a CLI command
if (require.main === module) {
  // This code runs when the file is executed directly
  (async () => {
    const cli = new SearchCLI();
    await cli.initialize();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const params = args.slice(1);

    switch (command) {
      case 'search':
        if (params.length === 0) {
          console.log('Usage: search <query>');
          process.exit(1);
        }
        const query = params[0];
        const options = {
          fuzzy: params.includes('--fuzzy'),
          maxResults: params.includes('--max') ? parseInt(params[params.indexOf('--max') + 1], 10) : 10
        };
        const results = await cli.search(query, options);
        console.log(JSON.stringify(results, null, 2));
        break;

      case 'add':
        if (params.length === 0) {
          console.log('Usage: add <document_json>');
          process.exit(1);
        }
        try {
          const document = JSON.parse(params[0]);
          await cli.addDocument(document);
        } catch (error) {
          console.error('Invalid document JSON:', error);
        }
        break;

      default:
        console.log('Available commands: search, add');
        break;
    }

    await cli.close();
  })().catch(console.error);
}

export default SearchCLI;
EOL

# Create test script for checking the IoC implementation
echo -e "${YELLOW}Creating IoC test script...${NC}"
mkdir -p tests
cat > tests/ioc-test.ts << 'EOL'
// tests/ioc-test.ts
import { Container, ServiceIdentifiers, registerCoreServices } from '../src/core/ioc';
import { SearchEngine } from '../src/core/search/SearchEngine';
import { CacheManager } from '../src/core/storage/CacheManager';

/**
 * Test the IoC container implementation
 */
async function testIoCContainer() {
  console.log('Testing IoC container implementation...');

  // Create a new container
  const container = new Container();

  // Register core services
  registerCoreServices(container, {
    storage: 'memory',
    cacheOptions: {
      maxSize: 100,
      ttlMinutes: 10
    }
  });

  // Test that the container has the registered services
  console.log('\nChecking registered services:');
  Object.values(ServiceIdentifiers).forEach(token => {
    console.log(`- ${token}: ${container.has(token) ? 'Registered' : 'NOT REGISTERED'}`);
  });

  // Get some services to verify they work
  console.log('\nRetrieving services:');
  try {
    const searchEngine = container.get<SearchEngine>(ServiceIdentifiers.SEARCH_ENGINE);
    console.log('- SearchEngine retrieved successfully');

    const cacheManager = container.get<CacheManager>(ServiceIdentifiers.CACHE_MANAGER);
    console.log('- CacheManager retrieved successfully');

    // Initialize the search engine
    await searchEngine.initialize();
    console.log('- SearchEngine initialized successfully');

    // Add a test document
    const testDoc = {
      id: 'test-doc-1',
      fields: {
        title: 'Test Document',
        content: 'This is a test document for IoC testing',
        tags: ['test', 'ioc']
      }
    };
    await searchEngine.addDocument(testDoc);
    console.log('- Test document added successfully');

    // Perform a test search
    const results = await searchEngine.search('test');
    console.log(`- Search returned ${results.length} results`);

    // Clean up
    await searchEngine.close();
    console.log('- SearchEngine closed successfully');

    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testIoCContainer()
    .then(success => {
      if (success) {
        console.log('\nAll IoC tests passed!');
        process.exit(0);
      } else {
        console.error('\nIoC tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\nError running tests:', error);
      process.exit(1);
    });
}

export default testIoCContainer;
EOL

echo -e "${GREEN}✓ IoC structure set up successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run 'chmod +x setup-ioc.sh' to make the script executable"
echo -e "  2. Run the script with './setup-ioc.sh'"
echo -e "  3. Update your SearchEngine imports to use the IoC container"
echo -e "  4. Run the IoC test with 'npx ts-node tests/ioc-test.ts'"

exit 0
