/**
 * Key generation and verification for the Zero library
 * 
 * Provides secure key management with:
 * - Creation of verification keys from IDs
 * - Verification of keys against IDs
 * - Key revocation and expiration handling
 * - Secure serialization and parsing
 */
import { hash } from '@/crypto';
import type { KdfAlgorithm } from '@/crypto';
import { HashAlgorithm } from '@/crypto/hash';
import { ZeroError, ZeroErrorCode } from '@/errors';
import { CryptoFlags } from '@/types/common';
import { IZeroKey, IZeroId } from '@/types/encoding';
import { secureFree, TIME, constantTimeCompare } from '@/utils';
import { IKeyOptions } from '.';
import { ZeroContext } from '../context/ZeroContext';

/**
 * Encoding options for ID creation
 */
export interface IEncodingOptions {
  /**
   * Hash algorithm to use for ID hash
   */
  hashAlgorithm: HashAlgorithm;
  
  /**
   * Salt length in bytes
   */
  saltLength: number;
  
  /**
   * Security flags for memory operations
   */
  flags: CryptoFlags;
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
 * Revokes a key by creating a revocation record
 * 
 * @param context - Library context
 * @param key - Key to revoke
 * @param reason - Reason for revocation
 * @returns Revocation record
 * @throws ZeroError if key is invalid
 */
export function revokeKey(
  context: ZeroContext,
  key: IZeroKey,
  reason?: string
): { keyHash: Buffer; timestamp: number; reason?: string } {
  if (!context || !key) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context and key are required',
      {
        hasContext: !!context,
        hasKey: !!key
      }
    );
  }
  
  return {
    keyHash: Buffer.from(key.hash), // Create copy to avoid modification
    timestamp: Date.now(),
    reason
  };
}

/**
 * Cleans up a key, freeing secure memory
 * 
 * @param key - Key to clean up
 */
export function freeKey(key: IZeroKey): void {
  if (!key) {
    return;
  }
  
  try {
    if (key.hash) {
      secureFree(key.hash, key.hash.length);
    }
  } catch (err) {
    // Swallow errors during cleanup
    console.error('Error during key cleanup:', err);
  }
} 

/**
 * Default key options
 */
const DEFAULT_KEY_OPTIONS: IKeyOptions = {
  hashAlgorithm: HashAlgorithm.SHA256,
  flags: CryptoFlags.SECURE_MEMORY,
  expirationTime: TIME.DEFAULT_KEY_EXPIRATION_MS
};



/**
 * Creates a verification key from an ID
 * 
 * @param context - Library context
 * @param id - ID to create key for
 * @param options - Key creation options
 * @returns Verification key
 * @throws ZeroError if parameters are invalid
 */
