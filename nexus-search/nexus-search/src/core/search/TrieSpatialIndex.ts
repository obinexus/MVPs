import { TrieNode } from "./TrieNode";
import { 
    IndexedDocument, 
    SearchOptions, 
    SearchResult,
    SpatialRegion,
    SpatialPoint,
    SpatialDimension
} from "@/core/types";

/**
 * TrieSpatialIndex extends the standard trie structure to support
 * spatial/dimensional search capabilities in addition to text search.
 * 
 * This allows for queries that combine text matching with spatial constraints,
 * such as finding documents within a geographic region, conceptual space,
 * or any multi-dimensional attribute space.
 */
export class TrieSpatialIndex {
    private root: TrieNode;
    private dimensions: number;
    private dimensionMap: Map<string, Map<string, SpatialPoint>>;
    private documents: Map<string, IndexedDocument>;
    private spatialIndex: Map<string, Map<string, number[]>>;
    private maxWordLength: number;

    /**
     * Creates a new TrieSpatialIndex
     * @param dimensions Number of spatial dimensions to support (default: 3)
     * @param maxWordLength Maximum word length to index (default: 50)
     */
    constructor(dimensions: number = 3, maxWordLength: number = 50) {
        this.root = new TrieNode();
        this.dimensions = dimensions;
        this.dimensionMap = new Map();
        this.documents = new Map();
        this.spatialIndex = new Map();
        this.maxWordLength = maxWordLength;
        
        // Initialize dimension maps
        for (let i = 0; i < dimensions; i++) {
            this.dimensionMap.set(`dim_${i}`, new Map());
        }
    }

    /**
     * Initialize or reset the index
     */
    public initialize(): void {
        this.root = new TrieNode();
        this.dimensionMap.clear();
        this.documents.clear();
        this.spatialIndex.clear();
        
        // Reinitialize dimension maps
        for (let i = 0; i < this.dimensions; i++) {
            this.dimensionMap.set(`dim_${i}`, new Map());
        }
    }

    /**
     * Get the root node of the trie
     * @returns Root TrieNode
     */
    public getRoot(): TrieNode {
        return this.root;
    }

    /**
     * Insert a token into the trie with dimensional metadata
     * @param token Text token to insert
     * @param docId Document ID
     * @param field Field name (used for dimensional mapping)
     * @param coordinates Optional spatial coordinates for this token
     */
    public insert(
        token: string, 
        docId: string, 
        field: string, 
        coordinates?: number[]
    ): void {
        if (!token || token.length > this.maxWordLength) return;
        
        let current = this.root;
        
        // Traverse/create path in trie
        for (const char of token) {
            if (!current.hasChild(char)) {
                current = current.addChild(char);
            } else {
                current = current.getChild(char)!;
            }
            
            // Update node statistics
            current.incrementWeight();
            current.prefixCount++;
        }
        
        // Mark end of word and associate document
        current.isEndOfWord = true;
        current.documentRefs.add(docId);
        
        // Store dimensional metadata if provided
        if (coordinates && coordinates.length === this.dimensions) {
            this.setDimensionalData(docId, field, token, coordinates);
        }
    }

    /**
     * Add a document with spatial coordinates to the index
     * @param document Document to add
     * @param coordinates Spatial coordinates for each dimension
     */
    public addDocument(
        document: IndexedDocument, 
        coordinates?: Record<string, number[]>
    ): void {
        if (!document || !document.id) return;
        
        // Store document
        this.documents.set(document.id, document);
        
        // Index text content
        Object.entries(document.fields).forEach(([field, value]) => {
            if (typeof value === 'string') {
                // Split and index each word
                const words = this.tokenize(value);
                words.forEach(word => {
                    // Pass field-specific coordinates if available
                    const fieldCoords = coordinates?.[field];
                    this.insert(word, document.id, field, fieldCoords);
                });
            }
        });
        
        // Store spatial coordinates globally for the document
        if (coordinates) {
            Object.entries(coordinates).forEach(([field, coords]) => {
                if (!this.spatialIndex.has(document.id)) {
                    this.spatialIndex.set(document.id, new Map());
                }
                this.spatialIndex.get(document.id)?.set(field, coords);
            });
        }
    }

    /**
     * Remove a document from the index
     * @param docId Document ID to remove
     */
    public removeDocument(docId: string): void {
        // Remove from documents map
        this.documents.delete(docId);
        
        // Remove from spatial index
        this.spatialIndex.delete(docId);
        
        // Remove references from trie
        this.removeDocumentRefs(this.root, docId);
        
        // Remove from dimension maps
        for (const dimensionMap of this.dimensionMap.values()) {
            for (const [token, pointMap] of dimensionMap.entries()) {
                pointMap.delete(docId);
                if (pointMap.size === 0) {
                    dimensionMap.delete(token);
                }
            }
        }
        
        // Prune empty nodes
        this.pruneEmptyNodes(this.root);
    }

