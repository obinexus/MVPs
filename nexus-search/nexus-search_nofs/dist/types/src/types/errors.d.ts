export type SearchEventType = 'error' | 'warning' | 'info';
export declare class SearchError extends Error {
    constructor(message: string);
}
export declare class IndexError extends Error {
    constructor(message: string);
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class StorageError extends Error {
    constructor(message: string);
}
export declare class CacheError extends Error {
    constructor(message: string);
}
export declare class MapperError extends Error {
    constructor(message: string);
}
export declare class PerformanceError extends Error {
    constructor(message: string);
}
export declare class ConfigError extends Error {
    constructor(message: string);
}
export declare class SearchEventError extends Error {
    readonly type: SearchEventType;
    readonly details?: unknown | undefined;
    constructor(message: string, type: SearchEventType, details?: unknown | undefined);
}
