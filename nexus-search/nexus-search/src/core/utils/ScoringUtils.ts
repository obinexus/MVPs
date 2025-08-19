import { TrieNode, IndexedDocument } from '@/core/types';

export class ScoringUtils {
  private readonly defaultDecayRate: number = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  constructor(private decayRate: number = 24 * 60 * 60 * 1000) {}
  
  /**
   * Calculates TF-IDF score for a term in a document
   */
  static calculateTfIdf(
    term: string, 
    document: IndexedDocument | undefined, 
    documents: Map<string, unknown>
  ): number {
    if (!document) return 0;
    
    const text = JSON.stringify(document).toLowerCase();
    const termCount = (text.match(new RegExp(term.toLowerCase(), 'g')) || []).length;
    const totalWords = text.split(/\s+/).length;
    const tf = termCount / totalWords;
    
    let documentCount = 0;
    for (const doc of documents.values()) {
      const content = JSON.stringify(doc).toLowerCase();
      if (content.includes(term.toLowerCase())) {
        documentCount++;
      }
    }
    
    const idf = Math.log(documents.size / (1 + documentCount));
    return tf * idf;
  }
  
  /**
   * Calculates score for a trie node based on multiple factors
   */
  static calculateNodeScore(
    node: TrieNode, 
    term: string,
    totalDocuments: number,
    documentRefCount: number
  ): number {
    if (totalDocuments === 0 || documentRefCount === 0) {
      return node.getWeight();
    }
    
    const tfIdf = (node.frequency / Math.max(1, totalDocuments)) * 
                 Math.log(totalDocuments / Math.max(1, documentRefCount));
    const positionBoost = 1 / (node.depth + 1);
    const lengthNorm = 1 / Math.sqrt(Math.max(1, term.length));
    
    return node.getScore() * tfIdf * positionBoost * lengthNorm;
  }
  
  /**
   * Calculates fuzzy match score with distance penalty
   */
  static calculateFuzzyScore(
    node: TrieNode, 
    term: string, 
    distance: number,
    totalDocuments: number,
    documentRefCount: number
  ): number {
    const baseScore = this.calculateNodeScore(node, term, totalDocuments, documentRefCount);
    return baseScore * Math.exp(-Math.max(0.001, distance));
  }
  
  /**
   * Detects changed fields between two document versions
   */
  static getChangedFields(
    oldDoc: IndexedDocument, 
    newDoc: IndexedDocument
  ): string[] {
    const changedFields: string[] = [];
    
    if (!oldDoc.fields || !newDoc.fields) return Object.keys(newDoc.fields || {});
    
    for (const [key, newValue] of Object.entries(newDoc.fields)) {
      const oldValue = oldDoc.fields[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }
  
  /**
   * Adjusts score based on document freshness
   */
  adjustScoreByFreshness(
    baseScore: number,
    documentDate: Date,
    maxAge: number = 365
  ): number {
    const ageInDays = (Date.now() - documentDate.getTime()) / this.decayRate;
    const freshnessMultiplier = Math.max(0, 1 - (ageInDays / maxAge));
    return baseScore * (0.7 + 0.3 * freshnessMultiplier);
  }
  
  /**
   * Combines multiple scoring factors into a final relevance score
   */
  static calculateCombinedScore(
    textScore: number,
    documentRank: number,
    termFrequency: number,
    inverseDocFreq: number
  ): number {
    const weights = {
      textMatch: 0.3,
      documentRank: 0.2,
      tfIdf: 0.5
    };
    
    const tfIdfScore = termFrequency * inverseDocFreq;
    
    return (
      weights.textMatch * textScore +
      weights.documentRank * documentRank +
      weights.tfIdf * tfIdfScore
    );
  }
}