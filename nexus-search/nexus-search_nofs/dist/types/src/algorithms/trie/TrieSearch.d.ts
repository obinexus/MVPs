import { IndexedDocument, SearchOptions, SearchResult } from "@/types";
export declare class TrieSearch {
    private root;
    private documents;
    private documentLinks;
    private totalDocuments;
    private maxWordLength;
    constructor(maxWordLength?: number);
    /**
     * Insert a word into the trie with document reference
     */
    insert(word: string, id: string): void;
    /**
     * Remove a document and all its references
     */
    removeData(id: string): void;
    /**
     * Add a document to the search index
     */
    addDocument(document: IndexedDocument): void;
    /**
     * Search for a single term
     */
    searchWord(term: string): SearchResult<string>[];
    /**
     * Perform search with various options
     */
    search(query: string, options?: SearchOptions): SearchResult<string>[];
    /**
     * Export trie state for serialization (legacy method)
     */
    exportState(): unknown;
    /**
     * Serialize trie state
     */
    serializeState(): unknown;
    /**
     * Deserialize trie state
     */
    deserializeState(state: unknown): void;
    /**
     * Add document data
     *
     * Creates a new document with provided content and adds it to the search index
     *
     * @param documentId Document ID
     * @param content Text content for the document
     * @param document Base document with other metadata
     */
    addData(documentId: string, content: string, document: IndexedDocument): void;
    /**
     * Perform fuzzy search with edit distance
     */
    fuzzySearch(word: string, maxDistance: number): SearchResult<string>[];
    /**
     * Remove a document from the index
     */
    removeDocument(documentId: string): void;
    /**
     * Get autocomplete suggestions for a prefix
     */
    getSuggestions(prefix: string, maxResults?: number): string[];
    /**
     * Clear the trie and all its data
     */
    clear(): void;
    /*** PRIVATE METHODS ***/
    private indexText;
    private insertWord;
    private exactSearch;
    private prefixSearch;
    private collectWords;
    private fuzzySearchRecursive;
    private calculateScore;
    private calculateFuzzyScore;
    private calculateLevenshteinDistance;
    private tokenize;
    private removeDocumentRefs;
    private pruneEmptyNodes;
    private collectSuggestions;
    private serializeTrie;
    private deserializeTrie;
}
