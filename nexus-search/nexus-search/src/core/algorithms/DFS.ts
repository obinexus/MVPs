import { IndexNode, RegexSearchConfig, RegexSearchResult } from '@/core/types';

/**
 * Depth-First Search traversal for trie data structure
 * Optimized for speed-focused search results and complex pattern matching
 * 
 * @param root The root node of the trie
 * @param query The search query
 * @param maxResults Maximum number of results to return (default: 10)
 * @param config Optional configuration for the traversal
 * @returns Array of search results with document IDs and scores
 */
export function dfsTraversal(
    root: IndexNode,
    query: string,
    maxResults: number = 10,
    config?: RegexSearchConfig
): RegexSearchResult[] {
    // Results array to collect matches
    const results: RegexSearchResult[] = [];
    
    // Set default configuration
    const traversalConfig: Required<RegexSearchConfig> = {
        maxDepth: config?.maxDepth || 50,
        timeoutMs: config?.timeoutMs || 5000,
        caseSensitive: config?.caseSensitive || false,
        wholeWord: config?.wholeWord || false
    };
    
    // Process query based on case sensitivity setting
    const processedQuery = traversalConfig.caseSensitive ? query : query.toLowerCase();
    
    // Maps to track visited nodes and found documents
    const visited = new Set<string>();
    const foundDocIds = new Set<string>();
    
    // Start time for timeout checking
    const startTime = Date.now();
    
    // Internal recursive DFS function
    function dfs(
        node: IndexNode,
        path: string[],
        depth: number
    ): void {
        // Exit conditions
        if (results.length >= maxResults || 
            depth > traversalConfig.maxDepth || 
            Date.now() - startTime > traversalConfig.timeoutMs) {
            return;
        }
        
        const pathKey = path.join('');
        
        // Skip already visited paths
        if (visited.has(pathKey)) {
            return;
        }
        visited.add(pathKey);
        
        // Check if this node matches the query
        if (node.id && matchesQuery(pathKey, processedQuery, traversalConfig)) {
            // Add this document to results if not already found
            if (!foundDocIds.has(node.id)) {
                foundDocIds.add(node.id);
                
                // Calculate positions for highlighting
                const positions = getMatchPositions(pathKey, processedQuery, traversalConfig);
                
                results.push({
                    id: node.id,
                    score: node.score,
                    path: [...path],
                    matches: [pathKey],
                    positions,
                    matched: pathKey
                });
                
                // If we've reached the max results, exit early
                if (results.length >= maxResults) {
                    return;
                }
            }
        }
        
        // Explore children in depth-first order (could be optimized with heuristics)
        for (const [char, childNode] of node.children.entries()) {
            dfs(childNode, [...path, char], depth + 1);
            
            // Exit early if we've reached max results
            if (results.length >= maxResults) {
                return;
            }
        }
    }
    
    // Start the DFS traversal from the root
    dfs(root, [], 0);
    
    // Sort results by score (descending)
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Specialized DFS traversal for regex pattern matching
 * Better suited for complex regex patterns than BFS
 * 
 * @param root The root node of the trie
 * @param regex Regular expression pattern to match
 * @param maxResults Maximum number of results to return
 * @param config Optional configuration
 * @returns Array of search results matching the regex pattern
 */
export function dfsRegexTraversal(
    root: IndexNode,
    regex: RegExp,
    maxResults: number = 10,
    config?: RegexSearchConfig
): RegexSearchResult[] {
    // Results array to collect matches
    const results: RegexSearchResult[] = [];
    
    // Set default configuration
    const traversalConfig: Required<RegexSearchConfig> = {
        maxDepth: config?.maxDepth || 50,
        timeoutMs: config?.timeoutMs || 5000,
        caseSensitive: config?.caseSensitive || false,
        wholeWord: config?.wholeWord || false
    };
    
    // Maps to track visited nodes and found documents
    const visited = new Set<string>();
    const foundDocIds = new Set<string>();
    
    // Start time for timeout checking
    const startTime = Date.now();
    
    // Internal recursive DFS function with regex matching
    function dfsRegex(
        node: IndexNode,
        path: string[],
        depth: number
    ): void {
        // Exit conditions
        if (results.length >= maxResults || 
            depth > traversalConfig.maxDepth || 
            Date.now() - startTime > traversalConfig.timeoutMs) {
            return;
        }
        
        const currentString = path.join('');
        
        // Skip already visited paths
        if (visited.has(currentString)) {
            return;
        }
        visited.add(currentString);
        
        // Check if this path matches the regex
        if (node.id && regex.test(currentString)) {
            // Add this document to results if not already found
            if (!foundDocIds.has(node.id)) {
                foundDocIds.add(node.id);
                
                // Find all matches within the string
                const matches: string[] = [];
                let match: RegExpExecArray | null;
                const clonedRegex = new RegExp(regex.source, regex.flags);
                
                while ((match = clonedRegex.exec(currentString)) !== null) {
                    matches.push(match[0]);
                    // Prevent infinite loops for zero-length matches
                    if (match.index === clonedRegex.lastIndex) {
                        clonedRegex.lastIndex++;
                    }
                }
                
                // Calculate positions for matches
                const positions = getRegexPositions(currentString, regex);
                
                results.push({
                    id: node.id,
                    score: node.score,
                    path: [...path],
                    matches: matches.length > 0 ? matches : [currentString],
                    positions,
                    matched: currentString
                });
                
                // If we've reached the max results, exit early
                if (results.length >= maxResults) {
                    return;
                }
            }
        }
        
        // Optimization: Check if continuing this path could potentially match the regex
        // For simple regex patterns, we can check if any prefix of the pattern matches the current path
        if (!couldMatchRegex(currentString, regex) && depth > 2) {
            return;
        }
        
        // Explore children in depth-first order
        for (const [char, childNode] of node.children.entries()) {
            dfsRegex(childNode, [...path, char], depth + 1);
            
            // Exit early if we've reached max results
            if (results.length >= maxResults) {
                return;
            }
        }
    }
    
    // Start the DFS traversal from the root
    dfsRegex(root, [], 0);
    
    // Sort results by score (descending)
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Checks if a string matches a query based on traversal configuration
 */
function matchesQuery(
    str: string,
    query: string,
    config: Required<RegexSearchConfig>
): boolean {
    if (config.wholeWord) {
        return str === query;
    }
    return str.includes(query);
}

/**
 * Gets the positions of matches for highlighting
 */
function getMatchPositions(
    str: string,
    query: string,
    config: Required<RegexSearchConfig>
): Array<[number, number]> {
    const positions: Array<[number, number]> = [];
    let index = 0;
    
    while ((index = str.indexOf(query, index)) !== -1) {
        positions.push([index, index + query.length]);
        index += query.length;
    }
    
    return positions;
}

/**
 * Gets the positions of regex matches for highlighting
 */
function getRegexPositions(
    str: string,
    regex: RegExp
): Array<[number, number]> {
    const positions: Array<[number, number]> = [];
    const clonedRegex = new RegExp(regex.source, regex.flags + 'g');
    
    let match: RegExpExecArray | null;
    while ((match = clonedRegex.exec(str)) !== null) {
        positions.push([match.index, match.index + match[0].length]);
        // Prevent infinite loops for zero-length matches
        if (match.index === clonedRegex.lastIndex) {
            clonedRegex.lastIndex++;
        }
    }
    
    return positions;
}

/**
 * Optimization to determine if continuing a path could potentially match the regex
 * This is a heuristic that works well for simple patterns but may need refinement for complex patterns
 */
function couldMatchRegex(
    currentString: string,
    regex: RegExp
): boolean {
    // For complex patterns, we conservatively return true to avoid false negatives
    if (isComplexRegex(regex)) {
        return true;
    }
    
    // For simple patterns, we check if any prefix of the regex could match the current string
    const regexString = regex.source;
    
    // Check for simple prefixes that might match
    if (regexString.startsWith('^')) {
        // If the regex starts with ^, current string must match the beginning
        const withoutCaret = regexString.substring(1);
        const firstLiteralPart = withoutCaret.split(/[\[\(\.\*\+\?\|\{\^]/)[0];
        
        if (firstLiteralPart && !currentString.startsWith(firstLiteralPart)) {
            return false;
        }
    }
    
    // Check for non-pattern characters that must be present
    const literalParts = regexString.split(/[\[\(\.\*\+\?\|\{\^\$]/);
    for (const part of literalParts) {
        if (part.length > 2 && !currentString.includes(part)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Checks if a regex pattern is complex
 */
function isComplexRegex(regex: RegExp): boolean {
    const pattern = regex.source;
    return (
        // Check for complex regex features
        pattern.includes('{') ||    // Quantifiers
        pattern.includes('+') ||    // One or more
        pattern.includes('*') ||    // Zero or more
        pattern.includes('?') ||    // Optional
        pattern.includes('|') ||    // Alternation
        pattern.includes('(?') ||   // Non-capturing groups
        pattern.includes('[') ||    // Character classes
        pattern.length > 20         // Long patterns are considered complex
    );
}