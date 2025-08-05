/**
 * Encoding-related type definitions for Zero library
 */

import { HashAlgorithm } from "@/crypto/hash.js";
import { KdfAlgorithm } from "@/crypto/index.js";
import { SecureBuffer, CryptoFlags, hasRequiredProperties } from "./common.js";


/**
 * Zero Identifier structure
 * Secure identifier derived from input data
 */
export interface IZeroId {
  /**
   * Protocol version 
   * Indicates the algorithm and format version
   */
  version: number;
  
  /**
   * Cryptographic hash of the source data
   * Used for identity verification
   */
  hash: Buffer | SecureBuffer;
  
  /**
   * Size of the hash in bytes
   */
  hashSize?: number;
  
  /**
   * Random salt value
   * Ensures uniqueness and strengthens security
   */
  salt: Buffer | SecureBuffer;
  
  /**
   * Size of the salt in bytes
   */
  saltSize?: number;
}

/**
 * Zero Key structure
 * Used to verify and authenticate IDs
 */
export interface IZeroKey {
  /**
   * Cryptographic hash for key verification
   */
  hash: Buffer | SecureBuffer;
  
  /**
   * Size of the hash in bytes
   */
  hashSize?: number;
  
  /**
   * Creation timestamp (milliseconds since epoch)
   */
  timestamp: number;
  
  /**
   * Optional expiration timestamp
   * If undefined, key does not expire
   */
  expirationTime?: number;
}

/**
 * Zero Data structure
 * Source data for ID creation
 */
export interface IZeroData {
  /**
   * Array of property names
   */
  keys: string[];
  
  /**
   * Array of corresponding values
   * Must have same length as keys
   */
  values: string[];
  
  /**
   * Number of key-value pairs
   * Optional field for optimization
   */
  count?: number;
}

/**
 * Encoding algorithm types
 */
export enum EncodingAlgorithm {
  /**
   * Base64 encoding
   */
  BASE64 = 0,
  
  /**
   * URL-safe Base64 encoding
   */
  BASE64URL = 1,
  
  /**
   * Hexadecimal encoding
   */
  HEX = 2,
  
  /**
   * Base58 encoding (Bitcoin-style)
   */
  BASE58 = 3,
  
  /**
   * Base32 encoding (RFC 4648)
   */
  BASE32 = 4
}

/**
 * Encoding options for ID creation
 */
export interface IEncodingOptions {
  /**
   * Encoding algorithm to use
   */
  algorithm: EncodingAlgorithm;
  
  /**
   * Minimum length of encoded output
   */
  minLength?: number;
  
  /**
   * Maximum length of encoded output
   */
  maxLength?: number;
  
  /**
   * Custom character set for encoding
   */
  customChars?: string;
  
  /**
   * Whether to include padding characters
   */
  includePadding?: boolean;
  
  /**
   * Custom padding character
   */
  paddingChar?: string;
  
  /**
   * Hash algorithm to use for ID hash
   */
  hashAlgorithm?: HashAlgorithm;
  
  /**
   * Salt length in bytes
   */
  saltLength?: number;
  
  /**
   * Security flags for memory operations
   */
  flags?: CryptoFlags;
}

/**
 * Options for derived ID creation
 */
export interface IDerivedIdOptions extends IEncodingOptions {
  /**
   * KDF algorithm to use for derivation
   */
  kdfAlgorithm: KdfAlgorithm;
}

/**
 * Options for key creation
 */
export interface IKeyOptions {
  /**
   * Hash algorithm to use for key hash
   */
  hashAlgorithm: HashAlgorithm;
  
  /**
   * Security flags for memory operations
   */
  flags: CryptoFlags;
  
  /**
   * Key expiration time in milliseconds from creation
   * If undefined, key does not expire
   */
  expirationTime?: number;
}

/**
 * Zero-Knowledge Proof structure
 */
export interface IZeroProof {
  /**
   * Cryptographic proof data
   */
  proof: Buffer | SecureBuffer;
  
  /**
   * Challenge that proof responds to
   */
  challenge: Buffer | SecureBuffer;
  
  /**
   * Timestamp when proof was created
   */
  timestamp: number;
}

/**
 * Options for ZKP operations
 */
export interface IZkpOptions {
  /**
   * Hash algorithm to use for proof generation
   */
  hashAlgorithm: HashAlgorithm;
  
  /**
   * Security flags for operations
   */
  flags: CryptoFlags;
  
  /**
   * Proof expiration time in milliseconds
   */
  expirationTime?: number;
}

/**
 * Type guard for IZeroId
 */
