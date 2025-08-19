import { TrieSpatialIndex } from '../algorithms/TrieSpatialIndex';
import { 
  CursorPosition, 
  SearchSpace, 
  CursorOptions, 
  SearchSpaceBounds 
} from '../telemetry/TelemetryTypes';
import { SearchResult } from '../types';
import { TrieNode } from '../algorithms/TrieNode';

export class SearchCursor {
  private index: TrieSpatialIndex;
  private currentPosition: CursorPosition;
  private searchSpace: SearchSpace;
  private algorithm: 'bfs' | 'dfs';
  private regexEnabled: boolean;
  
  constructor(index: TrieSpatialIndex, options: CursorOptions = {}) {
    this.index = index;
    this.algorithm = options.algorithm || 'bfs';
    this.regexEnabled = options.regexEnabled || false;
    this.searchSpace = this.initializeSearchSpace(options.initialSpace);
    this.currentPosition = { depth: 0, breadth: 0, dimension: 0 };
  }
  
  setAlgorithm(algorithm: 'bfs' | 'dfs'): void {
    this.algorithm = algorithm;
  }
  
  setRegexEnabled(enabled: boolean): void {
    this.regexEnabled = enabled;
  }
  
  search(query: string): SearchResult[] {
    // Select appropriate algorithm based on settings
    if (this.regexEnabled) {
      return this.searchWithRegex(query);
    }
    
    return this.algorithm === 'bfs' 
      ? this.searchBFS(query) 
      : this.searchDFS(query);
  }
  
  limitSearchSpace(bounds: SearchSpaceBounds): void {
    this.searchSpace = {
      ...this.searchSpace,
      bounds
    };
  }
  
  resetSearchSpace(): void {
    this.searchSpace = this.initializeSearchSpace();
  }
  
  private initializeSearchSpace(initial?: SearchSpace): SearchSpace {
    return {
      maxDepth: initial?.maxDepth || 100,
      maxBreadth: initial?.maxBreadth || 1000,
      dimensions: initial?.dimensions || 3,
      maxResults: initial?.maxResults || 100,
      bounds: initial?.bounds || {
        min: [0, 0, 0],
        max: [100, 100, 100]
      }
    };
  }
  
  private createBoundedSearchSpace(bounds: SearchSpaceBounds): SearchSpace {
    return {
      ...this.searchSpace,
      bounds
    };
  }
  
  private searchBFS(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queue: TrieNode[] = [this.index.getRoot()];
    const visited = new Set<string>();
    
    while (queue.length > 0 && results.length < this.searchSpace.maxResults) {
      const node = queue.shift();
      if (!node) break;
      
      // Skip if outside search space bounds
      if (!this.isWithinSearchSpace(node)) continue;
      
      // Process current node
      if (this.matchesQuery(node, query)) {
        results.push(this.createSearchResult(node, query));
      }
      
      // Enqueue children (breadth-first)
      for (const child of this.getNodeChildren(node)) {
        const nodeId = this.getNodeId(child);
        if (!visited.has(nodeId)) {
          visited.add(nodeId);
          queue.push(child);
        }
      }
    }
    
    return results;
  }
  
  private searchDFS(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const visited = new Set<string>();
    
    const dfs = (node: TrieNode, depth: number): void => {
      if (results.length >= this.searchSpace.maxResults) return;
      if (depth > this.searchSpace.maxDepth) return;
      if (!this.isWithinSearchSpace(node)) return;
      
      const nodeId = this.getNodeId(node);
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Process current node
      if (this.matchesQuery(node, query)) {
        results.push(this.createSearchResult(node, query));
      }
      
      // Visit children (depth-first)
      for (const child of this.getNodeChildren(node)) {
        dfs(child, depth + 1);
      }
    };
    
    dfs(this.index.getRoot(), 0);
    return results;
  }
  
  private searchWithRegex(pattern: string): SearchResult[] {
    const results: SearchResult[] = [];
    const regex = new RegExp(pattern);
    
    // Use DFS for regex search as it's typically more efficient for this use case
    const visited = new Set<string>();
    const stack: Array<{ node: TrieNode; path: string }> = [
      { node: this.index.getRoot(), path: '' }
    ];
    
    while (stack.length > 0 && results.length < this.searchSpace.maxResults) {
      const { node, path } = stack.pop()!;
      
      // Skip if outside search space
      if (!this.isWithinSearchSpace(node)) continue;
      
      const nodeId = this.getNodeId(node);
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // Check if path matches regex
      if (path && regex.test(path) && node.isEndOfWord) {
        for (const docId of node.documentRefs) {
          results.push({
            id: docId,
            docId,
            score: node.getScore(),
            matches: [path],
            term: pattern
          });
        }
      }
      
      // Add children to stack
      for (const [char, child] of node.children.entries()) {
        stack.push({
          node: child,
          path: path + char
        });
      }
    }
    
    return results;
  }
  
  private isWithinSearchSpace(node: TrieNode): boolean {
    // This is a simplified version - a real implementation would use actual
    // spatial coordinates stored in the node
    return node.depth <= this.searchSpace.maxDepth;
  }
  
  private matchesQuery(node: TrieNode, query: string): boolean {
    return node.isEndOfWord && node.documentRefs.size > 0;
  }
  
  private getNodeChildren(node: TrieNode): TrieNode[] {
    return Array.from(node.children.values());
  }
  
  private getNodeId(node: TrieNode): string {
    // We'd ideally have a unique node ID, but we can use some properties as a heuristic
    return `${node.depth}_${node.lastAccessed}_${node.prefixCount}`;
  }
  
  private createSearchResult(node: TrieNode, query: string): SearchResult {
    // In a real implementation, we'd have access to the document data
    // and would populate this more completely
    const docId = Array.from(node.documentRefs)[0];
    return {
      id: docId,
      docId,
      score: node.getScore(),
      matches: [query],
      term: query
    };
  }
}
