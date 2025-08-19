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
