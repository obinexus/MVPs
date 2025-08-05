/**
 * Cryptographic types and interfaces for Zero library
 */
/**
 * Fix import statement in types/crypto.ts
 */

import { HashAlgorithm } from "@/crypto/hash.js";
import { CryptoFlags, SecureBuffer, hasRequiredProperties, isBinaryData } from "./common.js";

/**
 * Type guard to check if a value is a valid HashAlgorithm
 */
export function isHashAlgorithm(value: unknown): value is HashAlgorithm {
  return (
    typeof value === 'number' &&
    Object.values(HashAlgorithm).includes(value as unknown as HashAlgorithm)
  );
}

/**
 * Options for salt generation
 */
export interface ISaltOptions {
  /**
   * Length of the salt in bytes
   * Must be between 16 and 64 bytes
   */
  length: number;
  
  /**
   * Operation flags
   */
  flags: CryptoFlags;
  
  /**
   * Optional custom entropy to mix with system randomness
   */
  customEntropy?: SecureBuffer;
  
  /**
   * Size of custom entropy in bytes
   * Required if customEntropy is provided
   */
  entropySize?: number;
}

/**
 * Type guard for ISaltOptions
 *
 */
export function isSaltOptions(value: unknown): value is ISaltOptions {
  if (!hasRequiredProperties<ISaltOptions>(value, ['length', 'flags'])) {
    return false;
  }
  
  const opts = value as ISaltOptions;
  
  // Validate length constraints
  if (typeof opts.length !== 'number' || opts.length < 16 || opts.length > 64) {
    return false;
  }
  
  // Validate flags
  if (typeof opts.flags !== 'number') {
    return false;
  }
  
  // If customEntropy is provided, validate it and entropySize
  if (opts.customEntropy !== undefined) {
    // Use type guard instead of instanceof
    if (!isBinaryData(opts.customEntropy)) {
      return false;
    }
    
    if (typeof opts.entropySize !== 'number' || 
        opts.entropySize <= 0 || 
        opts.entropySize > opts.customEntropy.length) {
      return false;
    }
  }
  
  return true;
}

/**
 * Key derivation function options
 */
export interface IKdfOptions {
  /**
   * Number of iterations for the KDF
   * Higher values increase security at the cost of performance
   * Minimum value: 10000
   */
  iterations: number;
  
  /**
   * Memory size in KB to use for memory-hard KDFs
   * Higher values increase resistance to hardware attacks
   * Minimum value: 64
   */
  memorySize: number;
  
  /**
   * Number of parallel threads to use (if supported by the KDF)
   * Minimum value: 1
   */
  parallelism: number;
  
  /**
   * Desired output length in bytes
   * Must be between 16 and 128 bytes
   */
  outputLength: number;
}

/**
 * Type guard for IKdfOptions
 */
export function isKdfOptions(value: unknown): value is IKdfOptions {
  if (!hasRequiredProperties<IKdfOptions>(
    value, 
    ['iterations', 'memorySize', 'parallelism', 'outputLength']
  )) {
    return false;
  }
  
  const opts = value as IKdfOptions;
  
  return (
    typeof opts.iterations === 'number' && opts.iterations >= 10000 &&
    typeof opts.memorySize === 'number' && opts.memorySize >= 64 &&
    typeof opts.parallelism === 'number' && opts.parallelism >= 1 &&
    typeof opts.outputLength === 'number' && 
    opts.outputLength >= 16 && opts.outputLength <= 128
  );
}

/**
 * Hash context interface
 */
export interface IHashContext {
  /**
   * Algorithm used by this hash context
   */
  algorithm: HashAlgorithm;
  
  /**
   * Expected output size in bytes
   */
  hashSize: number;
  
  /**
   * Operation flags
   */
  flags: CryptoFlags;
}

/**
 * Type guard for IHashContext
 */
export function isHashContext(value: unknown): value is IHashContext {
  if (!hasRequiredProperties<IHashContext>(
    value,
    ['algorithm', 'hashSize', 'flags']
  )) {
    return false;
  }
  
  const ctx = value as IHashContext;
  
  return (
    isHashAlgorithm(ctx.algorithm) &&
    typeof ctx.hashSize === 'number' && ctx.hashSize > 0 &&
    typeof ctx.flags === 'number' &&
    Object.values(CryptoFlags).includes(ctx.flags)
  );
}

