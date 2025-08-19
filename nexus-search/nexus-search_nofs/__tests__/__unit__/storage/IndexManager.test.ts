import { IndexMapper } from "@/mappers";
import { IndexManager } from "@/storage";
import { IndexedDocument, IndexConfig, SerializedIndex } from "@/types";


// Mock dependencies
jest.mock('@/mappers', () => ({
  IndexMapper: jest.fn().mockImplementation(() => ({
    indexDocument: jest.fn(),
    updateDocument: jest.fn(),
    removeDocument: jest.fn(),
    search: jest.fn(),
    exportState: jest.fn().mockReturnValue({
      trie: {},
      dataMap: {}
    }),
    importState: jest.fn()
  }))
}));

jest.mock('@/utils', () => ({
  createSearchableFields: jest.fn().mockImplementation((_data) => ({
    title: 'test title',
    content: 'test content'
  }))
}));

// Mock document creator 
const createMockDocument = (id: string): IndexedDocument => ({
  id,
  title: `Title ${id}`,
  author: `Author ${id}`,
  tags: [`tag-${id}-1`, `tag-${id}-2`],
  version: '1.0',
  fields: {
    title: `Title ${id}`,
    author: `Author ${id}`,
    content: { text: `Content for document ${id}` },
    tags: [`tag-${id}-1`, `tag-${id}-2`],
    version: '1.0'
  },
  metadata: {
    lastModified: Date.now(),
    indexed: Date.now()
  },
  versions: [],
  relations: [],
  document: function() { return this; },
  base: function() { 
    return { 
      id: this.id,
      title: this.title,
      author: this.author,
      version: this.version,
      metadata: this.metadata,
      versions: this.versions,
      relations: this.relations,
      tags: this.tags
    };
  }
});