export function isZeroId(value: unknown): value is IZeroId {
  if (!hasRequiredProperties<IZeroId>(
    value,
    ['version', 'hash', 'salt']
  )) {
    return false;
  }
  
  const id = value as IZeroId;
  
  return (
    typeof id.version === 'number' &&
    id.version > 0 &&
    (id.hash instanceof Buffer || (id.hash as any) instanceof Uint8Array) &&
    id.hash.length > 0 &&
    (id.salt instanceof Buffer || (id.salt as any) instanceof Uint8Array) &&
    id.salt.length >= 16
  );
}

/**
 * Type guard for IZeroKey
 */
export function isZeroKey(value: unknown): value is IZeroKey {
  if (!hasRequiredProperties<IZeroKey>(
    value,
    ['hash', 'timestamp']
  )) {
    return false;
  }
  
  const key = value as IZeroKey;
  
  return (
    (key.hash instanceof Buffer || (key.hash as any) instanceof Uint8Array) &&
    key.hash.length > 0 &&
    typeof key.timestamp === 'number' &&
    key.timestamp > 0 &&
    (key.expirationTime === undefined || 
     (typeof key.expirationTime === 'number' && key.expirationTime >= key.timestamp))
  );
}

/**
 * Type guard for IZeroData
 */
export function isZeroData(value: unknown): value is IZeroData {
  if (!hasRequiredProperties<IZeroData>(
    value,
    ['keys', 'values']
  )) {
    return false;
  }
  
  const data = value as IZeroData;
  
  if (!Array.isArray(data.keys) || !Array.isArray(data.values)) {
    return false;
  }
  
  if (data.keys.length !== data.values.length) {
    return false;
  }
  
  if (data.keys.length === 0) {
    return false;
  }
  
  // Check that all keys and values are strings
  const allKeysAreStrings = data.keys.every(k => typeof k === 'string' && k.length > 0);
  const allValuesAreStrings = data.values.every(v => typeof v === 'string');
  
  if (!allKeysAreStrings || !allValuesAreStrings) {
    return false;
  }
  
  // Check count if provided
  if (data.count !== undefined && 
      (typeof data.count !== 'number' || 
       data.count !== data.keys.length)) {
    return false;
  }
  
  return true;
}

/**
 * Type guard for IZeroProof
 */
export function isZeroProof(value: unknown): value is IZeroProof {
  if (!hasRequiredProperties<IZeroProof>(
    value,
    ['proof', 'challenge', 'timestamp']
  )) {
    return false;
  }
  
  const proof = value as IZeroProof;
  
  return (
    (proof.proof instanceof Buffer || (proof.proof as any) instanceof Uint8Array) &&
    proof.proof.length > 0 &&
    (proof.challenge instanceof Buffer || (proof.challenge as any) instanceof Uint8Array) &&
    proof.challenge.length > 0 &&
    typeof proof.timestamp === 'number' &&
    proof.timestamp > 0
  );
}

/**
 * Type for ID serialization format
 */
export enum IdSerializationFormat {
  /**
   * Binary format (most compact)
   */
  BINARY = 0,
  
  /**
   * Text format with hexadecimal encoding
   */
  HEX = 1,
  
  /**
   * Text format with base64 encoding
   */
  BASE64 = 2,
  
  /**
   * Text format with base64url encoding (URL-safe)
   */
  BASE64URL = 3,
  
  /**
   * JSON format (most verbose but human-readable)
   */
  JSON = 4
}

/**
 * Type for key serialization format
 */
export enum KeySerializationFormat {
  /**
   * Binary format (most compact)
   */
  BINARY = 0,
  
  /**
   * Text format with hexadecimal encoding
   */
  HEX = 1,
  
  /**
   * Text format with base64 encoding
   */
  BASE64 = 2,
  
  /**
   * Text format with base64url encoding (URL-safe)
   */
  BASE64URL = 3,
  
  /**
   * JSON format (most verbose but human-readable)
   */
  JSON = 4
}

/**
 * Interface for key-value storage
 * Used to persist IDs and keys
 */
export interface IKeyValueStorage {
  /**
   * Store a value by key
   */
  set(key: string, value: string | Buffer): Promise<void>;
  
  /**
   * Retrieve a value by key
   */
  get(key: string): Promise<string | Buffer | null>;
  
  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Delete a key
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all keys
   */
  clear(): Promise<void>;
}

/**
 * Options for ID storage
 */
export interface IStorageOptions {
  /**
   * Namespace for storage keys
   */
  namespace?: string;
  
  /**
   * Serialization format
   */
  format?: IdSerializationFormat | KeySerializationFormat;
  
  /**
   * Optional encryption key for stored data
   */
  encryptionKey?: Buffer | string;
  
  /**
   * Whether to compress stored data
   */
  compress?: boolean;
}