    /**
     * Search for documents with combined text and spatial constraints
     * @param query Text query
     * @param region Optional spatial region constraint
     * @param options Search options
     * @returns Array of search results with spatial relevance
     */
    public search(
        query: string, 
        region?: SpatialRegion,
        options: SearchOptions = {}
    ): SearchResult<string>[] {
        const {
            fuzzy = false,
            maxDistance = 2,
            maxResults = 10,
            minScore = 0.1
        } = options;
        
        // First perform text search
        const textResults = this.performTextSearch(query, fuzzy, maxDistance);
        
        // If no spatial constraint, return text results
        if (!region) {
            return textResults
                .filter(result => result.score >= minScore)
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults);
        }
        
        // Apply spatial constraints
        const spatialResults = this.applySpatialConstraints(textResults, region);
        
        // Sort by combined score and limit results
        return spatialResults
            .filter(result => result.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Perform spatial-only search within a region
     * @param region Spatial region to search within
     * @param maxResults Maximum number of results
     * @returns Array of documents within the region
     */
    public spatialSearch(
        region: SpatialRegion,
        maxResults: number = 10
    ): IndexedDocument[] {
        const results: IndexedDocument[] = [];
        const seenDocs = new Set<string>();
        
        // Check each document's spatial coordinates against the region
        for (const [docId, fieldMap] of this.spatialIndex.entries()) {
            for (const [field, coordinates] of fieldMap.entries()) {
                if (this.isPointInRegion(coordinates, region)) {
                    const document = this.documents.get(docId);
                    if (document && !seenDocs.has(docId)) {
                        results.push(document);
                        seenDocs.add(docId);
                        
                        if (results.length >= maxResults) {
                            return results;
                        }
                    }
                }
            }
        }
        
        return results;
    }

    /**
     * Find the nearest neighbors to a point in the spatial index
     * @param point Reference point
     * @param k Number of neighbors to find
     * @param dimension Optional dimension to search in (defaults to all)
     * @returns Array of nearest documents and their distances
     */
    public findNearestNeighbors(
        point: number[],
        k: number = 5,
        dimension?: string
    ): Array<{ document: IndexedDocument; distance: number }> {
        const distances: Array<{ docId: string; distance: number }> = [];
        
        // Calculate distances for each document
        for (const [docId, fieldMap] of this.spatialIndex.entries()) {
            // If dimension is specified, only check that dimension
            if (dimension && fieldMap.has(dimension)) {
                const coordinates = fieldMap.get(dimension);
                if (coordinates) {
                    const distance = this.calculateEuclideanDistance(coordinates, point);
                    distances.push({ docId, distance });
                }
            } 
            // Otherwise check all dimensions
            else if (!dimension) {
                for (const coordinates of fieldMap.values()) {
                    const distance = this.calculateEuclideanDistance(coordinates, point);
                    distances.push({ docId, distance });
                    break; // Just use the first available coordinate set
                }
            }
        }
        
        // Sort by distance and get k nearest
        return distances
            .sort((a, b) => a.distance - b.distance)
            .slice(0, k)
            .map(({ docId, distance }) => {
                const document = this.documents.get(docId);
                if (!document) {
                    throw new Error(`Document ${docId} not found in index`);
                }
                return { document, distance };
            });
    }

    /**
     * Export the spatial index state for serialization
     */
    public exportState(): unknown {
        return {
            dimensions: this.dimensions,
            maxWordLength: this.maxWordLength,
            root: this.serializeTrie(this.root),
            documents: Array.from(this.documents.entries()),
            spatialIndex: this.serializeSpatialIndex(),
            dimensionMap: this.serializeDimensionMap()
        };
    }

    /**
     * Import a previously serialized state
     * @param state Serialized state
     */
    public importState(state: unknown): void {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state data');
        }

        const typedState = state as {
            dimensions: number;
            maxWordLength: number;
            root: unknown;
            documents: [string, IndexedDocument][];
            spatialIndex: [string, [string, number[]][]][];
            dimensionMap: [string, [string, [string, number[]][]][]][];
        };

        this.dimensions = typedState.dimensions || 3;
        this.maxWordLength = typedState.maxWordLength || 50;
        
        // Deserialize trie
        this.root = this.deserializeTrie(typedState.root as any);
        
        // Deserialize documents
        this.documents = new Map(typedState.documents || []);
        
        // Deserialize spatial index
        this.spatialIndex = new Map();
        for (const [docId, fieldEntries] of typedState.spatialIndex || []) {
            const fieldMap = new Map<string, number[]>();
            for (const [field, coords] of fieldEntries) {
                fieldMap.set(field, coords);
            }
            this.spatialIndex.set(docId, fieldMap);
        }
        
        // Deserialize dimension map
        this.dimensionMap = new Map();
        for (const [dimension, tokenEntries] of typedState.dimensionMap || []) {
            const tokenMap = new Map<string, Map<string, SpatialPoint>>();
            for (const [token, docEntries] of tokenEntries) {
                const docMap = new Map<string, SpatialPoint>();
                for (const [docId, coords] of docEntries) {
                    docMap.set(docId, { coordinates: coords });
                }
                tokenMap.set(token, docMap);
            }
            this.dimensionMap.set(dimension, tokenMap);
        }
    }

