import { TrieSearch } from "@/algorithms/trie";
import { IndexedDocument } from "@/storage";
import { createTestDocument } from "@/utils/createMockDocument";

// Set up test mocks
jest.mock('@/storage/IndexedDocument');

describe('TrieSearch', () => {
  let trieSearch: TrieSearch;
  
  beforeEach(() => {
    trieSearch = new TrieSearch();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default parameters', () => {
      const trie = new TrieSearch();
      expect(trie).toBeInstanceOf(TrieSearch);
    });

    test('should initialize with custom maxWordLength', () => {
      const trie = new TrieSearch(30);
      expect(trie).toBeInstanceOf(TrieSearch);
    });
  });

  describe('insert', () => {
    test('should insert a word with its document ID', () => {
      const insertSpy = jest.spyOn(trieSearch as any, 'insertWord');
      
      trieSearch.insert('test', 'doc1');
      
      expect(insertSpy).toHaveBeenCalledWith('test', 'doc1');
    });

    test('should not insert words longer than maxWordLength', () => {
      const shortTrie = new TrieSearch(5);
      const insertSpy = jest.spyOn(shortTrie as any, 'insertWord');
      
      shortTrie.insert('testing', 'doc1'); // Too long for maxWordLength: 5
      expect(insertSpy).not.toHaveBeenCalled();
      
      shortTrie.insert('test', 'doc1'); // Within maxWordLength
      expect(insertSpy).toHaveBeenCalledWith('test', 'doc1');
    });
  });

  describe('addDocument', () => {
    let mockDocument: IndexedDocument;
    
    beforeEach(() => {
      mockDocument = {
        id: 'doc1',
        title: 'Test Document',
        content: 'This is a test document',
        author: 'Test Author',
        normalizeFields: jest.fn(),
        normalizeContent: jest.fn(),
        normalizeMetadata: jest.fn(),
        clone: jest.fn(),
        toString: jest.fn(),
        toJSON: jest.fn(),
        getValue: jest.fn(),
      } as unknown as IndexedDocument;
    });

    test('should add a document and index its fields', () => {
      const indexTextSpy = jest.spyOn(trieSearch as any, 'indexText');
      
      trieSearch.addDocument(mockDocument);
      
      // Check that document was added
      expect(indexTextSpy).toHaveBeenCalledWith('This is a test document', 'doc1');
      expect(indexTextSpy).toHaveBeenCalledWith('Test Document', 'doc1');
      expect(indexTextSpy).toHaveBeenCalledWith('Test Author', 'doc1');
    });

    test('should not add a document without an ID', () => {
      const invalidDoc = { ...mockDocument, id: undefined } as unknown as IndexedDocument;
      const documentSetSpy = jest.spyOn(trieSearch['documents'], 'set');
      
      trieSearch.addDocument(invalidDoc);
      
      expect(documentSetSpy).not.toHaveBeenCalled();
    });
  });

  describe('addData', () => {
    test('should add data with a document ID', () => {
      const addDocumentSpy = jest.spyOn(trieSearch, 'addDocument');
      const mockDoc = createTestDocument('doc1', 'Test Document', 'Original content');
      
      trieSearch.addData('doc1', 'test content', mockDoc);
      
      expect(addDocumentSpy).toHaveBeenCalled();
    });

    test('should not add data without a document ID', () => {
      const addDocumentSpy = jest.spyOn(trieSearch, 'addDocument');
      const mockDoc = createTestDocument('doc1', 'Test Document', 'Original content');
      
      trieSearch.addData('', 'test content', mockDoc);
      
      expect(addDocumentSpy).not.toHaveBeenCalled();
    });

    test('should not add data with non-string content', () => {
      const addDocumentSpy = jest.spyOn(trieSearch, 'addDocument');
      const mockDoc = createTestDocument('doc1', 'Test Document', 'Original content');
      
      trieSearch.addData('doc1', null as unknown as string, mockDoc);
      
      expect(addDocumentSpy).not.toHaveBeenCalled();
    });
  });

  describe('searchWord', () => {
    test('should call search method with the term', () => {
      const searchSpy = jest.spyOn(trieSearch, 'search').mockReturnValue([]);
      
      trieSearch.searchWord('test');
      
      expect(searchSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      // Create test documents
      const doc1 = createTestDocument('doc1', 'Test', 'A test document');
      const doc2 = createTestDocument('doc2', 'Testing', 'A testing document');
      const doc3 = createTestDocument('doc3', 'Tested', 'A tested document');
      const doc4 = createTestDocument('doc4', 'Another', 'Another document');
      
      // Add documents to trie
      trieSearch.addDocument(doc1);
      trieSearch.addDocument(doc2);
      trieSearch.addDocument(doc3);
      trieSearch.addDocument(doc4);
      
      // Also insert directly for test compatibility
      trieSearch.insert('test', 'doc1');
      trieSearch.insert('testing', 'doc2');
      trieSearch.insert('tested', 'doc3');
      trieSearch.insert('another', 'doc4');
    });

    test('should find exact matches', () => {
      const results = trieSearch.search('test');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.docId === 'doc1')).toBe(true);
    });

    test('should use fuzzy search when fuzzy option is true', () => {
      const fuzzySearchSpy = jest.spyOn(trieSearch, 'fuzzySearch');
      
      trieSearch.search('tes', { fuzzy: true });
      
      expect(fuzzySearchSpy).toHaveBeenCalled();
    });

    test('should respect maxResults option', () => {
      const results = trieSearch.search('test', { 
        fuzzy: true,
        maxResults: 1 
      });
      
      expect(results.length).toBeLessThanOrEqual(1);
    });

    test('should respect minScore option', () => {
      const results = trieSearch.search('xyz', { 
        fuzzy: true,
        minScore: 0.7
      });
      
      // All results should have score >= minScore
      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0.7);
      });
    });

    test('should break ties by score', () => {
      // Create and add common documents
      const doc10 = createTestDocument('doc10', 'Common', 'Common document 10');
      const doc11 = createTestDocument('doc11', 'Common', 'Common document 11');
      
      // Add to a new instance to avoid conflicts
      const localTrie = new TrieSearch();
      localTrie.addDocument(doc10);
      localTrie.addDocument(doc11);
      
      // Add extra weight to doc10 by inserting the same word multiple times
      for (let i = 0; i < 5; i++) {
        localTrie.insert('common', 'doc10');
      }
      
      const results = localTrie.search('common');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].docId).toBe('doc10');
    });
  
});
})