export function createKey(
  context: ZeroContext,
  id: IZeroId,
  options?: Partial<IKeyOptions>
): IZeroKey {
  if (!context || !id) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context and ID are required',
      {
        hasContext: !!context,
        hasId: !!id
      }
    );
  }
  
  // Apply default options
  const opts: IKeyOptions = {
    ...DEFAULT_KEY_OPTIONS,
    ...options
  };
  
  try {
    // Generate timestamp
    const timestamp = Date.now();
    
    // Create verification hash
    const keyData = Buffer.concat([
      id.hash,
      Buffer.from(timestamp.toString(), 'utf8'),
    ]);
    
    const keyHash = hash(opts.hashAlgorithm, keyData, opts.flags);
    
    // Create key structure
    const key: IZeroKey = {
      hash: keyHash,
      timestamp,
      expirationTime: timestamp + (opts.expirationTime ?? TIME.DEFAULT_KEY_EXPIRATION_MS)
    };
    
    return key;
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to create verification key',
      { idVersion: id.version },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies a key against an ID
 * 
 * @param context - Library context
 * @param key - Key to verify
 * @param id - ID to verify against
 * @returns True if key is valid, false otherwise
 * @throws ZeroError if parameters are invalid
 */
export function verifyKey(
  context: ZeroContext,
  key: IZeroKey,
  id: IZeroId
): boolean {
  if (!context || !key || !id) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context, key, and ID are required',
      {
        hasContext: !!context,
        hasKey: !!key,
        hasId: !!id
      }
    );
  }
  
  try {
    // Check if key is expired
    const currentTime = Date.now();
    if (key.expirationTime && currentTime > key.expirationTime) {
      return false;
    }
    
    // Recreate verification key for comparison
    const verificationKey = createKeyForVerification(id, key.timestamp);
    
    // Compare hashes in constant time
    return constantTimeCompare(key.hash, verificationKey.hash) === 0;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.VERIFICATION_FAILED,
      'Key verification failed',
      { keyTimestamp: key.timestamp },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Converts a key to string representation
 * 
 * @param context - Library context
 * @param key - Key to convert
 * @returns String representation of key
 * @throws ZeroError if parameters are invalid
 */
export function keyToString(context: ZeroContext, key: IZeroKey): string {
  if (!context || !key) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context and key are required',
      {
        hasContext: !!context,
        hasKey: !!key
      }
    );
  }
  
  try {
    // Format: base64Hash.timestamp.expirationTime
    const hashBase64 = key.hash.toString('base64');
    const timestamp = key.timestamp.toString();
    const expiration = key.expirationTime?.toString() || '0';
    
    return `${hashBase64}${context.config.separator}${timestamp}${context.config.separator}${expiration}`;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.ENCODING_FAILED,
      'Failed to convert key to string',
      { keyTimestamp: key.timestamp },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Parses a string into a key
 * 
 * @param context - Library context
 * @param str - String representation of key
 * @returns Parsed key
 * @throws ZeroError if string format is invalid
 */
export function keyFromString(context: ZeroContext, str: string): IZeroKey {
  if (!context || !str) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context and string are required',
      {
        hasContext: !!context,
        stringLength: str?.length
      }
    );
  }
  
  try {
    // Split by separator
    const parts = str.split(context.config.separator);
    if (parts.length !== 3) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        `Invalid key format: expected 3 parts, got ${parts.length}`,
        { string: str, separator: context.config.separator }
      );
    }
    
    // Parse hash (base64)
    let hash: Buffer;
    try {
      hash = Buffer.from(parts[0], 'base64');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Invalid base64 hash',
        { hashString: parts[0] },
        err instanceof Error ? err : undefined
      );
    }
    
    // Parse timestamp
    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp) || timestamp < 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        `Invalid timestamp: ${parts[1]}`,
        { timestampString: parts[1] }
      );
    }
    
    // Parse expiration time
    const expirationTime = parseInt(parts[2], 10);
    
    return {
      hash,
      timestamp,
      expirationTime: expirationTime > 0 ? expirationTime : undefined
    };
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.INVALID_FORMAT,
      'Failed to parse key string',
      { string: str },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Checks if a key is expired
 * 
 * @param key - Key to check
 * @returns True if key is expired, false otherwise
 */
export function isKeyExpired(key: IZeroKey): boolean {
  if (!key) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Key is required',
      { keyType: typeof key }
    );
  }
  
  if (!key.expirationTime) {
    return false; // No expiration time set
  }
  
  return Date.now() > key.expirationTime;
}

/**
 * Renews a key by extending its expiration time
 * 
 * @param key - Key to renew
 * @param extensionMs - Time to extend expiration by (in milliseconds)
 * @returns Renewed key
 * @throws ZeroError if key is invalid or already expired
 */
export function renewKey(
  key: IZeroKey,
  extensionMs: number = TIME.DEFAULT_KEY_EXPIRATION_MS
): IZeroKey {
  if (!key) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Key is required',
      { keyType: typeof key }
    );
  }
  
  if (isKeyExpired(key)) {
    throw new ZeroError(
      ZeroErrorCode.EXPIRED,
      'Cannot renew expired key',
      { 
        expired: true,
        keyTimestamp: key.timestamp,
        expirationTime: key.expirationTime,
        currentTime: Date.now()
      }
    );
  }
  
  if (extensionMs <= 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Extension time must be positive',
      { extensionMs }
    );
  }
  
  // Create new expiration time
  const currentExpiration = key.expirationTime || (key.timestamp + TIME.DEFAULT_KEY_EXPIRATION_MS);
  const newExpiration = currentExpiration + extensionMs;
  
  // Create renewed key
  return {
    ...key,
    expirationTime: newExpiration
  };
}

/**
 * Creates a key specifically for verification
 * Internal helper function
 */
function createKeyForVerification(id: IZeroId, timestamp: number): IZeroKey {
  // Create verification hash using same algorithm
  const keyData = Buffer.concat([
    id.hash,
    Buffer.from(timestamp.toString(), 'utf8'),
  ]);
  
  // Use SHA-256 for verification hash
  const keyHash = hash(HashAlgorithm.SHA256, keyData, CryptoFlags.SECURE_MEMORY);
  
  // Create key structure with original timestamp
  const key: IZeroKey = {
    hash: keyHash,
    timestamp,
    expirationTime: undefined // Not needed for verification
  };
  
  return key;
}