// src/types/search.ts
// Search-related type definitions for NexusSearch

import { DocumentMetadata, IndexedDocument } from './document';
import { SearchOptions, SearchStats } from './core';

/**
 * Core search result interface with proper generic typing
 */
export interface SearchResult<T = unknown> {
  docId: string;
  term: string;
  distance?: number;
  id: string;
  document: IndexedDocument;
  item: T;
  score: number;
  matches: string[];
  metadata?: DocumentMetadata;
  highlights?: Record<string, string[]>;
  spatialScore?: number;
}

/**
 * Search interface for implementation
 */
export interface Search {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

/**
 * Search match information
 */
export interface SearchMatch {
  field: string;
  value: string;
  indices: number[];
}

/**
 * Helper type for search results pagination
 */
export interface SearchPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Field interface for indexing
 */
export interface SearchableField {
  value: unknown;
  weight?: number;
  metadata?: DocumentMetadata;
}

/**
 * Advanced search filters
 */
export interface SearchFilters {
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  types?: string[];
  authors?: string[];
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Advanced search options extending base options
 */
export interface AdvancedSearchOptions extends SearchOptions {
  filters?: SearchFilters;
  sort?: SortConfig;
}

/**
 * Text scoring metrics
 */
export interface TextScore {
  termFrequency: number;
  documentFrequency: number;
  score: number;
}

/**
 * Document scoring metrics
 */
export interface DocumentScore {
  textScore: number;
  documentRank: number;
  termFrequency: number;
  inverseDocFreq: number;
}

/**
 * Combined scoring metrics
 */
export interface ScoringMetrics {
  textScore: number;
  documentRank: number;
  termFrequency: number;
  inverseDocFreq: number;
}

/**
 * Score calculation parameters
 */
export interface SearchScoreParams {
  term: string;
  documentId: string;
  options: SearchOptions;
}

/**
 * Enhanced regex search configuration
 */
export interface RegexSearchConfig {
  maxDepth?: number;
  timeoutMs?: number;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

/**
 * Search result with regex matching details
 */
export interface RegexSearchResult {
  id: string;
  score: number;
  matches: string[];
  path: string[];
  positions: Array<[number, number]>;
  matched?: string;
}

/**
 * Extended search options with regex support
 */
export interface ExtendedSearchOptions extends SearchOptions {
  regexConfig?: RegexSearchConfig;
}

/**
 * Spatial search region
 */
export interface SpatialRegion {
  bounds: Array<[number, number]>; // Array of [min, max] bounds for each dimension
  center?: number[];
}

/**
 * Spatial point with coordinates
 */
export interface SpatialPoint {
  coordinates: number[];
  field?: string;
}

/**
 * Spatial dimension metadata
 */
export interface SpatialDimension {
  name: string;
  min: number;
  max: number;
  scale?: number;
}

/**
 * Type guard for SearchResult
 */
export function isSearchResult<T>(obj: unknown): obj is SearchResult<T> {
  if (!obj || typeof obj !== 'object') return false;
  const result = obj as Partial<SearchResult<T>>;
  
  return Boolean(
    'id' in result &&
    'item' in result &&
    'document' in result &&
    typeof result.score === 'number' &&
    Array.isArray(result.matches)
  );
}