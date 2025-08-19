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
export interface TrieSearchOptions {
    caseSensitive?: boolean;
    fuzzy?: boolean;
    maxDistance?: number;
}
