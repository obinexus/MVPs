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
