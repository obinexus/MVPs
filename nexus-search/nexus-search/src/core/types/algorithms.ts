// src/types/algorithms.ts
// Algorithm-related type definitions for NexusSearch

import { RegexSearchResult } from './search';

/**
 * Trie node interface with generic value type
 */
export interface TrieNode<T = unknown> {
  children: Map<string, TrieNode<T>>;
  isEndOfWord: boolean;
  documentRefs: Set<string>;
  weight: number;
  frequency: number;
  lastAccessed: number;
  prefixCount: number;
  depth: number;
  value: T;
  
  addChild(char: string): TrieNode<T>;
  getChild(char: string): TrieNode<T> | undefined;
  hasChild(char: string): boolean;
  incrementWeight(value?: number): void;
  decrementWeight(value?: number): void;
  clearChildren(): void;
  shouldPrune(): boolean;
  getScore(): number;
  getWeight(): number;
}

/**
 * Options for trie search operations
 */
export interface TrieSearchOptions {
  caseSensitive?: boolean;
  fuzzy?: boolean;
  maxDistance?: number;
  prefixMatch?: boolean;
  algorithm?: 'bfs' | 'dfs';
  timeout?: number;
}

/**
 * Benchmark result for algorithm performance testing
 */
export interface BenchmarkResult {
  algorithm: string;
  avgTime: number;
  maxTime: number;
  minTime: number;
  resultsCount: number;
  memoryUsage?: number;
}

/**
 * Timing record for performance monitoring
 */
export interface TimingRecord {
  count: number;
  totalTime: number;
  maxTime: number;
  minTime: number;
  avgTime: number;
}

/**
 * Result of a fuzzy match operation
 */
export interface FuzzyMatchResult {
  term: string;
  distance: number;
  similarity: number;
}

/**
 * Interface for algorithm traversal functions
 */
export interface TraversalFunction {
  (
    root: unknown,
    query: string,
    maxResults?: number,
    config?: unknown
  ): RegexSearchResult[];
}

/**
 * Options for BFS/DFS traversal algorithms
 */
export interface TraversalOptions {
  maxDepth?: number;
  timeoutMs?: number;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  earlyTermination?: boolean;
  heuristic?: (node: unknown) => number;
}

/**
 * Utility methods for algorithms
 */
export interface AlgorithmUtils {
  calculateLevenshteinDistance(s1: string, s2: string): number;
  isPotentialFuzzyMatch(target: string, candidate: string, maxDistance: number): boolean;
  fuzzyMatch(term: string, candidates: string[], maxDistance?: number): FuzzyMatchResult[];
}

/**
 * Pruning configuration for tree structures
 */
export interface PruningConfig {
  minFrequency?: number;
  minWeight?: number;
  maxAge?: number;
  maxDepth?: number;
  customEvaluator?: (node: unknown) => boolean;
}

/**
 * Document graph for link analysis
 */
export interface DocumentGraph {
  nodes: Map<string, unknown>;
  edges: Map<string, Array<{ target: string; weight: number }>>;
  addNode(id: string, data: unknown): void;
  addEdge(source: string, target: string, weight?: number): void;
  getNeighbors(id: string): string[];
  calculatePageRank(iterations?: number, dampingFactor?: number): Map<string, number>;
}

/**
 * Index statistics
 */
export interface IndexStats {
  nodeCount: number;
  wordCount: number;
  maxDepth: number;
  averageBranchingFactor: number;
  documentCount: number;
  memoryUsage: number;
}

/**
 * Levenshtein distance options
 */
export interface LevenshteinOptions {
  insertCost?: number;
  deleteCost?: number;
  substituteCost?: number;
  transposeCost?: number;
  maxDistance?: number;
}

/**
 * Result of a path finding operation in the trie
 */
export interface PathResult {
  path: string[];
  score: number;
  documentIds: string[];
  depth: number;
}

/**
 * Options for algorithm-based optimization
 */
export interface AlgorithmOptimizationOptions {
  memoryOptimization?: boolean;
  speedOptimization?: boolean;
  balancedOptimization?: boolean;
  customPriority?: (a: unknown, b: unknown) => number;
}