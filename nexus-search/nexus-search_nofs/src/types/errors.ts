
export type SearchEventType = 'error' | 'warning' | 'info';

export class SearchError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class IndexError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CacheError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class MapperError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class PerformanceError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class SearchEventError extends Error {
  constructor(
    message: string,
    public readonly type: SearchEventType,
    public readonly details?: unknown
  ) {
    super(message);
  }
}
