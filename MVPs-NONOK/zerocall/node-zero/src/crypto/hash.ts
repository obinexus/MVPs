/**
 * Cryptographic hashing implementation for the Zero library
 * 
 * Provides secure hash operations using Node.js native crypto module with:
 * - Multiple hash algorithm support (SHA-256, SHA-384, SHA-512, SHA3)
 * - Streaming hash computation for large data
 * - Constant-time hash comparison
 * - Secure memory handling for sensitive data
 */
import crypto from 'crypto';
import { CryptoFlags, SecureBuffer } from '../types/common';
import { ZeroError } from '../errors/ZeroError';
import { ZeroErrorCode } from '../types/error';
import { secureAlloc, constantTimeCompare } from '../utils/memory';
export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',
  SHA3_256 = 'sha3-256',
  SHA3_384 = 'sha3-384',
  SHA3_512 = 'sha3-512'
}

/**
 * Hash context for incremental hash computation
 */
export class HashContext {
  /**
   * Hash algorithm being used
   */
  public readonly algorithm: HashAlgorithm;
  
  /**
   * Expected hash output size in bytes
   */
  public readonly hashSize: number;
  
  /**
   * Crypto operation flags
   */
  public readonly flags: CryptoFlags;
  
  /**
   * Underlying Node.js crypto hash object
   */
  private readonly hashObj: crypto.Hash;
  
  /**
   * Whether the hash has been finalized
   */
  private finalized: boolean = false;
  
  /**
   * Creates a new HashContext for incremental hashing
   * 
   * @param algorithm - Hash algorithm to use
   * @param flags - Security flags
   * @throws ZeroError if algorithm is unsupported
   */
  constructor(algorithm: HashAlgorithm, flags: CryptoFlags = CryptoFlags.SECURE_MEMORY) {
    this.algorithm = algorithm;
    this.flags = flags;
    
    // Get algorithm name and hash size
    const { algorithmName, digestSize } = getAlgorithmInfo(algorithm);
    this.hashSize = digestSize;
    
    try {
      // Create hash object
      this.hashObj = crypto.createHash(algorithmName);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.UNSUPPORTED_ALGORITHM,
        `Unsupported hash algorithm: ${algorithmName}`,
        { algorithm, supportedAlgorithms: getSupportedAlgorithms() },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Updates the hash with additional data
   * 
   * @param data - Data to include in the hash
   * @throws ZeroError if hash has been finalized or on error
   */
  public update(data: Buffer | Uint8Array | string): void {
    if (this.finalized) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_STATE,
        'Cannot update hash after finalization',
        { algorithm: this.algorithm }
      );
    }
    
    try {
      this.hashObj.update(data);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.CRYPTO_FAILURE,
        'Failed to update hash',
        { algorithm: this.algorithm },
        err instanceof Error ? err : undefined
      );
    }
  }
  
/**
 * Finalizes the hash and returns the digest
 * 
 * @param encoding - Optional encoding format for string output
 * @returns Hash digest as Buffer or encoded string
 * @throws ZeroError if hash has been finalized or on error
 */
public digest(encoding?: crypto.BinaryToTextEncoding): Buffer | string {
  if (this.finalized) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_STATE,
      'Hash has already been finalized',
      { algorithm: this.algorithm }
    );
  }
  
  try {
    this.finalized = true;
    return encoding ? this.hashObj.digest(encoding) : this.hashObj.digest();
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to finalize hash',
      { algorithm: this.algorithm, encoding },
      err instanceof Error ? err : undefined
    );
  }
}
  /**
   * Finalizes the hash and securely stores the digest
   * 
   * @returns Hash digest in secure buffer
   * @throws ZeroError if hash has been finalized or on error
   */
  public digestSecure(): SecureBuffer {
    if (this.finalized) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_STATE,
        'Hash has already been finalized',
        { algorithm: this.algorithm }
      );
    }
    
    try {
      // Get raw digest
      const rawDigest = this.hashObj.digest();
      this.finalized = true;
      
      // Allocate secure buffer for result
      const secureDigest = secureAlloc(rawDigest.length, this.flags);
      secureDigest.set(rawDigest);
      
      // Wipe raw digest from memory
      rawDigest.fill(0);
      
      return secureDigest;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.CRYPTO_FAILURE,
        'Failed to finalize hash securely',
        { algorithm: this.algorithm },
        err instanceof Error ? err : undefined
      );
    }
  }
}

