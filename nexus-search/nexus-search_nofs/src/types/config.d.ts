export interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
  }
  
  export interface SearchEngineConfig extends IndexConfig {
    version: number;
    documentSupport?: {
      enabled: boolean;
      versioning?: {
        enabled?: boolean;
        maxVersions?: number;
        strategy?: 'simple' | 'timestamp' | 'semantic';
      };
      validation?: ValidationConfig;
      storage?: StorageConfig;
    };
    storage: StorageConfig;
    search?: {
      defaultOptions?: SearchOptions;
    };
    indexing: IndexingConfig;
    plugins?: PluginConfig[];
  }
  
  export interface IndexOptions {
    tokenization?: boolean;
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
    customTokenizer?: (text: string) => string[];
  }
  
  export interface IndexingConfig {
    enabled: boolean;
    fields: string[];
    options: IndexOptions;
  }
  
  export interface StorageConfig {
    type: 'memory' | 'indexeddb';
    options?: StorageOptionsConfig;
    maxSize?: number;
    ttl?: number;
  }
  
  export interface DocumentConfig {
    enabled: boolean;
    versioning?: VersioningConfig;
    validation?: ValidationConfig;
    storage?: StorageConfig;
  }
  
  export interface ValidationConfig {
    required?: string[];
    customValidators?: Record<string, (value: unknown) => boolean>;
  }
  
  export interface VersioningConfig {
    enabled: boolean;
    maxVersions?: number;
    strategy?: 'simple' | 'timestamp' | 'semantic';
  }
  
  export interface PluginConfig {
    name: string;
    enabled: boolean;
    options?: Record<string, unknown>;
  }
  
  export interface ConfigValidationResult {
    valid: boolean;
    errors: string[];
  }
  
  export interface SearchConfig {
    defaultOptions: SearchOptions;
    fuzzy?: boolean;
    maxResults?: number;
    threshold?: number;
    boost?: Record<string, number>;
  }
  
  