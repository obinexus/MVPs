/**
 * Core TrieNode data structure for the NexusSearch engine
 * Represents a single node in the trie with associated metadata
 */
export class TrieNode {
    /** Map of child nodes indexed by character */
    children: Map<string, TrieNode>;
    
    /** Flag indicating if this node represents the end of a word */
    isEndOfWord: boolean;
    
    /** Set of document IDs that contain this word/prefix */
    documentRefs: Set<string>;
    
    /** Weight value for relevance scoring */
    weight: number;
    
    /** Frequency counter for term frequency calculations */
    frequency: number;
    
    /** Timestamp for recency calculations */
    lastAccessed: number;
    
    /** Count of prefixes in the trie that include this node */
    prefixCount: number;
    
    /** Node depth from the root */
    depth: number;

    /**
     * Creates a new TrieNode
     * @param depth The depth of this node in the trie
     */
    constructor(depth: number = 0) {
        this.children = new Map();
        this.isEndOfWord = false;
        this.documentRefs = new Set();
        this.weight = 0.0;
        this.frequency = 0;
        this.lastAccessed = Date.now();
        this.prefixCount = 0;
        this.depth = depth;
    }

    /**
     * Adds a child node for the given character
     * @param char The character to add as a child
     * @returns The newly created child node
     */
    addChild(char: string): TrieNode {
        const child = new TrieNode(this.depth + 1);
        this.children.set(char, child);
        return child;
    }

    /**
     * Gets the child node for the given character
     * @param char The character to look up
     * @returns The child node or undefined if not found
     */
    getChild(char: string): TrieNode | undefined {
        return this.children.get(char);
    }

    /**
     * Checks if a child node exists for the given character
     * @param char The character to check
     * @returns True if the child exists, false otherwise
     */
    hasChild(char: string): boolean {
        return this.children.has(char);
    }

    /**
     * Increments the weight and frequency of this node
     * @param value Optional weight value to add (defaults to 1.0)
     */
    incrementWeight(value: number = 1.0): void {
        this.weight += value;
        this.frequency++;
        this.lastAccessed = Date.now();
    }

    /**
     * Decrements the weight and frequency of this node
     * @param value Optional weight value to subtract (defaults to 1.0)
     */
    decrementWeight(value: number = 1.0): void {
        this.weight = Math.max(0, this.weight - value);
        this.frequency = Math.max(0, this.frequency - 1);
    }

    /**
     * Clears all children and resets node statistics
     */
    clearChildren(): void {
        this.children.clear();
        this.documentRefs.clear();
        this.weight = 0;
        this.frequency = 0;
    }

    /**
     * Determines if this node should be pruned from the trie
     * @returns True if the node has no children, document references, or weight
     */
    shouldPrune(): boolean {
        return this.children.size === 0 && 
               this.documentRefs.size === 0 && 
               this.weight === 0 &&
               this.frequency === 0;
    }

    /**
     * Calculates a score for this node based on weight, frequency, and recency
     * @returns Combined score value
     */
    getScore(): number {
        // Decay factor for recency (24 hour half-life)
        const recency = Math.exp(-(Date.now() - this.lastAccessed) / (24 * 60 * 60 * 1000));
        
        // Combine factors and normalize by depth
        return (this.weight * this.frequency * recency) / (this.depth + 1);
    }

    /**
     * Gets the raw weight value
     * @returns The weight value
     */
    getWeight(): number {
        return this.weight;
    }
}