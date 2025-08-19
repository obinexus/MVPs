import { IndexMapper } from '@/mappers';
import { SearchableDocument } from '@/types';

describe('IndexMapper', () => {
  let indexMapper: IndexMapper;

  beforeEach(() => {
    indexMapper = new IndexMapper();
  });

  test('should index document and retrieve it', () => {
    const document: SearchableDocument = {
      id: 'doc1',
      version: '1.0',
      content: {
        title: 'Test Document',
        content: 'This is test content',
        tags: ['test', 'document']
      },
      metadata: {
        lastModified: Date.now(),
        indexed: Date.now()
      }
    };

    indexMapper.indexDocument(document, 'doc1', ['title', 'content', 'tags']);
    
    const results = indexMapper.search('test');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item).toBe('doc1');
  });

  test('should handle multiple documents', () => {
    const documents = Array.from({ length: 10 }, (_, index) => {
      const doc: SearchableDocument = {
        id: `doc${index + 1}`,
        version: '1.0',
        content: {
          title: `Document ${index + 1}`,
          content: `Content for document ${index + 1}`
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      indexMapper.indexDocument(doc, `doc${index + 1}`, ['title', 'content']);
      return doc;
    });
    
    const results = indexMapper.search('document');
    
    expect(results.length).toBeGreaterThan(1);
  });

  test('should handle missing fields gracefully', () => {
    const document: SearchableDocument = {
      id: 'doc1',
      version: '1.0',
      content: {
        title: 'Missing Content Document'
      },
      metadata: {
        lastModified: Date.now(),
        indexed: Date.now()
      }
    };
    
    indexMapper.indexDocument(document, 'doc1', ['title', 'content']);
    
    const results = indexMapper.search('Missing');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should handle document updates', () => {
    const document: SearchableDocument = {
      id: 'doc1',
      version: '1.0',
      content: {
        title: 'Original Title',
        content: 'Original content'
      },
      metadata: {
        lastModified: Date.now(),
        indexed: Date.now()
      }
    };
    
    indexMapper.indexDocument(document, 'doc1', ['title', 'content']);
    
    const updatedDocument: SearchableDocument = {
      id: 'doc1',
      version: '1.1',
      content: {
        title: 'Updated Title',
        content: 'Updated content'
      },
      metadata: {
        lastModified: Date.now(),
        indexed: Date.now()
      }
    };
    
    indexMapper.updateDocument(updatedDocument, 'doc1', ['title', 'content']);
    
    const results = indexMapper.search('Updated');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should handle fuzzy search', () => {
    const documents = Array.from({ length: 5 }, (_, index) => {
      const doc: SearchableDocument = {
        id: `doc${index + 1}`,
        version: '1.0',
        content: {
          title: `Document ${index + 1}`,
          content: `Content for document ${index + 1}`,
          tags: ['test', `tag${index}`]
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      indexMapper.indexDocument(doc, `doc${index + 1}`, ['title', 'content', 'tags']);
      return doc;
    });
    
    // Search with typo
    const results = indexMapper.search('documnet', { fuzzy: true });
    
    expect(results.length).toBeGreaterThan(0);
  });

  test('should remove document', () => {
    const documents = Array.from({ length: 3 }, (_, index) => {
      Array.from({ length: 3 }, (_, index) => {
        const doc: SearchableDocument = {
          id: `doc${index}`,
          version: '1.0',
          content: {
            title: `Document ${index}`,
            content: `Content for document ${index}`,
            tags: ['test', `tag${index}`]
          },
          metadata: {
            lastModified: Date.now(),
            indexed: Date.now()
          }
        };
        
        indexMapper.indexDocument(doc, `doc${index}`, ['title', 'content', 'tags']);
      });
      const doc: SearchableDocument = {
        id: `doc${index}`,
        version: '1.0',
        content: {
          title: `Document ${index}`,
          content: `Content for document ${index}`,
          tags: ['test', `tag${index}`]
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      indexMapper.indexDocument(doc, `doc${index}`, ['title', 'content', 'tags']);
      return doc;
    });
    
    // Remove document 1
    indexMapper.removeDocument('doc1');
    
    const results = indexMapper.search('document');
    expect(results.every(r => r.item !== 'doc1')).toBe(true);
  });

  test('should handle export and import state', () => {
    const documents = Array.from({ length: 3 }, (_, index) => {
      const doc: SearchableDocument = {
        id: `doc${index}`,
        version: '1.0',
        content: {
          title: `Document ${index}`,
          content: `Content for document ${index}`,
          tags: ['test', `tag${index}`]
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      indexMapper.indexDocument(doc, `doc${index}`, ['title', 'content', 'tags']);
      return doc;
    });
    
    const state = indexMapper.exportState();
    
    // Create new mapper and import state
    const newMapper = new IndexMapper();
    newMapper.importState({
      trie: (state as any).trie,
      dataMap: (state as any).dataMap
    });
    
    const results = newMapper.search('document');
    expect(results.length).toBe(3);
  });

  test('should normalize different value types', () => {
    const document: SearchableDocument = {
      id: 'doc1',
      version: '1.0',
      content: {
        title: 'Mixed Content Types',
        content: 'String content'
      },
      metadata: {
        lastModified: Date.now(),
        indexed: Date.now()
      }
    };
    
    indexMapper.indexDocument(document, 'doc1', ['title', 'content']);
    
    const results = indexMapper.search('Mixed');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should handle case sensitivity', () => {
    const document: SearchableDocument = {
      id: 'doc1',
      version: '1.0',
      content: {
        title: 'UPPERCASE TITLE',
        content: 'lowercase content'
      },
      metadata: {
        lastModified: Date.now(),
        indexed: Date.now()
      }
    };
    
    indexMapper.indexDocument(document, 'doc1', ['title', 'content']);
    
    const lowerResults = indexMapper.search('uppercase');
    const upperResults = indexMapper.search('UPPERCASE');
    
    expect(lowerResults.length).toBeGreaterThan(0);
    expect(upperResults.length).toBeGreaterThan(0);
  });
});