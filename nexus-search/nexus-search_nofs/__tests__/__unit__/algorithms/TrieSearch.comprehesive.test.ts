import { TrieSearch } from "@/index";
import { IndexedDocument } from "@/types";


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
      const insertSpy = jest.spyOn(trieSearch, 'insertWord' as any);
      
      trieSearch.insert('test', 'doc1');
      
      expect(insertSpy).toHaveBeenCalledWith('test', 'doc1');
    });

    test('should not insert words longer than maxWordLength', () => {
      const shortTrie = new TrieSearch(5);
      const insertSpy = jest.spyOn(shortTrie, 'insertWord' as any);
      
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
        fields: {
          title: 'Test Document',
          content: { text: 'This is a test document' },
          author: 'Test Author',
          tags: ['test', 'document'],
          version: '1.0'
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: 'Test Document',
        author: 'Test Author',
        tags: ['test', 'document'],
        version: '1.0'
      };
    });

    test('should add a document and index its fields', () => {
      // Create a mock for indexText since it's the one that handles tokenization
      const indexTextSpy = jest.spyOn(trieSearch as any, 'indexText');
      
      trieSearch.addDocument(mockDocument);
      
      // Verify indexText was called with the expected field contents
      expect(indexTextSpy).toHaveBeenCalledWith('Test Document', 'doc1');
      expect(indexTextSpy).toHaveBeenCalledWith('This is a test document', 'doc1');
      expect(indexTextSpy).toHaveBeenCalledWith('Test Author', 'doc1');
      expect(indexTextSpy).toHaveBeenCalledTimes(5); // title, content.text, author, and 2 tags
    });

    test('should not add a document without an ID', () => {
      const invalidDoc = { ...mockDocument, id: undefined } as unknown as IndexedDocument;
      // Use a spy on documents.set instead
      const documentSetSpy = jest.spyOn(trieSearch['documents'], 'set');
      
      trieSearch.addDocument(invalidDoc);
      
      expect(documentSetSpy).not.toHaveBeenCalled();
    });
  });

  describe('addData', () => {
    test('should add data with a document ID', () => {
      const addDocumentSpy = jest.spyOn(trieSearch, 'addDocument');
      const mockDoc = {
        id: 'doc1',
        fields: {
          title: '',
          content: { text: '' },
          author: '',
          tags: [],
          version: '1.0'
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: '',
        author: '',
        tags: [],
        version: '1.0'
      } as IndexedDocument;
      
      trieSearch.addData('doc1', 'test content', mockDoc);
      
      expect(addDocumentSpy).toHaveBeenCalled();
    });

    test('should not add data without a document ID', () => {
      const addDocumentSpy = jest.spyOn(trieSearch, 'addDocument');
      const mockDoc = {
        fields: {
          title: '',
          content: { text: '' },
          author: '',
          tags: [],
          version: '1.0'
        }
      } as unknown as IndexedDocument;
      
      trieSearch.addData('', 'test content', mockDoc);
      
      expect(addDocumentSpy).not.toHaveBeenCalled();
    });

    test('should not add data with non-string content', () => {
      const addDocumentSpy = jest.spyOn(trieSearch, 'addDocument');
      const mockDoc = {
        fields: {
          title: '',
          content: { text: '' },
          author: '',
          tags: [],
          version: '1.0'
        }
      } as unknown as IndexedDocument;
      
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
      jest.clearAllMocks();
      // Create mock documents instead of just inserting words
      const docs = [
        { id: 'doc1', fields: { title: 'Test', content: { text: 'A test document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc2', fields: { title: 'Testing', content: { text: 'A testing document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc3', fields: { title: 'Tested', content: { text: 'A tested document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc4', fields: { title: 'Another', content: { text: 'Another document' }, author: 'Author', tags: [], version: '1.0' }},
      ].map(doc => ({
        ...doc,
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: doc.fields.title,
        author: doc.fields.author,
        tags: [],
        version: '1.0'
      })) as IndexedDocument[];
      
      // Add documents properly
      docs.forEach(doc => trieSearch.addDocument(doc));
      
      // Also insert direct words for backward compatibility with some tests
      trieSearch.insert('test', 'doc1');
      trieSearch.insert('testing', 'doc2');
      trieSearch.insert('tested', 'doc3');
      trieSearch.insert('another', 'doc4');
    });

    test('should find exact matches', () => {
      // Instead of spying on private exactSearch method, verify the results directly
      const results = trieSearch.search('test');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.docId === 'doc1')).toBe(true);
    });

    test('should use fuzzy search when fuzzy option is true', () => {
      // Since fuzzySearch is public, we can spy on it directly
      const fuzzySearchSpy = jest.spyOn(trieSearch, 'fuzzySearch');
      
      trieSearch.search('tes', { fuzzy: true });
      
      expect(fuzzySearchSpy).toHaveBeenCalled();
    });

    test('should handle prefix matching', () => {
      // We can't spy on prefixSearch directly as it's private
      // Instead, let's verify the results are as expected
      const exactResults = trieSearch.search('test');
      const prefixResults = trieSearch.search('test', { prefixMatch: true });
      
      // Prefix search should find more results than exact search
      expect(prefixResults.length).toBeGreaterThanOrEqual(exactResults.length);
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

    test('should respect caseSensitive option', () => {
      // Create a new instance for this specific test
      const localTrie = new TrieSearch();
      
      // Add case-sensitive words
      localTrie.insert('test', 'doc1');
      localTrie.insert('Test', 'doc5');
      
      const caseSensitiveResults = localTrie.search('Test', { caseSensitive: true });
      const caseInsensitiveResults = localTrie.search('Test', { caseSensitive: false });
      
      // Case sensitive should only match 'Test', case insensitive should match both
      expect(caseSensitiveResults.length).toBe(1);
      expect(caseInsensitiveResults.length).toBe(2);
    });

    test('should break ties by score', () => {
      // Create a new instance for this specific test
      const localTrie = new TrieSearch();
      
      // Create and add complete documents
      const doc10 = {
        id: 'doc10', 
        fields: { title: 'Common', content: { text: 'Common document 10' }, author: 'Author', tags: [], version: '1.0' },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { return { id: this.id, title: this.fields.title, author: 'Author', tags: [], version: '1.0', versions: [], relations: [] }; },
        title: 'Common',
        author: 'Author',
        tags: [],
        version: '1.0'
      } as IndexedDocument;
      
      const doc11 = {
        id: 'doc11', 
        fields: { title: 'Common', content: { text: 'Common document 11' }, author: 'Author', tags: [], version: '1.0' },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { return { id: this.id, title: this.fields.title, author: 'Author', tags: [], version: '1.0', versions: [], relations: [] }; },
        title: 'Common',
        author: 'Author',
        tags: [],
        version: '1.0'
      } as IndexedDocument;
      
      localTrie.addDocument(doc10);
      localTrie.addDocument(doc11);
      
      // Insert same word multiple times for doc10 to increase weight
      for (let i = 0; i < 5; i++) {
        localTrie.insert('common', 'doc10');
      }
      
      const results = localTrie.search('common');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].docId).toBe('doc10');
    });
  });

  describe('fuzzySearch', () => {
    beforeEach(() => {
      // Create a fresh instance for fuzzy search tests
      trieSearch = new TrieSearch();
      
      // Create properly formed documents
      const docs = [
        { id: 'doc1', fields: { title: 'Apple', content: { text: 'This is about an apple' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc2', fields: { title: 'Application', content: { text: 'This is about an application' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc3', fields: { title: 'Appreciate', content: { text: 'This is about appreciation' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc4', fields: { title: 'Banana', content: { text: 'This is about a banana' }, author: 'Author', tags: [], version: '1.0' }}
      ].map(doc => ({
        ...doc,
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: doc.fields.title,
        author: doc.fields.author,
        tags: [],
        version: '1.0'
      })) as IndexedDocument[];
      
      // Add documents properly
      docs.forEach(doc => trieSearch.addDocument(doc));
      
      // Also insert direct words for backward compatibility
      trieSearch.insert('apple', 'doc1');
      trieSearch.insert('application', 'doc2');
      trieSearch.insert('appreciate', 'doc3');
      trieSearch.insert('banana', 'doc4');
    });

    test('should find words within edit distance', () => {
      const results = trieSearch.fuzzySearch('aple', 2);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.docId === 'doc1')).toBe(true);
    });

    test('should not find words beyond edit distance', () => {
      const results = trieSearch.fuzzySearch('aple', 1);
      
      expect(results.every(r => r.docId !== 'doc1')).toBe(true);
    });

    test('should calculate match scores based on distance', () => {
      // Exact match
      const exactResults = trieSearch.fuzzySearch('apple', 2);
      // Close match
      const closeResults = trieSearch.fuzzySearch('aple', 2);
      
      const exactScore = exactResults.find(r => r.docId === 'doc1')?.score || 0;
      const closeScore = closeResults.find(r => r.docId === 'doc1')?.score || 0;
      
      expect(exactScore).toBeGreaterThan(closeScore);
    });
  });

  describe('search with prefixMatch', () => {
    beforeEach(() => {
      // Create a fresh instance for prefix search tests
      trieSearch = new TrieSearch();
      
      // Create properly formed documents
      const docs = [
        { id: 'doc1', fields: { title: 'Test', content: { text: 'This is a test document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc2', fields: { title: 'Testing', content: { text: 'This is a testing document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc3', fields: { title: 'Tester', content: { text: 'This is a tester document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc4', fields: { title: 'Tested', content: { text: 'This is a tested document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc5', fields: { title: 'Another', content: { text: 'This is another document' }, author: 'Author', tags: [], version: '1.0' }}
      ].map(doc => ({
        ...doc,
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: doc.fields.title,
        author: doc.fields.author,
        tags: [],
        version: '1.0'
      })) as IndexedDocument[];
      
      // Add documents properly
      docs.forEach(doc => trieSearch.addDocument(doc));
      
      // Also make sure the terms are indexed directly
      trieSearch.insert('test', 'doc1');
      trieSearch.insert('testing', 'doc2');
      trieSearch.insert('tester', 'doc3');
      trieSearch.insert('tested', 'doc4');
      trieSearch.insert('another', 'doc5');
    });

    test('should find all words with given prefix', () => {
      const results = trieSearch.search('test', { prefixMatch: true });
      
      expect(results.length).toBeGreaterThanOrEqual(4);
      expect(results.some(r => r.docId === 'doc1')).toBe(true);
      expect(results.some(r => r.docId === 'doc2')).toBe(true);
      expect(results.some(r => r.docId === 'doc3')).toBe(true);
      expect(results.some(r => r.docId === 'doc4')).toBe(true);
      expect(results.every(r => r.docId !== 'doc5')).toBe(true);
    });

    test('should return empty array for non-existent prefix', () => {
      const results = trieSearch.search('xyz', { prefixMatch: true });
      
      expect(results.length).toBe(0);
    });
  });

  describe('removeDocument', () => {
    beforeEach(() => {
      // Create a fresh instance for removal tests
      trieSearch = new TrieSearch();
      
      // Create documents
      const doc1 = {
        id: 'doc1',
        fields: { 
          title: 'Test Document', 
          content: { text: 'This is a test document with testing and tested words' }, 
          author: 'Author', 
          tags: [], 
          version: '1.0' 
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: 'Test Document',
        author: 'Author',
        tags: [],
        version: '1.0'
      } as IndexedDocument;
      
      const doc2 = {
        id: 'doc2',
        fields: { 
          title: 'Another Test', 
          content: { text: 'This is another test document' }, 
          author: 'Author', 
          tags: [], 
          version: '1.0' 
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: 'Another Test',
        author: 'Author',
        tags: [],
        version: '1.0'
      } as IndexedDocument;
      
      // Add documents
      trieSearch.addDocument(doc1);
      trieSearch.addDocument(doc2);
      
      // Also insert directly for test compatibility
      trieSearch.insert('test', 'doc1');
      trieSearch.insert('testing', 'doc1');
      trieSearch.insert('tested', 'doc1');
      trieSearch.insert('test', 'doc2');
    });

    test('should remove all references to the document', () => {
      trieSearch.removeDocument('doc1');
      
      const results = trieSearch.search('test', { fuzzy: true });
      
      expect(results.every(r => r.docId !== 'doc1')).toBe(true);
      expect(results.some(r => r.docId === 'doc2')).toBe(true);
    });

    test('should update document counts', () => {
      const initialDocCount = trieSearch['totalDocuments'];
      
      trieSearch.removeDocument('doc1');
      
      // Check that document count was decremented
      expect(trieSearch['totalDocuments']).toBe(initialDocCount - 1);
    });

    test('should handle removal of non-existent document', () => {
      const beforeResults = trieSearch.search('test');
      trieSearch.removeDocument('non-existent');
      const afterResults = trieSearch.search('test');
      
      expect(afterResults.length).toBe(beforeResults.length);
    });
  });

  describe('getSuggestions', () => {
    beforeEach(() => {
      trieSearch.insert('apple', 'doc1');
      trieSearch.insert('application', 'doc2');
      trieSearch.insert('appreciate', 'doc3');
      trieSearch.insert('banana', 'doc4');
      trieSearch.insert('ball', 'doc5');
      trieSearch.insert('cat', 'doc6');
    });

    test('should return suggestions for a prefix', () => {
      const suggestions = trieSearch.getSuggestions('app');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('apple');
      expect(suggestions).toContain('application');
      expect(suggestions).toContain('appreciate');
    });

    test('should respect maxResults parameter', () => {
      const suggestions = trieSearch.getSuggestions('app', 2);
      
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    test('should return empty array for non-existent prefix', () => {
      const suggestions = trieSearch.getSuggestions('xyz');
      
      expect(suggestions.length).toBe(0);
    });

    test('should sort suggestions by score', () => {
      // Insert 'apple' multiple times to increase its score
      for (let i = 0; i < 5; i++) {
        trieSearch.insert('apple', `doc${7+i}`);
      }
      
      const suggestions = trieSearch.getSuggestions('app');
      
      expect(suggestions[0]).toBe('apple');
    });
  });

  describe('clear', () => {
    test('should reset the trie structure', () => {
      // Create a fresh instance
      const localTrie = new TrieSearch();
      
      // Add a document
      const doc = {
        id: 'doc1',
        fields: { 
          title: 'Test Document', 
          content: { text: 'This is a test document' }, 
          author: 'Author', 
          tags: [], 
          version: '1.0' 
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: 'Test Document',
        author: 'Author',
        tags: [],
        version: '1.0'
      } as IndexedDocument;
      
      localTrie.addDocument(doc);
      
      // Verify document was added
      expect(localTrie.search('test').length).toBeGreaterThan(0);
      
      // Clear and verify it's empty
      localTrie.clear();
      expect(localTrie.search('test').length).toBe(0);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      // Create a fresh instance for serialization tests
      trieSearch = new TrieSearch();
      
      // Create properly formed documents
      const docs = [
        { id: 'doc1', fields: { title: 'Test', content: { text: 'This is a test document' }, author: 'Author', tags: [], version: '1.0' }},
        { id: 'doc2', fields: { title: 'Another', content: { text: 'This is another document' }, author: 'Author', tags: [], version: '1.0' }}
      ].map(doc => ({
        ...doc,
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() { 
          return {
            id: this.id,
            title: this.fields.title,
            author: this.fields.author,
            tags: this.fields.tags,
            version: this.fields.version,
            versions: this.versions,
            relations: this.relations
          };
        },
        title: doc.fields.title,
        author: doc.fields.author,
        tags: [],
        version: '1.0'
      })) as IndexedDocument[];
      
      // Add documents properly
      docs.forEach(doc => trieSearch.addDocument(doc));
      
      // Also insert words directly
      trieSearch.insert('test', 'doc1');
      trieSearch.insert('another', 'doc2');
    });

    test('should export state that can be reimported', () => {
      const state = trieSearch.serializeState();
      
      const newTrieSearch = new TrieSearch();
      newTrieSearch.deserializeState(state);
      
      const results = newTrieSearch.search('test');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.docId === 'doc1')).toBe(true);
    });

    test('should handle invalid state during import', () => {
      expect(() => {
        trieSearch.deserializeState(null as unknown as any);
      }).toThrow();
      
      expect(() => {
        trieSearch.deserializeState({} as any);
      }).toThrow();
    });
  });

  describe('serializeState', () => {
    test('should return a serializable object', () => {
      trieSearch.insert('test', 'doc1');
      
      const state = trieSearch.serializeState();
      
      expect(state).toHaveProperty('trie');
      expect(state).toHaveProperty('documents');
      expect(state).toHaveProperty('documentLinks');
      expect(state).toHaveProperty('totalDocuments');
      expect(state).toHaveProperty('maxWordLength');
      
      // Should be serializable
      const serialized = JSON.stringify(state);
      expect(typeof serialized).toBe('string');
    });
  });
});