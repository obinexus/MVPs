# NexusSearch

A high-performance search indexing and query system with cross-platform file system support.

## Project Structure

```
src/
├── core/              # Core search engine functionality
│   ├── search/        # Search engine implementation
│   ├── documents/     # Document processing
│   ├── storage/       # Storage adapters
│   ├── algorithms/    # Search algorithms
│   └── utils/         # Utility functions
├── adapters/          # Platform-specific adapters
│   ├── browser/       # Browser-specific implementations
│   ├── node/          # Node.js-specific implementations
│   └── common/        # Shared adapter interfaces
├── cli/               # Command-line interface
│   ├── commands/      # CLI command implementations
│   ├── formatters/    # Output formatting
│   └── index.ts       # CLI entry point
├── web/               # Web integration
│   ├── components/    # UI components
│   ├── hooks/         # React hooks
│   └── index.ts       # Web entry point
└── types/             # TypeScript type definitions
```

## File System Compatibility

NexusSearch provides a cross-platform file system abstraction layer that works in both Node.js and browser environments:

- In Node.js: Uses native fs/promises API
- In browsers: Uses File/FileReader API and IndexedDB for storage

## Development

```bash
# Install dependencies
npm install

# Start development with watch mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Usage

### Node.js

```javascript
import { SearchEngine } from '@obinexuscomputing/nexus-search';

const engine = new SearchEngine(config);
await engine.initialize();
const results = await engine.search('query');
```

### Browser

```javascript
import { SearchEngine } from '@obinexuscomputing/nexus-search';

const engine = new SearchEngine({
  storage: { type: 'indexeddb' },
  // other config...
});

// File upload example
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await engine.addDocument({
    id: file.name,
    file: file
  });
});

// Search example
const results = await engine.search('query');
```

### CLI

```bash
# Index documents in a directory
nsc index ./documents

# Search for a term
nsc search "query"

# Export the index
nsc export --output=index.json
```
