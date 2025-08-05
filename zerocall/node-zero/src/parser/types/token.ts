/**
 * Comprehensive parser results for Zero library file parsing
 */

import { IZeroId, IZeroKey, IZeroProof } from "@/types/encoding.js";
import { FileFormat } from "./result.js";


/**
 * Base parser result interface
 */
export interface ParserResult<T = any> {
  /**
   * Whether parsing was successful
   */
  success: boolean;
  
  /**
   * Parsed data if successful
   */
  data?: T;
  
  /**
   * Error messages if unsuccessful
   */
  errors: string[];
  
  /**
   * Warning messages for non-critical issues
   */
  warnings: string[];
  
  /**
   * File format that was detected
   */
  format?: FileFormat;
  
  /**
   * Format version of the parsed file
   */
  formatVersion?: number;
}

/**
 * ZID file header information
 */
export interface ZidHeader {
  /**
   * File format version
   */
  formatVersion: number;
  
  /**
   * Creation timestamp
   */
  createdAt: number;
  
  /**
   * Hash algorithm used
   */
  hashAlgorithm: string;
  
  /**
   * Optional metadata fields
   */
  metadata?: Record<string, any>;
  
  /**
   * Optional checksum
   */
  checksum?: string;
}

/**
 * ZID file parser result
 */
export interface ZidParserResult extends ParserResult<IZeroId> {
  /**
   * Parsed Zero ID
   */
  id?: IZeroId;
  
  /**
   * ZID file header information
   */
  header?: ZidHeader;
  
  /**
   * Whether the ID has an associated key in the same file
   */
  hasEmbeddedKey?: boolean;
  
  /**
   * Embedded key if present
   */
  embeddedKey?: IZeroKey;
}

/**
 * Key metadata information
 */
export interface KeyMetadata {
  /**
   * Creation timestamp
   */
  createdAt: number;
  
  /**
   * Algorithm used
   */
  algorithm: string;
  
  /**
   * Optional issuer information
   */
  issuer?: string;
  
  /**
   * Optional subject information
   */
  subject?: string;
  
  /**
   * Optional user-defined fields
   */
  fields?: Record<string, any>;
}

/**
 * Key file parser result
 */
export interface KeyParserResult extends ParserResult<IZeroKey> {
  /**
   * Parsed Zero key
   */
  key?: IZeroKey;
  
  /**
   * Key metadata
   */
  metadata?: KeyMetadata;
  
  /**
   * Whether the key is expired
   */
  isExpired?: boolean;
  
  /**
   * ID that this key is associated with, if embedded
   */
  associatedId?: string;
}

/**
 * Challenge metadata
 */
export interface ChallengeMetadata {
  /**
   * Creation timestamp
   */
  createdAt: number;
  
  /**
   * Expiration time
   */
  expiresAt?: number;
  
  /**
   * Challenge type
   */
  type?: string;
}

/**
 * Proof file parser result
 */
export interface ProofParserResult extends ParserResult<IZeroProof> {
  /**
   * Parsed Zero proof
   */
  proof?: IZeroProof;
  
  /**
   * Associated challenge data
   */
  challenge?: Buffer;
  
  /**
   * Proof creation timestamp
   */
  timestamp?: number;
  
  /**
   * Challenge metadata
   */
  challengeMetadata?: ChallengeMetadata;
}

/**
 * Create a successful parser result
 * 
 * @param data - Parsed data
 * @param format - Detected format
 * @param formatVersion - Format version
 * @param warnings - Optional warnings
 * @returns Successful parser result
 */
export function createSuccessResult<T>(
  data: T,
  format?: FileFormat,
  formatVersion?: number,
  warnings: string[] = []
): ParserResult<T> {
  return {
    success: true,
    data,
    errors: [],
    warnings,
    format,
    formatVersion
  };
}

/**
 * Create a failed parser result
 * 
 * @param errors - Error messages
 * @param warnings - Optional warnings
 * @param format - Detected format
 * @returns Failed parser result
 */
export function createErrorResult<T>(
  errors: string | string[],
  warnings: string[] = [],
  format?: FileFormat
): ParserResult<T> {
  return {
    success: false,
    errors: Array.isArray(errors) ? errors : [errors],
    warnings,
    format
  };
}