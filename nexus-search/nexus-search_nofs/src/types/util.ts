// src/types/utils.d.ts
// Utility type definitions

export interface TextScore {
    termFrequency: number;
    documentFrequency: number;
    score: number;
  }
  
  export interface DocumentScore {
    textScore: number;
    documentRank: number;
    termFrequency: number;
    inverseDocFreq: number;
  }
  
  export interface ScoringMetrics {
    textScore: number;
    documentRank: number;
    termFrequency: number;
    inverseDocFreq: number;
  }