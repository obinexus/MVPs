// src/core/algorithms/FuzzySearch.ts
export function calculateLevenshteinDistance(s1: string, s2: string): number;
/**
 * FuzzySearch.ts
 * Implements fuzzy matching algorithms for the NexusSearch engine
 */
import { TrieNode } from "./TrieNode";
import { SearchResult } from "@/core/types";

/**
 * Calculates the Levenshtein distance between two strings
 * This is the minimum number of single-character edits required to change one string into the other
 * 
 * @param s1 First string
 * @param s2 Second string
 * @returns Edit distance value
 */
export function calculateLevenshteinDistance(s1: string, s2: string): number {
    // Handle edge cases
    if (!s1 || !s2) {
        return Math.max(s1?.length || 0, s2?.length || 0);
    }
    
    // Create a matrix of size (s1.length+1) x (s2.length+1)
    const dp: number[][] = Array(s1.length + 1)
        .fill(0)
        .map(() => Array(s2.length + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= s1.length; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= s2.length; j++) {
        dp[0][j] = j;
    }
    
    // Fill in the rest of the matrix
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            // Calculate cost of substitution
            const substitutionCost = s1[i - 1] !== s2[j - 1] ? 1 : 0;
            
            // Choose minimum cost operation: deletion, insertion, or substitution
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,              // deletion
                dp[i][j - 1] + 1,              // insertion
                dp[i - 1][j - 1] + substitutionCost  // substitution
            );
        }
    }
    
    // Return final distance
    return dp[s1.length][s2.length];
}

/**
 * Recursive fuzzy search implementation for tries
 * Uses depth-first search to find approximate matches
 * 
 * @param node Current trie node
 * @param current Current accumulated string
 * @param currentDistance Current edit distance
 * @param depth Current depth in the trie
 * @param state Search state object containing parameters and results
 */
export function fuzzySearchRecursive(
    node: TrieNode, 
    current: string,
    currentDistance: number,
    depth: number,
    state: { 
        word: string; 
        maxDistance: number; 
        results: Array<SearchResult<string>>;
    }
): void {
    // Terminate if we've exceeded maximum allowed distance
    if (currentDistance > state.maxDistance) {
        return;
    }

    // Check if this node represents a complete word
    if (node.isEndOfWord) {
        // Calculate exact Levenshtein distance between target word and current path
        const distance = calculateLevenshteinDistance(state.word, current);
        
        // If within acceptable distance, add document references to results
        if (distance <= state.maxDistance) {
            node.documentRefs.forEach(docId => {
                // Calculate score based on distance and node properties
                const score = calculateFuzzyScore(node, current, distance);
                
                // Add to results
                state.results.push({
                    id: docId,
                    docId,
                    score,
                    term: current,
                    distance,
                    matches: [current],
                    metadata: {}
                });
            });
        }
    }

    // Explore all possible edit operations recursively
    node.children.forEach((child, char) => {
        // 1. Substitution - replace current character with child character
        const substitutionCost = char !== state.word[depth] ? 1 : 0;
        fuzzySearchRecursive(
            child, 
            current + char, 
            currentDistance + substitutionCost,
            depth + 1,
            state
        );

        // 2. Insertion - add child character
        fuzzySearchRecursive(
            child,
            current + char,
            currentDistance + 1,
            depth,
            state
        );

        // 3. Deletion - skip current character in target word
        if (depth < state.word.length) {
            fuzzySearchRecursive(
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
 * Calculate score for fuzzy match based on node properties and edit distance
 * 
 * @param node The matching trie node
 * @param term The matched term
 * @param distance Edit distance between query and term
 * @returns Normalized score between 0 and 1
 */
export function calculateFuzzyScore(node: TrieNode, term: string, distance: number): number {
    // Base score from node weight and frequency
    const baseScore = node.getScore();
    
    // Penalty based on edit distance (exponential decay)
    const distancePenalty = Math.exp(-Math.max(0.001, distance));
    
    // Length normalization (shorter matches get slight preference)
    const lengthNormalization = 1 / Math.sqrt(Math.max(1, term.length));
    
    // Position boost (earlier positions in the word are more significant)
    const positionBoost = 1 / (node.depth + 1);
    
    // Combine factors 
    return baseScore * distancePenalty * lengthNormalization * positionBoost;
}

/**
 * Priority-based fuzzy search that optimizes for specific fuzzy matching scenarios
 * 
 * @param targetWord Word to search for
 * @param candidates Array of candidate words to match against
 * @param maxDistance Maximum Levenshtein distance to consider
 * @returns Array of matches with distances and similarities
 */
export function priorityFuzzyMatch(
    targetWord: string,
    candidates: string[],
    maxDistance: number = 2
): Array<{ word: string; distance: number; similarity: number }> {
    const results: Array<{ word: string; distance: number; similarity: number }> = [];
    
    // Process all candidates
    for (const candidate of candidates) {
        // Calculate distance
        const distance = calculateLevenshteinDistance(targetWord, candidate);
        
        // Skip if beyond maximum distance
        if (distance > maxDistance) {
            continue;
        }
        
        // Calculate similarity score based on relative distance
        const similarity = 1 - (distance / Math.max(targetWord.length, candidate.length));
        
        // Add to results
        results.push({
            word: candidate,
            distance,
            similarity
        });
    }
    
    // Sort by similarity (highest first)
    return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Utility function to determine if a word is a potential fuzzy match
 * Can be used to quickly filter candidates before full distance calculation
 * 
 * @param target Target word
 * @param candidate Candidate word
 * @param maxDistance Maximum allowed distance
 * @returns Boolean indicating if the candidate could be a fuzzy match
 */
export function isPotentialFuzzyMatch(
    target: string,
    candidate: string,
    maxDistance: number
): boolean {
    // Quick length check
    const lengthDiff = Math.abs(target.length - candidate.length);
    if (lengthDiff > maxDistance) {
        return false;
    }
    
    // Check if prefixes are close enough (avoid full calculation)
    const prefixLength = Math.min(3, Math.floor(target.length / 2));
    if (prefixLength > 0) {
        const targetPrefix = target.substring(0, prefixLength);
        const candidatePrefix = candidate.substring(0, prefixLength);
        
        const prefixDistance = calculateLevenshteinDistance(targetPrefix, candidatePrefix);
        if (prefixDistance > Math.floor(maxDistance / 2)) {
            return false;
        }
    }
    
    // Check if some characters are common
    const targetSet = new Set(target.split(''));
    const candidateSet = new Set(candidate.split(''));
    
    let commonChars = 0;
    for (const char of targetSet) {
        if (candidateSet.has(char)) {
            commonChars++;
        }
    }
    
    // Require at least some character overlap
    const minCommonChars = Math.floor(Math.min(target.length, candidate.length) / 3);
    return commonChars >= minCommonChars;
}
export function fuzzyMatch(term: string, candidates: string[], maxDistance: number): Array<{term: string, distance: number}>;