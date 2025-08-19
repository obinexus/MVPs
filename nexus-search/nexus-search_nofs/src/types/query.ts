

// src/types/query.d.ts
// Query-related type definitions

export interface QueryToken {
  type: 'operator' | 'modifier' | 'term';
  value: string;
  original: string;
  field?: string;
}

