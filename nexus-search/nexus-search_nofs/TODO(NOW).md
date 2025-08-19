
## Core Architecture Redesign Plan

### 1. File System Abstraction Layer
```typescript
// src/core/storage/FileSystemAdapter.ts
export interface FileSystemAdapter {
  readFile(path: string, options?: { encoding?: string }): Promise<Uint8Array | string>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(directory: string, options?: { recursive?: boolean }): Promise<string[]>;
}

// Browser implementation
export class BrowserFileSystemAdapter implements FileSystemAdapter {
  // Use the File System Access API for modern browsers
  // Fall back to IndexedDB for storage in older browsers
}

// Node.js implementation
export class NodeFileSystemAdapter implements FileSystemAdapter {
  // Use the fs/promises API
}

// Factory to create the appropriate adapter
export function createFileSystemAdapter(): FileSystemAdapter {
  return typeof window === 'undefined' 
    ? new NodeFileSystemAdapter() 
    : new BrowserFileSystemAdapter();
}
```

### 2. Document Processing Pipeline

```typescript
// src/core/documents/DocumentProcessor.ts
export interface DocumentProcessor {
  process(content: string | Uint8Array, metadata: DocumentMetadata): Promise<IndexedDocument>;
  supports(mimeType: string): boolean;
}

// Implementations for different document types
export class MarkdownProcessor implements DocumentProcessor { /* ... */ }
export class HTMLProcessor implements DocumentProcessor { /* ... */ }
export class PlainTextProcessor implements DocumentProcessor { /* ... */ }
export class PDFProcessor implements DocumentProcessor { /* ... */ }
```

### 3. Search Engine Core

```typescript
// src/core/search/SearchEngine.ts
export class SearchEngine {
  constructor(
    private readonly indexManager: IndexManager,
    private readonly queryProcessor: QueryProcessor,
    private readonly storage: StorageAdapter,
    private readonly config: SearchEngineConfig
  ) {}

  // Core API methods
  async initialize(): Promise<void> { /* ... */ }
  async search<T>(query: string, options?: SearchOptions): Promise<SearchResult<T>[]> { /* ... */ }
  async addDocument(document: IndexedDocument): Promise<void> { /* ... */ }
  async addDocuments(documents: IndexedDocument[]): Promise<void> { /* ... */ }
  async removeDocument(documentId: string): Promise<void> { /* ... */ }
  async clearIndex(): Promise<void> { /* ... */ }
}
```

### 4. CLI Implementation

```typescript
// src/cli/commands/Search.ts
export class SearchCommand implements Command {
  async execute(args: string[]): Promise<void> {
    // Parse CLI arguments
    // Initialize search engine
    // Execute search
    // Format and display results
  }
}

// src/cli/commands/Index.ts
export class IndexCommand implements Command {
  async execute(args: string[]): Promise<void> {
    // Parse CLI arguments
    // Initialize search engine
    // Index specified files or directories
  }
}
```

## Implementation TODO List

1. **Core Infrastructure**
   - [ ] Create abstracted file system adapters for browser and Node.js
   - [ ] Implement Blob support for web file uploads
   - [ ] Create document processor pipeline with plugin architecture
   - [ ] Implement MIME type detection and appropriate processor selection

2. **Search Engine Core**
   - [ ] Refactor the trie data structure for better performance
   - [ ] Implement fuzzy search algorithm improvements
   - [ ] Separate the document indexing from storage concerns
   - [ ] Add support for field-specific boosting and ranking

3. **Storage Layer**
   - [ ] Create IndexedDB adapter for browser environments
   - [ ] Implement in-memory fallback for environments without persistent storage
   - [ ] Add export/import capabilities for index serialization

4. **CLI Application**
   - [ ] Design command structure and argument parsing
   - [ ] Implement search, index, and manage commands
   - [ ] Add pretty console output with formatting
   - [ ] Support for watching directories for changes

5. **Web Integration**
   - [ ] Create React component for search UI
   - [ ] Implement file upload handling for browsers
   - [ ] Add support for search-as-you-type with debounce
   - [ ] Implement result highlighting and pagination

6. **Testing Infrastructure**
   - [ ] Create unit tests for core components
   - [ ] Implement integration tests for search functionality
   - [ ] Add performance benchmarks for indexing and search
   - [ ] Create test fixtures for different document types

7. **Documentation**
   - [ ] Update API documentation
   - [ ] Create usage examples for browser and Node.js
   - [ ] Document configuration options
   - [ ] Add migration guide from previous version

## Project Structure

```
src/
├── core/
│   ├── search/          # Search engine core
│   ├── documents/       # Document processing
│   ├── storage/         # Storage adapters
│   ├── algorithms/      # Search algorithms
│   └── utils/           # Utility functions
├── adapters/
│   ├── browser/         # Browser-specific code
│   ├── node/            # Node.js-specific code
│   └── common/          # Shared adapter code
├── cli/
│   ├── commands/        # CLI command implementations
│   ├── formatters/      # Output formatting
│   └── index.ts         # CLI entry point
├── web/
│   ├── components/      # React components
│   ├── hooks/           # React hooks for search
│   └── index.ts         # Web entry point
└── types/               # TypeScript type definitions
```