    /**
     * Clear the index and all its data
     */
    public clear(): void {
        this.initialize();
    }

    // PRIVATE METHODS

    /**
     * Set dimensional data for a document token
     */
    private setDimensionalData(
        docId: string, 
        field: string, 
        token: string, 
        coordinates: number[]
    ): void {
        // Store in dimension map for each dimension
        for (let i = 0; i < Math.min(coordinates.length, this.dimensions); i++) {
            const dimensionKey = `dim_${i}`;
            const dimensionMap = this.dimensionMap.get(dimensionKey);
            
            if (dimensionMap) {
                if (!dimensionMap.has(token)) {
                    dimensionMap.set(token, new Map());
                }
                
                const tokenMap = dimensionMap.get(token);
                if (tokenMap) {
                    tokenMap.set(docId, {
                        coordinates,
                        field
                    });
                }
            }
        }
        
        // Store in global spatial index
        if (!this.spatialIndex.has(docId)) {
            this.spatialIndex.set(docId, new Map());
        }
        
        const docSpatialMap = this.spatialIndex.get(docId);
        if (docSpatialMap) {
            docSpatialMap.set(field, coordinates);
        }
    }

    /**
     * Perform text search component
     */
    private performTextSearch(
        query: string,
        fuzzy: boolean,
        maxDistance: number
    ): SearchResult<string>[] {
        const words = this.tokenize(query);
        if (words.length === 0) return [];
        
        const results = new Map<string, SearchResult<string>>();
        
        words.forEach(word => {
            let matches: SearchResult<string>[] = [];
            
            if (fuzzy) {
                matches = this.fuzzySearch(word, maxDistance);
            } else {
                matches = this.exactSearch(word);
            }
            
            matches.forEach(match => {
                const existing = results.get(match.docId);
                if (!existing || existing.score < match.score) {
                    results.set(match.docId, match);
                }
            });
        });
        
        return Array.from(results.values());
    }

    /**
     * Perform exact text search
     */
    private exactSearch(word: string): SearchResult<string>[] {
        const results: SearchResult<string>[] = [];
        let current = this.root;

        // Navigate to the node for this word
        for (const char of word) {
            if (!current.hasChild(char)) {
                return results;
            }
            const child = current.getChild(char);
            if (!child) return [];
            current = child;
        }

        // If we found a complete word, get all documents associated with it
        if (current.isEndOfWord) {
            current.documentRefs.forEach(docId => {
                const doc = this.documents.get(docId);
                if (doc) {
                    results.push({
                        docId,
                        score: this.calculateScore(current, word),
                        term: word,
                        id: docId,
                        document: doc,
                        item: docId,
                        matches: [word]
                    });
                }
            });
        }

        return results;
    }