/**
 * Computes a hash of the given data using the specified algorithm
 * 
 * @param algorithm - Hash algorithm to use
 * @param data - Data to hash
 * @param flags - Security flags
 * @returns Hash digest in a secure buffer
 * @throws ZeroError if algorithm is unsupported or on error
 */
export function hash(
  algorithm: HashAlgorithm,
  data: Buffer | Uint8Array | string,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  // Create hash context
  const hashCtx = new HashContext(algorithm, flags);
  
  // Update with data
  hashCtx.update(data);
  
  // Finalize and return secure digest
  return hashCtx.digestSecure();
}

/**
 * Calculates a cryptographically secure HMAC
 * 
 * @param algorithm - Hash algorithm to use
 * @param key - Secret key for HMAC
 * @param data - Data to authenticate
 * @param flags - Security flags
 * @returns HMAC digest in a secure buffer
 * @throws ZeroError if algorithm is unsupported or on error
 */
export function hmac(
  algorithm: HashAlgorithm,
  key: Buffer | Uint8Array | string,
  data: Buffer | Uint8Array | string,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  // Get algorithm name
  const { algorithmName } = getAlgorithmInfo(algorithm);
  
  try {
    // Create and compute HMAC
    const hmacObj = crypto.createHmac(algorithmName, key);
    hmacObj.update(data);
    const rawHmac = hmacObj.digest();
    
    // Allocate secure buffer for result
    const secureHmac = secureAlloc(rawHmac.length, flags);
    secureHmac.set(rawHmac);
    
    // Wipe raw HMAC from memory
    rawHmac.fill(0);
    
    return secureHmac;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to compute HMAC',
      { algorithm, algorithmName },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies a hash against the expected value in constant time
 * 
 * @param actual - Actual hash value
 * @param expected - Expected hash value
 * @returns True if hashes match, false otherwise
 * @throws ZeroError if inputs are invalid
 */
export function verifyHash(
  actual: Buffer | Uint8Array,
  expected: Buffer | Uint8Array
): boolean {
  if (!actual || !expected) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Hash values must be provided',
      { actualProvided: !!actual, expectedProvided: !!expected }
    );
  }
  
  return constantTimeCompare(actual, expected) === 0;
}

/**
 * Creates a secure hash context for incremental hashing
 * 
 * @param algorithm - Hash algorithm to use
 * @param flags - Security flags
 * @returns New hash context
 * @throws ZeroError if algorithm is unsupported
 */
export function createHashContext(
  algorithm: HashAlgorithm,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): HashContext {
  return new HashContext(algorithm, flags);
}

/**
 * Gets information about a hash algorithm
 * 
 * @param algorithm - Hash algorithm
 * @returns Algorithm name and digest size
 * @throws ZeroError if algorithm is unsupported
 */
function getAlgorithmInfo(algorithm: HashAlgorithm): { algorithmName: string; digestSize: number } {
  switch (algorithm) {
    case HashAlgorithm.SHA256:
      return { algorithmName: 'sha256', digestSize: 32 };
    case HashAlgorithm.SHA384:
      return { algorithmName: 'sha384', digestSize: 48 };
    case HashAlgorithm.SHA512:
      return { algorithmName: 'sha512', digestSize: 64 };
    case HashAlgorithm.SHA3_256:
      return { algorithmName: 'sha3-256', digestSize: 32 };
    case HashAlgorithm.SHA3_384:
      return { algorithmName: 'sha3-384', digestSize: 48 };
    case HashAlgorithm.SHA3_512:
      return { algorithmName: 'sha3-512', digestSize: 64 };
    default:
      throw new ZeroError(
        ZeroErrorCode.UNSUPPORTED_ALGORITHM,
        `Unsupported hash algorithm: ${algorithm}`,
        { algorithm, supportedAlgorithms: getSupportedAlgorithms() }
      );
  }
}

/**
 * Gets a list of supported hash algorithms
 * 
 * @returns Array of supported algorithm names
 */
function getSupportedAlgorithms(): string[] {
  return [
    'sha256',
    'sha384',
    'sha3-256',
    'sha3-384',
    'sha3-512'
  ];
}