/**
 * Digital signature algorithm identifiers
 */
export enum SignatureAlgorithm {
  ED25519 = 0,
  SECP256K1 = 1,
  SECP256R1 = 2,
  RSA_PSS = 3,
  DILITHIUM = 4  // Post-quantum signature algorithm
}

/**
 * Type guard for SignatureAlgorithm
 */
export function isSignatureAlgorithm(value: unknown): value is SignatureAlgorithm {
  return (
    typeof value === 'number' &&
    Object.values(SignatureAlgorithm).includes(value as SignatureAlgorithm)
  );
}

/**
 * Signature verification result with detailed status
 */
export interface ISignatureVerificationResult {
  /**
   * Whether the signature is valid
   */
  isValid: boolean;
  
  /**
   * Verification status code
   */
  status: SignatureVerificationStatus;
  
  /**
   * Additional details about the verification result
   */
  details?: Record<string, unknown>;
}

/**
 * Signature verification status codes
 */
export enum SignatureVerificationStatus {
  VALID = 0,
  INVALID_SIGNATURE = 1,
  INVALID_KEY = 2,
  KEY_EXPIRED = 3,
  KEY_REVOKED = 4,
  ALGORITHM_MISMATCH = 5,
  UNSUPPORTED_ALGORITHM = 6,
  INTERNAL_ERROR = 7
}

/**
 * Type guard for ISignatureVerificationResult
 */
export function isSignatureVerificationResult(
  value: unknown
): value is ISignatureVerificationResult {
  if (!hasRequiredProperties<ISignatureVerificationResult>(
    value,
    ['isValid', 'status']
  )) {
    return false;
  }
  
  const result = value as ISignatureVerificationResult;
  
  return (
    typeof result.isValid === 'boolean' &&
    typeof result.status === 'number' &&
    Object.values(SignatureVerificationStatus).includes(result.status) &&
    (result.details === undefined || typeof result.details === 'object')
  );
}

/**
 * Key types supported by the library
 */
export enum KeyType {
  SYMMETRIC = 0,
  ASYMMETRIC_PRIVATE = 1,
  ASYMMETRIC_PUBLIC = 2
}

/**
 * Key usage restrictions
 */
export enum KeyUsage {
  ENCRYPTION = 0,
  SIGNING = 1,
  KEY_AGREEMENT = 2,
  AUTHENTICATION = 3,
  DERIVATION = 4
}

/**
 * Key metadata interface
 */
export interface IKeyMetadata {
  /**
   * Key type (symmetric, asymmetric private, asymmetric public)
   */
  type: KeyType;
  
  /**
   * Allowed usages for this key
   */
  usages: KeyUsage[];
  
  /**
   * Algorithm associated with this key
   */
  algorithm: HashAlgorithm | SignatureAlgorithm;
  
  /**
   * Key size in bits
   */
  keySizeBits: number;
  
  /**
   * Creation timestamp
   */
  createdAt: number;
  
  /**
   * Expiration timestamp (0 for no expiration)
   */
  expiresAt: number;
  
  /**
   * Key identifier (unique)
   */
  id: string;
}

/**
 * Type guard for IKeyMetadata
 */
export function isKeyMetadata(value: unknown): value is IKeyMetadata {
  if (!hasRequiredProperties<IKeyMetadata>(
    value,
    ['type', 'usages', 'algorithm', 'keySizeBits', 'createdAt', 'expiresAt', 'id']
  )) {
    return false;
  }
  
  const metadata = value as IKeyMetadata;
  
  return (
    Object.values(KeyType).includes(metadata.type) &&
    Array.isArray(metadata.usages) &&
    metadata.usages.every(u => Object.values(KeyUsage).includes(u)) &&
    (isHashAlgorithm(metadata.algorithm) || isSignatureAlgorithm(metadata.algorithm)) &&
    typeof metadata.keySizeBits === 'number' && metadata.keySizeBits > 0 &&
    typeof metadata.createdAt === 'number' && metadata.createdAt >= 0 &&
    typeof metadata.expiresAt === 'number' && metadata.expiresAt >= 0 &&
    typeof metadata.id === 'string' && metadata.id.length > 0
  );
}