    /**
     * Perform fuzzy search with tolerance for typos
     */
    private fuzzySearch(
        word: string, 
        maxDistance: number = 2
    ): SearchResult<string>[] {
        const results: SearchResult<string>[] = [];
        
        const searchState = {
            word,
            maxDistance,
            results
        };

        this.fuzzySearchRecursive(this.root, "", 0, 0, searchState);
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Recursive implementation of fuzzy search
     */
    private fuzzySearchRecursive(
        node: TrieNode, 
        current: string,
        currentDistance: number,
        depth: number,
        state: { word: string; maxDistance: number; results: SearchResult<string>[] }
    ): void {
        if (currentDistance > state.maxDistance) return;

        if (node.isEndOfWord) {
            const distance = this.calculateLevenshteinDistance(state.word, current);
            if (distance <= state.maxDistance) {
                node.documentRefs.forEach(docId => {
                    const doc = this.documents.get(docId);
                    if (doc) {
                        state.results.push({
                            docId,
                            score: this.calculateFuzzyScore(node, current, distance),
                            term: current,
                            distance,
                            id: docId,
                            document: doc,
                            item: docId,
                            matches: [current]
                        });
                    }
                });
            }
        }

        // Try all possible edit operations
        node.children.forEach((child, char) => {
            // Substitution
            const substitutionCost = char !== state.word[depth] ? 1 : 0;
            this.fuzzySearchRecursive(
                child, 
                current + char, 
                currentDistance + substitutionCost,
                depth + 1,
                state
            );

            // Insertion
            this.fuzzySearchRecursive(
                child,
                current + char,
                currentDistance + 1,
                depth,
                state
            );

            // Deletion
            if (depth < state.word.length) {
                this.fuzzySearchRecursive(
                    node,
                    current,
                    currentDistance + 1,
                    depth + 1,
                    state
                );
            }
        });
    }

    /**
     * Apply spatial constraints to text search results
     */
    private applySpatialConstraints(
        results: SearchResult<string>[],
        region: SpatialRegion
    ): SearchResult<string>[] {
        return results.map(result => {
            const docId = result.docId;
            const spatialScore = this.calculateSpatialScore(docId, region);
            
            // If document is not in region, spatial score is 0
            if (spatialScore === 0) {
                return {
                    ...result,
                    score: 0 // Will be filtered out by minimum score
                };
            }
            
            // Combine text and spatial scores
            // Weighted average: 70% text, 30% spatial
            const combinedScore = (result.score * 0.7) + (spatialScore * 0.3);
            
            return {
                ...result,
                score: combinedScore,
                spatialScore
            };
        });
    }

    /**
     * Calculate spatial score based on position in region
     * Higher score for points closer to center of region
     */
    private calculateSpatialScore(docId: string, region: SpatialRegion): number {
        // Check if document has spatial data
        const spatialData = this.spatialIndex.get(docId);
        if (!spatialData) return 0;
        
        let highestScore = 0;
        
        // Check all field coordinates for this document
        for (const coordinates of spatialData.values()) {
            if (this.isPointInRegion(coordinates, region)) {
                // Calculate how central the point is in the region (0-1)
                const centralityScore = this.calculateCentrality(coordinates, region);
                highestScore = Math.max(highestScore, centralityScore);
            }
        }
        
        return highestScore;
    }

    /**
     * Check if a point is within a spatial region
     */
    private isPointInRegion(point: number[], region: SpatialRegion): boolean {
        // For each dimension, check if point is within region bounds
        for (let i = 0; i < Math.min(point.length, region.bounds.length); i++) {
            const coord = point[i];
            const [min, max] = region.bounds[i];
            
            if (coord < min || coord > max) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Calculate how central a point is within a region (0-1)
     * 1.0 = at exact center, 0.0 = at boundary
     */
    private calculateCentrality(point: number[], region: SpatialRegion): number {
        let totalDistance = 0;
        let maxPossibleDistance = 0;
        
        // Calculate center point of region
        const center = region.bounds.map(([min, max]) => (min + max) / 2);
        
        // Calculate normalized distance to center
        for (let i = 0; i < Math.min(point.length, region.bounds.length); i++) {
            const [min, max] = region.bounds[i];
            const range = max - min;
            maxPossibleDistance += Math.pow(range / 2, 2);
            
            const distanceToCenter = Math.abs(point[i] - center[i]);
            totalDistance += Math.pow(distanceToCenter, 2);
        }
        
        // Normalize and invert so closer points have higher score
        if (maxPossibleDistance === 0) return 1.0;
        const normalizedDistance = Math.sqrt(totalDistance) / Math.sqrt(maxPossibleDistance);
        return 1.0 - normalizedDistance;
    }

    /**
     * Calculate Euclidean distance between two points
     */
    private calculateEuclideanDistance(point1: number[], point2: number[]): number {
        let sumOfSquares = 0;
        const dimensions = Math.min(point1.length, point2.length);
        
        for (let i = 0; i < dimensions; i++) {
            sumOfSquares += Math.pow(point1[i] - point2[i], 2);
        }
        
        return Math.sqrt(sumOfSquares);
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private calculateLevenshteinDistance(s1: string, s2: string): number {
        if (!s1 || !s2) return Math.max(s1.length, s2.length);
        
        // Dynamic programming approach
        const dp: number[][] = Array(s1.length + 1).fill(0)
            .map(() => Array(s2.length + 1).fill(0));
        
        for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
        for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
        
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                const substitutionCost = s1[i - 1] !== s2[j - 1] ? 1 : 0;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + substitutionCost
                );
            }
        }
        
        return dp[s1.length][s2.length];
    }

    /**
     * Calculate score for a node match
     */
    private calculateScore(node: TrieNode, term: string): number {
        const totalDocuments = this.documents.size;
        if (totalDocuments === 0 || node.documentRefs.size === 0) {
            return node.getWeight();
        }
        
        // TF-IDF calculation
        const tfIdf = (node.frequency / Math.max(1, totalDocuments)) * 
                     Math.log(totalDocuments / Math.max(1, node.documentRefs.size));
        
        const positionBoost = 1 / (node.depth + 1);
        const lengthNorm = 1 / Math.sqrt(Math.max(1, term.length));

        return node.getScore() * tfIdf * positionBoost * lengthNorm;
    }

    /**
     * Calculate score for fuzzy matches
     */
    private calculateFuzzyScore(node: TrieNode, term: string, distance: number): number {
        const exactScore = this.calculateScore(node, term);
        return exactScore * Math.exp(-Math.max(0.001, distance));
    }

    /**
     * Split text into tokens
     */
    private tokenize(text: string): string[] {
        if (!text) return [];
        
        return text.toLowerCase()
            .split(/[\s,.!?;:'"()[\]{}/\\]+/)
            .filter(word => word.length > 0);
    }

    /**
     * Remove document references from trie
     */
    private removeDocumentRefs(node: TrieNode, documentId: string): void {
        if (node.documentRefs.has(documentId)) {
            node.documentRefs.delete(documentId);
            node.decrementWeight();
            node.prefixCount = Math.max(0, node.prefixCount - 1);
        }
        
        node.children.forEach(child => {
            this.removeDocumentRefs(child, documentId);
        });
    }

    /**
     * Prune empty nodes to save memory
     */
    private pruneEmptyNodes(node: TrieNode): boolean {
        node.children.forEach((child, char) => {
            if (this.pruneEmptyNodes(child)) {
                node.children.delete(char);
            }
        });
        
        return node.shouldPrune();
    }

    /**
     * Serialize the trie structure
     */
    private serializeTrie(node: TrieNode): unknown {
        const serializedNode = {
            prefixCount: node.prefixCount,
            isEndOfWord: node.isEndOfWord,
            documentRefs: Array.from(node.documentRefs),
            weight: node.getWeight(),
            children: {} as Record<string, unknown>
        };
        
        node.children.forEach((child, char) => {
            serializedNode.children[char] = this.serializeTrie(child);
        });
        
        return serializedNode;
    }

    /**
     * Deserialize a trie structure
     */
    private deserializeTrie(data: { 
        prefixCount: number; 
        isEndOfWord: boolean; 
        documentRefs: string[]; 
        children: Record<string, unknown>;
        weight?: number;
    }): TrieNode {
        const node = new TrieNode();
        node.prefixCount = data.prefixCount || 0;
        node.isEndOfWord = data.isEndOfWord || false;
        node.documentRefs = new Set(data.documentRefs || []);
        
        if (typeof data.weight === 'number' && data.weight > 0) {
            const times = Math.ceil(data.weight);
            for (let i = 0; i < times; i++) {
                node.incrementWeight(i === times - 1 ? data.weight % 1 || 1 : 1);
            }
        }
        
        for (const char in data.children) {
            if (Object.prototype.hasOwnProperty.call(data.children, char)) {
                node.children.set(char, this.deserializeTrie(data.children[char] as any));
            }
        }
        
        return node;
    }

    /**
     * Serialize the spatial index
     */
    private serializeSpatialIndex(): [string, [string, number[]][]][] {
        const serialized: [string, [string, number[]][]][] = [];
        
        for (const [docId, fieldMap] of this.spatialIndex.entries()) {
            const fieldEntries: [string, number[]][] = [];
            
            for (const [field, coords] of fieldMap.entries()) {
                fieldEntries.push([field, coords]);
            }
            
            serialized.push([docId, fieldEntries]);
        }
        
        return serialized;
    }

    /**
     * Serialize the dimension map
     */
    private serializeDimensionMap(): [string, [string, [string, number[]][]][]][] {
        const serialized: [string, [string, [string, number[]][]][]][] = [];
        
        for (const [dimension, tokenMap] of this.dimensionMap.entries()) {
            const tokenEntries: [string, [string, number[]][]][] = [];
            
            for (const [token, docMap] of tokenMap.entries()) {
                const docEntries: [string, number[]][] = [];
                
                for (const [docId, point] of docMap.entries()) {
                    docEntries.push([docId, point.coordinates]);
                }
                
                tokenEntries.push([token, docEntries]);
            }
            
            serialized.push([dimension, tokenEntries]);
        }
        
        return serialized;
    }
}