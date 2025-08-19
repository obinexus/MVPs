import { TrieNode } from '@/core/types';

export class PruningUtils {
  private readonly pruningThreshold: number;
  
  constructor(pruningThreshold: number = 0) {
    this.pruningThreshold = pruningThreshold;
  }
  
  /**
   * Generic node pruning algorithm for any tree-like structure
   */
  static pruneNode<T>(
    node: { children: Map<string, T> },
    shouldPruneFn: (node: T) => boolean
  ): boolean {
    let shouldPruneThis = true;
    
    // Make a copy of entries to avoid modification during iteration
    const entries = Array.from(node.children.entries());
    
    for (const [char, child] of entries) {
      if (this.pruneNode(child as unknown as { children: Map<string, T> }, shouldPruneFn)) {
        node.children.delete(char);
      } else {
        shouldPruneThis = false;
      }
    }
    
    return shouldPruneThis && shouldPruneFn(node as unknown as T);
  }
  
  /**
   * Prunes a Trie structure based on document frequency
   */
  static pruneTrieByFrequency(
    root: TrieNode,
    minFrequency: number
  ): void {
    this.pruneNode<TrieNode>(
      root,
      (node) => node.frequency < minFrequency && node.documentRefs.size === 0
    );
  }
  
  /**
   * Prunes a Trie by weight threshold
   */
  static pruneTrieByWeight(
    root: TrieNode,
    minWeight: number
  ): void {
    this.pruneNode<TrieNode>(
      root,
      (node) => node.getWeight() < minWeight && node.documentRefs.size === 0
    );
  }
  
  /**
   * Prunes a Trie by recency
   */
  static pruneTrieByRecency(
    root: TrieNode,
    maxAgeMs: number
  ): void {
    const cutoffTime = Date.now() - maxAgeMs;
    this.pruneNode<TrieNode>(
      root,
      (node) => node.lastAccessed < cutoffTime && node.documentRefs.size === 0
    );
  }
  
  /**
   * Instance method for customized pruning
   */
  pruneWithThreshold(
    root: TrieNode,
    evaluationFn: (node: TrieNode) => number
  ): void {
    PruningUtils.pruneNode<TrieNode>(
      root,
      (node) => evaluationFn(node) < this.pruningThreshold && node.documentRefs.size === 0
    );
  }
}