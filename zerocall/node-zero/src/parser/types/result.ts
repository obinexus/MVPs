/**
 * File format types and token definitions for the parser subsystem
 */

/**
 * File format types for Zero data files
 */
export enum FileFormat {
  /**
   * Text format (default, line-based key-value pairs)
   */
  TEXT = 'text',
  
  /**
   * Binary format (compact representation)
   */
  BINARY = 'binary',
  
  /**
   * JSON format (human-readable, extensible)
   */
  JSON = 'json',
  
  /**
   * Base64 encoded format
   */
  BASE64 = 'base64',
  
  /**
   * Compressed format
   */
  COMPRESSED = 'compressed'
}

/**
 * Token types for the tokenizer
 */
export enum TokenType {
  /**
   * Protocol version number
   */
  VERSION = 'version',
  
  /**
   * Cryptographic hash
   */
  HASH = 'hash',
  
  /**
   * Salt value
   */
  SALT = 'salt',
  
  /**
   * Timestamp value
   */
  TIMESTAMP = 'timestamp',
  
  /**
   * Key data
   */
  KEY = 'key',
  
  /**
   * Challenge data for ZKP
   */
  CHALLENGE = 'challenge',
  
  /**
   * Proof data for ZKP
   */
  PROOF = 'proof',
  
  /**
   * Metadata field
   */
  METADATA = 'metadata',
  
  /**
   * Separator between fields
   */
  SEPARATOR = 'separator',
  
  /**
   * Comment line
   */
  COMMENT = 'comment',
  
  /**
   * Checksum for integrity verification
   */
  CHECKSUM = 'checksum',
  
  /**
   * Unknown token type
   */
  UNKNOWN = 'unknown'
}

/**
 * Token interface representing a parsed token
 */
export interface Token {
  /**
   * Type of the token
   */
  type: TokenType;
  
  /**
   * Value of the token
   */
  value: any;
  
  /**
   * Position in the input where the token starts
   */
  position: number;
  
  /**
   * Length of the token in characters or bytes
   */
  length: number;
  
  /**
   * Optional raw representation of the token
   */
  raw?: string | Buffer;
  
  /**
   * Optional line number in text formats
   */
  line?: number;
  
  /**
   * Optional column number in text formats
   */
  column?: number;
}

/**
 * Parse mode options
 */
export enum ParseMode {
  /**
   * Strict parsing, fails on any error
   */
  STRICT = 'strict',
  
  /**
   * Lenient parsing, tries to recover from errors
   */
  LENIENT = 'lenient',
  
  /**
   * Debug mode with additional validation and output
   */
  DEBUG = 'debug'
}

/**
 * Base interface for parser options
 */
export interface ParserOptions {
  /**
   * Format to use for parsing
   */
  format: FileFormat;
  
  /**
   * Parse mode
   */
  mode: ParseMode;
  
  /**
   * Character encoding for text files
   */
  encoding: string;
  
  /**
   * Whether to skip unknown fields
   */
  skipUnknownFields: boolean;
  
  /**
   * Whether to validate checksums
   */
  validateChecksums: boolean;

  /**
   * Maximum file size in bytes that can be parsed
   */
  maxFileSize: number;
}
