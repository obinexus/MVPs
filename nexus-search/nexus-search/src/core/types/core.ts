// src/types/core.ts
// Core typings for the NexusSearch engine

/**
 * Core configuration interface for search index
 */
export interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
  }
  
  /**
   * Options for index configuration
   */
  export interface IndexOptions {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
    tokenization?: boolean;
    normalization?: boolean;
    customTokenizer?: (text: string) => string[];
  }
  
  /**
   * Search engine configuration with all options
   */
  export interface SearchEngineConfig extends IndexConfig {
    documentSupport?: {
      enabled: boolean;
      versioning?: VersioningConfig;
      validation?: ValidationConfig;
      storage?: StorageConfig;
    };
    storage: StorageConfig;
    search?: {
      defaultOptions?: SearchOptions;
    };
    indexing: IndexingConfig;
    plugins?: PluginConfig[];
  }
  
  /**
   * Indexing configuration
   */
  export interface IndexingConfig {
    enabled: boolean;
    fields: string[];
    options: IndexOptions;
  }
  
  /**
   * Validation configuration
   */
  export interface ValidationConfig {
    required?: string[];
    customValidators?: Record<string, (value: unknown) => boolean>;
  }
  
  /**
   * Versioning configuration
   */
  export interface VersioningConfig {
    enabled: boolean;
    maxVersions?: number;
    strategy?: 'simple' | 'timestamp' | 'semantic';
  }
  
  /**
   * Plugin configuration
   */
  export interface PluginConfig {
    name: string;
    enabled: boolean;
    options?: Record<string, unknown>;
  }
  
  /**
   * Configuration validation result
   */
  export interface ConfigValidationResult {
    valid: boolean;
    errors: string[];
  }
  
  /**
   * Storage configuration
   */
  export interface StorageConfig {
    type: 'memory' | 'indexeddb';
    options?: StorageOptionsConfig;
    maxSize?: number;
    ttl?: number;
  }
  
  /**
   * Storage options configuration
   */
  export interface StorageOptionsConfig {
    prefix?: string;
    compression?: boolean;
    encryption?: boolean;
    backupEnabled?: boolean;
    debug?: boolean;
  }
  
  /**
   * Token information for query processing
   */
  export interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
  }
  
  /**
   * Node in the index structure
   */
  export interface IndexNode {
    depth: number;
    id: string;
    value: unknown;
    score: number;
    children: Map<string, IndexNode>;
  }
  
  /**
   * Query token for search processing
   */
  export interface QueryToken {
    type: 'operator' | 'modifier' | 'term';
    value: string;
    original: string;
    field?: string;
  }
  
  /**
   * Search options with comprehensive settings
   */
  export interface SearchOptions {
    fuzzy?: boolean;
    fields?: string[];
    boost?: Record<string, number>;
    maxResults?: number;
    threshold?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    enableRegex?: boolean;
    maxDistance?: number;
    regex?: string | RegExp;
    highlight?: boolean;
    includeMatches?: boolean;
    includeScore?: boolean;
    includeStats?: boolean;
    prefixMatch?: boolean;
    minScore?: number;
    includePartial?: boolean;
    caseSensitive?: boolean;
  }
  
  /**
   * Default search options
   */
  export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
    fuzzy: false,
    fields: [],
    boost: {},
    maxResults: 10,
    threshold: 0.5,
    sortBy: 'score',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10,
    highlight: false,
    includeMatches: false,
    includeScore: false,
    includeStats: false,
    enableRegex: false,
    maxDistance: 2,
    regex: /./,
    prefixMatch: false,
    minScore: 0.1,
    includePartial: false,
    caseSensitive: false
  };
  
  /**
   * Serialized state of the search index
   */
  export interface SerializedIndex {
    documents: Array<{
      key: string;
      value: unknown;
    }>;
    indexState: unknown;
    config: IndexConfig;
  }
  
  /**
   * Search context for runtime information
   */
  export interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: unknown[];
    stats: SearchStats;
  }
  
  /**
   * Statistics from search operations
   */
  export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
  }
  
  /**
   * Performance related metrics
   */
  export interface PerformanceMetric {
    avg: number;
    min: number;
    max: number;
    count: number;
  }
  
  /**
   * Collection of performance metrics
   */
  export interface MetricsResult {
    [key: string]: PerformanceMetric;
  }
  
  /**
   * Optimization options
   */
  export interface OptimizationOptions {
    deduplication?: boolean;
    sorting?: boolean;
    compression?: boolean;
  }
  
  /**
   * Result from optimization operations
   */
  export interface OptimizationResult<T> {
    data: T[];
    stats: {
      originalSize: number;
      optimizedSize: number;
      compressionRatio?: number;
    };
  }
  
  /**
   * Cache options
   */
  export interface CacheOptions {
    maxSize: number;
    ttlMinutes: number;
    strategy?: CacheStrategyType;
  }
  
  /**
   * Cache entry
   */
  export interface CacheEntry {
    data: unknown[];
    timestamp: number;
    lastAccessed: number;
    accessCount: number;
  }
  
  /**
   * Cache strategy types
   */
  export enum CacheStrategyType {
    LRU = 'LRU',
    MRU = 'MRU'
  }
  
  /**
   * Cache strategy
   */
  export type CacheStrategy = keyof typeof CacheStrategyType;
  
  /**
   * Cache status information
   */
  export interface CacheStatus {
    size: number;
    maxSize: number;
    strategy: CacheStrategy;
    ttl: number;
    utilization: number;
    oldestEntryAge: number | null;
    newestEntryAge: number | null;
    memoryUsage: {
      bytes: number;
      formatted: string;
    };
  }
  
  /**
   * Type guards
   */
  export function isSearchOptions(obj: unknown): obj is SearchOptions {
    if (!obj || typeof obj !== 'object') return false;
    const options = obj as Partial<SearchOptions>;
    
    return (
      (typeof options.fuzzy === 'undefined' || typeof options.fuzzy === 'boolean') &&
      (typeof options.maxResults === 'undefined' || typeof options.maxResults === 'number') &&
      (typeof options.threshold === 'undefined' || typeof options.threshold === 'number') &&
      (typeof options.fields === 'undefined' || Array.isArray(options.fields)) &&
      (typeof options.sortBy === 'undefined' || typeof options.sortBy === 'string') &&
      (typeof options.sortOrder === 'undefined' || ['asc', 'desc'].includes(options.sortOrder as string)) &&
      (typeof options.page === 'undefined' || typeof options.page === 'number') &&
      (typeof options.pageSize === 'undefined' || typeof options.pageSize === 'number') &&
      (typeof options.regex === 'undefined' || typeof options.regex === 'string' || options.regex instanceof RegExp) &&
      (typeof options.boost === 'undefined' || (typeof options.boost === 'object' && options.boost !== null))
    );
  }
  
  export function isIndexConfig(obj: unknown): obj is IndexConfig {
    if (!obj || typeof obj !== 'object') return false;
    const config = obj as Partial<IndexConfig>;
    
    return Boolean(
      typeof config.name === 'string' &&
      typeof config.version === 'number' &&
      Array.isArray(config.fields)
    );
  }