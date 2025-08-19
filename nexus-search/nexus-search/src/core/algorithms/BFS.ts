import { IndexNode, RegexSearchConfig, RegexSearchResult } from '@/core/types';

/**
 * Breadth-First Search traversal for trie data structure
 * Optimized for relevance-focused search results
 * 
 * @param root The root node of the trie
 * @param query The search query
 * @param maxResults Maximum number of results to return (default: 10)
 * @param config Optional configuration for the traversal
 * @returns Array of search results with document IDs and scores
 */
export function bfsTraversal(
    root: IndexNode,
    query: string,
    maxResults: number = 10,
    config?: RegexSearchConfig
): RegexSearchResult[] {
    const results: RegexSearchResult[] = [];
    const queue: Array<{
        node: IndexNode;
        path: string[];
        depth: number;
    }> = [];
    
    // Set default configuration
    const traversalConfig: Required<RegexSearchConfig> = {
        maxDepth: config?.maxDepth || 50,
        timeoutMs: config?.timeoutMs || 5000,
        caseSensitive: config?.caseSensitive || false,
        wholeWord: config?.wholeWord || false
    };
    
    // Start time for timeout checking
    const startTime = Date.now();
    
    // Process query based on case sensitivity setting
    const processedQuery = traversalConfig.caseSensitive ? query : query.toLowerCase();
    
    // Initialize queue with root node
    queue.push({ node: root, path: [], depth: 0 });
    
    // Maps to track visited nodes and prevent duplicates
    const visited = new Set<string>();
    const foundDocIds = new Set<string>();
    
    // BFS traversal loop
    while (queue.length > 0 && results.length < maxResults) {
        // Check for timeout
        if (Date.now() - startTime > traversalConfig.timeoutMs) {
            break;
        }
        
        const { node, path, depth } = queue.shift()!;
        
        // Skip if beyond max depth
        if (depth > traversalConfig.maxDepth) {
            continue;
        }
        
        // Check if this node matches the query
        if (node.id && matchesQuery(path.join(''), processedQuery, traversalConfig)) {
            // Add this document to results if not already found
            if (!foundDocIds.has(node.id)) {
                foundDocIds.add(node.id);
                
                // Calculate positions for highlighting
                const positions = getMatchPositions(path.join(''), processedQuery, traversalConfig);
                
                results.push({
                    id: node.id,
                    score: node.score,
                    path: [...path],
                    matches: [path.join('')],
                    positions,
                    matched: path.join('')
                });
            }
        }
        
        // Add all children to the queue (breadth-first)
        for (const [char, childNode] of node.children.entries()) {
            const newPath = [...path, char];
            const pathKey = newPath.join('');
            
            // Skip already visited paths
            if (visited.has(pathKey)) {
                continue;
            }
            
            visited.add(pathKey);
            queue.push({
                node: childNode,
                path: newPath,
                depth: depth + 1
            });
        }
    }
    
    // Sort results by score (descending)
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Specialized BFS traversal for regex pattern matching
 * 
 * @param root The root node of the trie
 * @param regex Regular expression pattern to match
 * @param maxResults Maximum number of results to return
 * @param config Optional configuration
 * @returns Array of search results matching the regex pattern
 */
export function bfsRegexTraversal(
    root: IndexNode,
    regex: RegExp,
    maxResults: number = 10,
    config?: RegexSearchConfig
): RegexSearchResult[] {
    const results: RegexSearchResult[] = [];
    const queue: Array<{
        node: IndexNode;
        path: string[];
        depth: number;
    }> = [];
    
    // Set default configuration
    const traversalConfig: Required<RegexSearchConfig> = {
        maxDepth: config?.maxDepth || 50,
        timeoutMs: config?.timeoutMs || 5000,
        caseSensitive: config?.caseSensitive || false,
        wholeWord: config?.wholeWord || false
    };
    
    // Start time for timeout checking
    const startTime = Date.now();
    
    // Initialize queue with root node
    queue.push({ node: root, path: [], depth: 0 });
    
    // Maps to track visited nodes and prevent duplicates
    const visited = new Set<string>();
    const foundDocIds = new Set<string>();
    
    // BFS traversal loop with regex matching
    while (queue.length > 0 && results.length < maxResults) {
        // Check for timeout
        if (Date.now() - startTime > traversalConfig.timeoutMs) {
            break;
        }
        
        const { node, path, depth } = queue.shift()!;
        
        // Skip if beyond max depth
        if (depth > traversalConfig.maxDepth) {
            continue;
        }
        
        const currentString = path.join('');
        
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
            }
        }
        
        // Add all children to the queue (breadth-first)
        for (const [char, childNode] of node.children.entries()) {
            const newPath = [...path, char];
            const pathKey = newPath.join('');
            
            // Skip already visited paths
            if (visited.has(pathKey)) {
                continue;
            }
            
            visited.add(pathKey);
            queue.push({
                node: childNode,
                path: newPath,
                depth: depth + 1
            });
        }
    }
    
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