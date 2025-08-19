import { TrieSearch } from '@/core/algorithms/TrieSearch';
import { TrieNode } from '@/core/algorithms/TrieNode';
import { IndexedDocument } from '@/storage/IndexedDocument';

describe('TrieSearch', () => {
  let trieSearch: TrieSearch;
  
  // Create test documents
  const createTestDocument = (id: string, title: string, content: string): IndexedDocument => {
    return new IndexedDocument(
      id,
      {
        title,
        content: { text: content },
        author: 'Test Author',
        tags: ['test'],
        version: '1.0'
      },
      {
        indexed: Date.now(),
        lastModified: Date.now()
      }
    );
  };
  
  const testDocuments = [
    createTestDocument('doc1', 'JavaScript Programming', 'Learn JavaScript programming for web development'),
    createTestDocument('doc2', 'Python Tutorial', 'A comprehensive Python programming tutorial'),
    createTestDocument('doc3', 'TypeScript Basics', 'Introduction to TypeScript for JavaScript developers')
  ];

  beforeEach(() => {
    trieSearch = new TrieSearch();
  });

  describe('Basic Operations', () => {
    test('should insert and retrieve words', () => {
      trieSearch.insert('javascript', 'doc1');
      trieSearch.insert('python', 'doc2');
      
      const jsResults = trieSearch.search('javascript');
      const pyResults = trieSearch.search('python');
      
      expect(jsResults.length).toBe(1);
      expect(jsResults[0].item).toBe('doc1');
      
      expect(pyResults.length).toBe(1);
      expect(pyResults[0].item).toBe('doc2');
    });

    test('should handle case insensitivity', () => {
      trieSearch.insert('JavaScript', 'doc1');
      
      const results = trieSearch.search('javascript');
      
      expect(results.length).toBe(1);
      expect(results[0].item).toBe('doc1');
    });

    test('should remove documents', () => {
      trieSearch.insert('javascript', 'doc1');
      trieSearch.insert('python', 'doc2');
      
      trieSearch.removeDocument('doc1');
      
      const results = trieSearch.search('javascript');
      expect(results.length).toBe(0);
      
      const pyResults = trieSearch.search('python');
      expect(pyResults.length).toBe(1);
    });

    test('should clear all data', () => {
      trieSearch.insert('javascript', 'doc1');
      trieSearch.insert('python', 'doc2');
      
      trieSearch.clear();
      
      const jsResults = trieSearch.search('javascript');
      const pyResults = trieSearch.search('python');
      
      expect(jsResults.length).toBe(0);
      expect(pyResults.length).toBe(0);
    });
  });

  describe('Document Operations', () => {
    test('should add document and make it searchable', () => {
      trieSearch.addDocument(testDocuments[0]);
      
      const jsResults = trieSearch.search('javascript');
      const webResults = trieSearch.search('web');
      
      expect(jsResults.length).toBe(1);
      expect(webResults.length).toBe(1);
      expect(jsResults[0].item).toBe('doc1');
    });

    test('should handle multiple documents', () => {
      testDocuments.forEach(doc => trieSearch.addDocument(doc));
      
      const programmingResults = trieSearch.search('programming');
      
      expect(programmingResults.length).toBe(2); // Doc1 and Doc2 have "programming"
    });
  });

  describe('Search Features', () => {
    beforeEach(() => {
      testDocuments.forEach(doc => trieSearch.addDocument(doc));
    });

    test('should perform basic search', () => {
      const results = trieSearch.search('javascript');
      
      expect(results.length).toBe(2); // Doc1 and Doc3 have "javascript"
      expect(results.map(r => r.item).sort()).toEqual(['doc1', 'doc3'].sort());
    });

    test('should perform multi-term search', () => {
      const results = trieSearch.search('javascript programming');
      
      expect(results.length).toBe(2); // Doc1 and Doc3 match
    });

    test('should rank results by relevance', () => {
      const results = trieSearch.search('javascript');
      
      // Doc1 has "JavaScript" in title and content, should rank higher
      expect(results[0].item).toBe('doc1');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    test('should perform fuzzy search', () => {
      const results = trieSearch.fuzzySearch('javascritp', 2);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item).toBe('doc1');
    });

    test('should get autocomplete suggestions', () => {
      const suggestions = trieSearch.getSuggestions('java');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('java');
    });
  });

  describe('Serialization', () => {
    test('should serialize and deserialize state', () => {
      testDocuments.forEach(doc => trieSearch.addDocument(doc));
      
      const state = trieSearch.serializeState();
      
      const newTrieSearch = new TrieSearch();
      newTrieSearch.deserializeState(state);
      
      const results = newTrieSearch.search('javascript');
      
      expect(results.length).toBe(2);
      expect(results.map(r => r.item).sort()).toEqual(['doc1', 'doc3'].sort());
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty queries', () => {
      testDocuments.forEach(doc => trieSearch.addDocument(doc));
      
      const results = trieSearch.search('');
      
      expect(results.length).toBe(0);
    });

    test('should handle special characters', () => {
      trieSearch.insert('c++', 'doc4');
      trieSearch.insert('node.js', 'doc5');
      
      const cppResults = trieSearch.search('c++');
      const nodeResults = trieSearch.search('node.js');
      
      expect(cppResults.length).toBe(1);
      expect(nodeResults.length).toBe(1);
    });

    test('should handle very long words', () => {
      const longWord = 'pneumonoultramicroscopicsilicovolcanoconiosis';
      trieSearch.insert(longWord, 'doc6');
      
      const results = trieSearch.search(longWord);
      
      expect(results.length).toBe(1);
      expect(results[0].item).toBe('doc6');
    });
  });
});