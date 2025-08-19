// algorithms/__tests__/TrieSearch.test.ts
describe('TrieSearch', () => {
    let trieSearch: TrieSearch;
    
    beforeEach(() => {
        trieSearch = new TrieSearch();
    });
    
    test('should insert and retrieve words', () => {
        trieSearch.insert('test', 'doc1');
        const results = trieSearch.search('test');
        expect(results.length).toBe(1);
        expect(results[0].id).toBe('doc1');
    });
    
    test('should perform fuzzy search', () => {
        trieSearch.insert('test', 'doc1');
        const results = trieSearch.fuzzySearch('testt', 1);
        expect(results.length).toBe(1);
        expect(results[0].id).toBe('doc1');
    });
    
    // Additional tests for edge cases, performance, etc.
});