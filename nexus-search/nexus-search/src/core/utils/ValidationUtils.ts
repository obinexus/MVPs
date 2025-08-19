import { SearchOptions, IndexConfig, SearchableDocument } from "@/core/types";

export class ValidationUtils {
  private readonly errorMode: 'throw' | 'warn' | 'silent';
  
  constructor(errorMode: 'throw' | 'warn' | 'silent' = 'throw') {
    this.errorMode = errorMode;
  }
  
  /**
   * Validate search options
   */
  static validateSearchOptions(options: SearchOptions): void {
    if (options.maxResults && options.maxResults < 1) {
      throw new Error('maxResults must be greater than 0');
    }
    if (options.threshold && (options.threshold < 0 || options.threshold > 1)) {
      throw new Error('threshold must be between 0 and 1');
    }
    if (options.fields && !Array.isArray(options.fields)) {
      throw new Error('fields must be an array');
    }
  }
  
  /**
   * Validate index configuration
   */
  static validateIndexConfig(config: IndexConfig): void {
    if (!config.name) {
      throw new Error('Index name is required');
    }
    if (!config.version || typeof config.version !== 'number') {
      throw new Error('Valid version number is required');
    }
    if (!Array.isArray(config.fields) || config.fields.length === 0) {
      throw new Error('At least one field must be specified for indexing');
    }
  }
  
  /**
   * Validate document structure
   */
  static validateDocument(
    document: SearchableDocument, 
    fields: string[]
  ): boolean {
    if (!document || !document.id) {
      return false;
    }
    
    // Check if document has all required fields
    return fields.every(field => {
      const paths = field.split('.');
      let current: any = document.content;
      
      for (const path of paths) {
        if (current === undefined || current === null) {
          return false;
        }
        current = current[path];
      }
      
      return current !== undefined;
    });
  }
  
  /**
   * Validate field value
   */
  static validateFieldValue(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
  
  /**
   * Instance method with configurable error behavior
   */
  validate<T>(
    value: T,
    validationFn: (value: T) => boolean,
    errorMessage: string
  ): boolean {
    const isValid = validationFn(value);
    
    if (!isValid) {
      switch (this.errorMode) {
        case 'throw':
          throw new Error(errorMessage);
        case 'warn':
          console.warn(errorMessage);
          break;
        case 'silent':
          // Do nothing
          break;
      }
    }
    
    return isValid;
  }
}