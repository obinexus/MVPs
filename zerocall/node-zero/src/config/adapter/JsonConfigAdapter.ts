/**
 * JSON configuration adapter for the Zero library
 * 
 * Handles JSON operations for configuration:
 * - Parsing JSON strings to objects
 * - Stringifying objects to JSON
 * - Validating JSON structure
 */
import { ZeroError, ZeroErrorCode } from '../../errors';

/**
 * JSON configuration adapter
 */
export class JsonConfigAdapter {
  /**
   * Indentation level for JSON stringification
   */
  private readonly _indent: number;
  
  /**
   * Creates a new JsonConfigAdapter instance
   * 
   * @param indent - Indentation level for JSON stringification (default: 2)
   */
  constructor(indent: number = 2) {
    this._indent = indent;
  }
  
  /**
   * Parses a JSON string to an object
   * 
   * @param content - JSON content to parse
   * @returns Parsed object
   * @throws ZeroError if content cannot be parsed
   */
  public parse(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Failed to parse JSON configuration',
        { content: content.length > 100 ? content.substring(0, 100) + '...' : content },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Stringifies an object to a JSON string
   * 
   * @param config - Object to stringify
   * @returns JSON string
   * @throws ZeroError if object cannot be stringified
   */
  public stringify(config: unknown): string {
    try {
      return JSON.stringify(config, null, this._indent);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Failed to stringify configuration to JSON',
        { config },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Validates if a configuration object has a valid JSON structure
   * 
   * @param config - Configuration object to validate
   * @returns True if config has a valid JSON structure
   */
  public validate(config: unknown): boolean {
    try {
      // Check if config can be serialized and deserialized as JSON
      const json = this.stringify(config);
      const parsed = this.parse(json);
      
      // Perform deep equality check
      return this.deepEqual(config, parsed);
    } catch {
      return false;
    }
  }
  
  /**
   * Performs a deep equality check between two objects
   * 
   * @param a - First object
   * @param b - Second object
   * @returns True if objects are deeply equal
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }
    
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      return false;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) {
      return false;
    }
    
    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      
      if (!this.deepEqual((a as any)[key], (b as any)[key])) {
        return false;
      }
    }
    
    return true;
  }
}