describe('IndexManager', () => {
  let indexManager: IndexManager;
  let mockConfig: IndexConfig;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = {
      name: 'test-index',
      version: 1,
      fields: ['title', 'content', 'author', 'tags']
    };
    indexManager = new IndexManager(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(indexManager['config']).toEqual(mockConfig);
      expect(indexManager['documents']).toBeInstanceOf(Map);
      expect(indexManager['documents'].size).toBe(0);
      expect(IndexMapper).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should reset documents and create a new IndexMapper', () => {
      // Add some documents first
      indexManager['documents'].set('test-1', createMockDocument('test-1'));
      expect(indexManager['documents'].size).toBe(1);
      
      // Call initialize
      indexManager.initialize();
      
      // Verify state was reset
      expect(indexManager['documents'].size).toBe(0);
      expect(IndexMapper).toHaveBeenCalledTimes(2); // Once in constructor, once in initialize
      expect(indexManager['config']).toEqual({
        name: 'default',
        version: 1,
        fields: ['content', 'title', 'metadata', 'author', 'tags', 'type']
      });
    });
  });

  describe('getSize', () => {
    it('should return the number of documents', () => {
      expect(indexManager.getSize()).toBe(0);
      
      indexManager['documents'].set('test-1', createMockDocument('test-1'));
      indexManager['documents'].set('test-2', createMockDocument('test-2'));
      
      expect(indexManager.getSize()).toBe(2);
    });
  });

  describe('getAllDocuments', () => {
    it('should return the documents map', () => {
      const doc1 = createMockDocument('test-1');
      const doc2 = createMockDocument('test-2');
      
      indexManager['documents'].set('test-1', doc1);
      indexManager['documents'].set('test-2', doc2);
      
      const docs = indexManager.getAllDocuments();
      expect(docs).toBeInstanceOf(Map);
      expect(docs.size).toBe(2);
      expect(docs.get('test-1')).toEqual(doc1);
      expect(docs.get('test-2')).toEqual(doc2);
    });
  });

  describe('importDocuments', () => {
    it('should add multiple documents to the collection', () => {
      const docs = [
        createMockDocument('test-1'),
        createMockDocument('test-2'),
        createMockDocument('test-3')
      ];
      
      indexManager.importDocuments(docs);
      
      expect(indexManager['documents'].size).toBe(3);
      expect(indexManager['documents'].get('test-1')).toEqual(docs[0]);
      expect(indexManager['documents'].get('test-2')).toEqual(docs[1]);
      expect(indexManager['documents'].get('test-3')).toEqual(docs[2]);
    });
  });

  describe('addDocument', () => {
    it('should add a document to the collection and index it', () => {
      const doc = createMockDocument('test-1');
      const indexDocumentMock = indexManager['indexMapper'].indexDocument as jest.Mock;
      
      indexManager.addDocument(doc);
      
      // Verify document was added to the collection
      expect(indexManager['documents'].size).toBe(1);
      expect(indexManager['documents'].get('test-1')).toEqual(doc);
      
      // Verify indexDocument was called with expected arguments
      expect(indexDocumentMock).toHaveBeenCalledTimes(1);
      expect(indexDocumentMock.mock.calls[0][1]).toBe('test-1');
      expect(indexDocumentMock.mock.calls[0][2]).toEqual(mockConfig.fields);
    });

    it('should generate ID if document does not have one', () => {
      const docWithoutId = { ...createMockDocument(''), id: '' };
      const indexDocumentMock = indexManager['indexMapper'].indexDocument as jest.Mock;
      
      // Mock Date.now for consistent ID generation
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockReturnValue(12345);
      
      indexManager.addDocument(docWithoutId);
      
      // Verify document was added with generated ID
      expect(indexManager['documents'].size).toBe(1);
      const generatedId = `test-index-0-12345`;
      expect(indexDocumentMock.mock.calls[0][1]).toBe(generatedId);
      
      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe('getDocument', () => {
    it('should return the document with the given ID', () => {
      const doc = createMockDocument('test-1');
      indexManager['documents'].set('test-1', doc);
      
      const result = indexManager.getDocument('test-1');
      expect(result).toEqual(doc);
    });
    
    it('should return undefined if document does not exist', () => {
      const result = indexManager.getDocument('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('hasDocument', () => {
    it('should return true if document exists', () => {
      indexManager['documents'].set('test-1', createMockDocument('test-1'));
      expect(indexManager.hasDocument('test-1')).toBe(true);
    });
    
    it('should return false if document does not exist', () => {
      expect(indexManager.hasDocument('non-existent')).toBe(false);
    });
  });
  
  describe('exportIndex', () => {
    it('should export the index state correctly', () => {
      // Add some test documents
      const doc1 = createMockDocument('test-1');
      const doc2 = createMockDocument('test-2');
      indexManager['documents'].set('test-1', doc1);
      indexManager['documents'].set('test-2', doc2);
      
      const exportStateMock = indexManager['indexMapper'].exportState as jest.Mock;
      exportStateMock.mockReturnValue({
        trie: { root: {} },
        dataMap: { 'test': ['test-1', 'test-2'] }
      });
      
      const exported = indexManager.exportIndex();
      
      expect(exported).toEqual({
        documents: [
          { key: 'test-1', value: expect.any(Object) },
          { key: 'test-2', value: expect.any(Object) }
        ],
        indexState: {
          trie: { root: {} },
          dataMap: { 'test': ['test-1', 'test-2'] }
        },
        config: mockConfig
      });
      
      // Check that documents were serialized
      expect(exported.documents[0].value).toEqual(doc1);
      expect(exported.documents[1].value).toEqual(doc2);
    });
  });
  
  describe('importIndex', () => {
    it('should import valid index data', () => {
      const doc1 = createMockDocument('test-1');
      const doc2 = createMockDocument('test-2');
      
      const validIndex: SerializedIndex = {
        documents: [
          { key: 'test-1', value: doc1 },
          { key: 'test-2', value: doc2 }
        ],
        indexState: {
          trie: { root: {} },
          dataMap: { 'test': ['test-1', 'test-2'] }
        },
        config: {
          name: 'imported-index',
          version: 2,
          fields: ['title', 'content', 'tags']
        }
      };
      
      const importStateMock = indexManager['indexMapper'].importState as jest.Mock;
      
      indexManager.importIndex(validIndex);
      
      // Verify documents were imported
      expect(indexManager['documents'].size).toBe(2);
      expect(indexManager['documents'].get('test-1')).toEqual(doc1);
      expect(indexManager['documents'].get('test-2')).toEqual(doc2);
      
      // Verify config was imported
      expect(indexManager['config']).toEqual(validIndex.config);
      
      // Verify index state was imported
      expect(importStateMock).toHaveBeenCalledWith({
        trie: { root: {} },
        dataMap: { 'test': ['test-1', 'test-2'] }
      });
    });
    
    it('should throw error for invalid index data', () => {
      const invalidData = {
        // Missing documents array
        indexState: {},
        config: {}
      };
      
      expect(() => {
        indexManager.importIndex(invalidData);
      }).toThrow('Invalid index data format');
    });
    
    it('should throw error for invalid index state', () => {
      const invalidStateData = {
        documents: [],
        indexState: { invalidFormat: true }, // Missing trie and dataMap
        config: { name: 'test', version: 1, fields: [] }
      };
      
      expect(() => {
        indexManager.importIndex(invalidStateData);
      }).toThrow('Invalid index state format');
    });
  });
  
  describe('clear', () => {
    it('should clear all documents and create a new index mapper', () => {
      // Add some test documents
      indexManager['documents'].set('test-1', createMockDocument('test-1'));
      indexManager['documents'].set('test-2', createMockDocument('test-2'));
      
      indexManager.clear();
      
      expect(indexManager['documents'].size).toBe(0);
      expect(IndexMapper).toHaveBeenCalledTimes(2); // Once in constructor, once in clear
    });
  });
  
  describe('addDocuments', () => {
    it('should add multiple documents', async () => {
      const docs = [
        createMockDocument('test-1'),
        createMockDocument('test-2'),
        { ...createMockDocument(''), id: '' } // One without ID
      ];
      
      const indexDocumentMock = indexManager['indexMapper'].indexDocument as jest.Mock;
      
      // Mock Date.now for consistent ID generation
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockReturnValue(12345);
      
      await indexManager.addDocuments(docs);
      
      // Verify documents were added
      expect(indexManager['documents'].size).toBe(3);
      expect(indexManager['documents'].get('test-1')).toEqual(expect.objectContaining({ id: 'test-1' }));
      expect(indexManager['documents'].get('test-2')).toEqual(expect.objectContaining({ id: 'test-2' }));
      expect(indexManager['documents'].has('test-index-0-12345')).toBe(true);
      
      // Verify indexDocument was called for each document
      expect(indexDocumentMock).toHaveBeenCalledTimes(3);
      
      // Restore Date.now
      Date.now = originalDateNow;
    });
    
    it('should handle indexing errors gracefully', async () => {
      const docs = [createMockDocument('test-1')];
      const indexDocumentMock = indexManager['indexMapper'].indexDocument as jest.Mock;
      indexDocumentMock.mockRejectedValueOnce(new Error('Indexing failed'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await indexManager.addDocuments(docs);
      
      // Document should still be added to the collection despite indexing error
      expect(indexManager['documents'].size).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to index document test-1'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('updateDocument', () => {
    it('should update an existing document', async () => {
      // Add initial document
      const initialDoc = createMockDocument('test-1');
      indexManager['documents'].set('test-1', initialDoc);
      
      // Create updated version
      const updatedDoc = {
        ...initialDoc,
        fields: {
          ...initialDoc.fields,
          title: 'Updated Title',
          content: { text: 'Updated content' }
        }
      };
      
      const updateDocumentMock = indexManager['indexMapper'].updateDocument as jest.Mock;
      
      await indexManager.updateDocument(updatedDoc);
      
      // Verify document was updated in collection
      expect(indexManager['documents'].get('test-1')).toEqual(updatedDoc);
      
      // Verify updateDocument was called with correct arguments
      expect(updateDocumentMock).toHaveBeenCalledTimes(1);
      expect(updateDocumentMock.mock.calls[0][0]).toEqual(expect.objectContaining({
        id: 'test-1',
        version: '1'
      }));
      expect(updateDocumentMock.mock.calls[0][1]).toBe('test-1');
      expect(updateDocumentMock.mock.calls[0][2]).toEqual(mockConfig.fields);
    });
    
    it('should throw error when updating non-existent document', async () => {
      const doc = createMockDocument('non-existent');
      
      await expect(indexManager.updateDocument(doc)).rejects.toThrow(
        'Document non-existent not found'
      );
    });
    
    it('should propagate indexing errors', async () => {
      // Add document
      const doc = createMockDocument('test-1');
      indexManager['documents'].set('test-1', doc);
      
      const updateDocumentMock = indexManager['indexMapper'].updateDocument as jest.Mock;
      updateDocumentMock.mockRejectedValueOnce(new Error('Update failed'));
      
      await expect(indexManager.updateDocument(doc)).rejects.toThrow('Update failed');
      
      // Document should still be in collection despite update error
      expect(indexManager['documents'].has('test-1')).toBe(true);
    });
  });
  
  describe('removeDocument', () => {
    it('should remove an existing document', async () => {
      // Add document
      indexManager['documents'].set('test-1', createMockDocument('test-1'));
      
      const removeDocumentMock = indexManager['indexMapper'].removeDocument as jest.Mock;
      
      await indexManager.removeDocument('test-1');
      
      // Verify document was removed from collection
      expect(indexManager['documents'].has('test-1')).toBe(false);
      
      // Verify removeDocument was called with correct ID
      expect(removeDocumentMock).toHaveBeenCalledWith('test-1');
    });
    
    it('should do nothing when removing non-existent document', async () => {
      const removeDocumentMock = indexManager['indexMapper'].removeDocument as jest.Mock;
      
      await indexManager.removeDocument('non-existent');
      
      expect(removeDocumentMock).not.toHaveBeenCalled();
    });
    
    it('should propagate removal errors', async () => {
      // Add document
      indexManager['documents'].set('test-1', createMockDocument('test-1'));
      
      const removeDocumentMock = indexManager['indexMapper'].removeDocument as jest.Mock;
      removeDocumentMock.mockRejectedValueOnce(new Error('Removal failed'));
      
      await expect(indexManager.removeDocument('test-1')).rejects.toThrow('Removal failed');
      
      // Document should still be in collection despite removal error
      expect(indexManager['documents'].has('test-1')).toBe(true);
    });
  });
  
  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const results = await indexManager.search('');
      expect(results).toEqual([]);
      
      const nullResults = await indexManager.search(null as any);
      expect(nullResults).toEqual([]);
      
      const whitespaceResults = await indexManager.search('   ');
      expect(whitespaceResults).toEqual([]);
    });
    
    it('should perform search with default options', async () => {
      // Add some documents
      const doc1 = createMockDocument('test-1');
      const doc2 = createMockDocument('test-2');
      indexManager['documents'].set('test-1', doc1);
      indexManager['documents'].set('test-2', doc2);
      
      const searchMock = indexManager['indexMapper'].search as jest.Mock;
      searchMock.mockResolvedValueOnce([
        { item: 'test-1', score: 0.8, matches: ['test'] },
        { item: 'test-2', score: 0.6, matches: ['test'] }
      ]);
      
      const results = await indexManager.search('test');
      
      // Verify search was called with correct arguments
      expect(searchMock).toHaveBeenCalledWith('test', {
        fuzzy: false,
        maxResults: 10
      });
      
      // Verify results were mapped correctly
      expect(results).toEqual([
        {
          id: 'test-1',
          docId: 'test-1',
          term: 'test',
          document: doc1,
          metadata: doc1.metadata,
          item: doc1,
          score: 0.8,
          matches: ['test']
        },
        {
          id: 'test-2',
          docId: 'test-2',
          term: 'test',
          document: doc2,
          metadata: doc2.metadata,
          item: doc2,
          score: 0.6,
          matches: ['test']
        }
      ]);
    });
    
    it('should respect threshold option', async () => {
      // Add documents
      const doc1 = createMockDocument('test-1');
      const doc2 = createMockDocument('test-2');
      indexManager['documents'].set('test-1', doc1);
      indexManager['documents'].set('test-2', doc2);
      
      const searchMock = indexManager['indexMapper'].search as jest.Mock;
      searchMock.mockResolvedValueOnce([
        { item: 'test-1', score: 0.8, matches: ['test'] },
        { item: 'test-2', score: 0.6, matches: ['test'] }
      ]);
      
      const results = await indexManager.search('test', { threshold: 0.7 });
      
      // Only the first result should be returned (score >= 0.7)
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('test-1');
    });
    
    it('should filter out results for non-existent documents', async () => {
      // Add only one document
      const doc1 = createMockDocument('test-1');
      indexManager['documents'].set('test-1', doc1);
      
      const searchMock = indexManager['indexMapper'].search as jest.Mock;
      searchMock.mockResolvedValueOnce([
        { item: 'test-1', score: 0.8, matches: ['test'] },
        { item: 'non-existent', score: 0.9, matches: ['test'] } // Document doesn't exist
      ]);
      
      const results = await indexManager.search('test');
      
      // Only the existing document should be returned
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('test-1');
    });
    
    it('should handle search errors gracefully', async () => {
      const searchMock = indexManager['indexMapper'].search as jest.Mock;
      searchMock.mockRejectedValueOnce(new Error('Search failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const results = await indexManager.search('test');
      
      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Search error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('private methods', () => {
    describe('generateDocumentId', () => {
      it('should generate ID with config name, index and timestamp', () => {
        // Mock Date.now
        const originalDateNow = Date.now;
        Date.now = jest.fn().mockReturnValue(12345);
        
        const id = indexManager['generateDocumentId'](42);
        
        expect(id).toBe('test-index-42-12345');
        
        // Restore Date.now
        Date.now = originalDateNow;
      });
    });
    
    describe('isValidIndexData', () => {
      it('should validate correct index data', () => {
        const validData = {
          documents: [{ key: 'test', value: {} }],
          indexState: {},
          config: { name: 'test', version: 1, fields: [] }
        };
        
        expect(indexManager['isValidIndexData'](validData)).toBe(true);
      });
      
      it('should reject invalid index data', () => {
        expect(indexManager['isValidIndexData'](null)).toBe(false);
        expect(indexManager['isValidIndexData']({})).toBe(false);
        expect(indexManager['isValidIndexData']({ documents: 'not-array' })).toBe(false);
        expect(indexManager['isValidIndexData']({ 
          documents: [],
          indexState: {},
          config: 'not-object'
        })).toBe(false);
      });
    });
    
    describe('isValidIndexState', () => {
      it('should validate correct index state', () => {
        const validState = {
          trie: {},
          dataMap: {}
        };
        
        expect(indexManager['isValidIndexState'](validState)).toBe(true);
      });
      
      it('should reject invalid index state', () => {
        expect(indexManager['isValidIndexState'](null)).toBe(false);
        expect(indexManager['isValidIndexState']({})).toBe(false);
        expect(indexManager['isValidIndexState']({ trie: {} })).toBe(false);
        expect(indexManager['isValidIndexState']({ dataMap: {} })).toBe(false);
      });
    });
    
    describe('serializeDocument', () => {
      it('should serialize document to JSON and back', () => {
        const doc = createMockDocument('test-1');
        const serialized = indexManager['serializeDocument'](doc);
        
        // Should be a deep copy, not the same object
        expect(serialized).not.toBe(doc);
        expect(serialized).toEqual(doc);
      });
    });
  });
});