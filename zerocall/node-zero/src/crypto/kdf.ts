/**
 * Key derivation functions for the Zero library
 * 
 * Provides secure key derivation with:
 * - Multiple KDF algorithms (PBKDF2, scrypt)
 * - Configurable parameters for security/performance tradeoffs
 * - Secure memory handling for sensitive data
 * - Constant-time operations for timing attack prevention
 */
import crypto from 'crypto';

import { IKdfOptions, isKdfOptions } from '../types/crypto';
import { CryptoFlags, SecureBuffer } from '../types/common';
import { ZeroError } from '../errors/ZeroError';
import { ZeroErrorCode } from '../types/error';
import { secureAlloc, secureCopy } from '../utils/memory';
import { CRYPTO } from '../utils/constants';

/**
 * KDF algorithm identifiers
 */
export enum KdfAlgorithm {
  PBKDF2_HMAC_SHA256 = 0,
  PBKDF2_HMAC_SHA512 = 1,
  SCRYPT = 2,
  ARGON2ID = 3  // Not directly supported by Node.js crypto, requires external library
}

/**
 * Default KDF options
 */
const DEFAULT_KDF_OPTIONS: IKdfOptions = {
  iterations: CRYPTO.KDF.DEFAULT_ITERATIONS,
  memorySize: CRYPTO.KDF.DEFAULT_MEMORY_SIZE,
  parallelism: CRYPTO.KDF.DEFAULT_PARALLELISM,
  outputLength: CRYPTO.KDF.DEFAULT_OUTPUT_LENGTH
};

/**
 * Derives a key from input data using PBKDF2
 * 
 * @param input - Input data for key derivation
 * @param salt - Salt for key derivation
 * @param options - KDF options (iterations, output length, etc.)
 * @param flags - Security flags
 * @returns Derived key in a secure buffer
 * @throws ZeroError if parameters are invalid or derivation fails
 */
export function deriveKeyPbkdf2(
  input: Buffer | Uint8Array | string,
  salt: Buffer | Uint8Array,
  options?: Partial<IKdfOptions>,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  // Apply default options
  const opts = applyDefaultOptions(options);
  
  // Convert input to buffer if it's a string
  const inputBuffer = typeof input === 'string'
    ? Buffer.from(input, 'utf8')
    : Buffer.from(input);
  
  try {
    // Derive key using PBKDF2-HMAC-SHA512
    const rawKey = crypto.pbkdf2Sync(
      inputBuffer,
      salt,
      opts.iterations,
      opts.outputLength,
      'sha512'
    );
    
    // Create secure buffer for result
    const secureKey = secureAlloc(opts.outputLength, flags);
    secureCopy(rawKey, secureKey);
    
    // Wipe raw key from memory
    rawKey.fill(0);
    
    return secureKey;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to derive key using PBKDF2',
      { 
        iterations: opts.iterations,
        outputLength: opts.outputLength
      },
      err instanceof Error ? err : undefined
    );
  } finally {
    // Ensure input buffer is wiped if it was created from a string
    if (typeof input === 'string') {
      inputBuffer.fill(0);
    }
  }
}

/**
 * Derives a key from input data using scrypt
 * 
 * @param input - Input data for key derivation
 * @param salt - Salt for key derivation
 * @param options - KDF options (memory cost, parallelism, etc.)
 * @param flags - Security flags
 * @returns Derived key in a secure buffer
 * @throws ZeroError if parameters are invalid or derivation fails
 */
export function deriveKeyScrypt(
  input: Buffer | Uint8Array | string,
  salt: Buffer | Uint8Array,
  options?: Partial<IKdfOptions>,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  // Apply default options
  const opts = applyDefaultOptions(options);
  
  // Convert input to buffer if it's a string
  const inputBuffer = typeof input === 'string'
    ? Buffer.from(input, 'utf8')
    : Buffer.from(input);
  
  // Validate salt length for scrypt (must be at least 16 bytes)
  if (salt.length < 16) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Salt for scrypt must be at least 16 bytes long',
      { saltLength: salt.length, minimumLength: 16 }
    );
  }
  
  try {
    // Calculate scrypt parameters
    // Cost must be a power of 2 and fit in 32 bits
    const cost = Math.min(
      2 ** Math.floor(Math.log2(opts.memorySize / 32)),
      2 ** 20
    );
    
    // Derive key using scrypt
    const rawKey = crypto.scryptSync(
      inputBuffer,
      salt,
      opts.outputLength,
      {
        cost,
        blockSize: 8,
        parallelization: opts.parallelism,
        maxmem: opts.memorySize * 1024  // Convert KB to bytes
      }
    );
    
    // Create secure buffer for result
    const secureKey = secureAlloc(opts.outputLength, flags);
    secureCopy(rawKey, secureKey);
    
    // Wipe raw key from memory
    rawKey.fill(0);
    
    return secureKey;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to derive key using scrypt',
      { 
        memorySize: opts.memorySize,
        parallelism: opts.parallelism,
        outputLength: opts.outputLength
      },
      err instanceof Error ? err : undefined
    );
  } finally {
    // Ensure input buffer is wiped if it was created from a string
    if (typeof input === 'string') {
      inputBuffer.fill(0);
    }
  }
}

/**
 * Derives a key from input data using the specified algorithm
 * 
 * @param algorithm - KDF algorithm to use
 * @param input - Input data for key derivation
 * @param salt - Salt for key derivation
 * @param options - KDF options (algorithm-specific parameters)
 * @param flags - Security flags
 * @returns Derived key in a secure buffer
 * @throws ZeroError if parameters are invalid or derivation fails
 */
export function deriveKey(
  algorithm: KdfAlgorithm,
  input: Buffer | Uint8Array | string,
  salt: Buffer | Uint8Array,
  options?: Partial<IKdfOptions>,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  // Validate inputs
  if (!input) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input data is required',
      { inputType: typeof input }
    );
  }
  
  if (!salt || !(salt instanceof Buffer || salt instanceof Uint8Array) || salt.length === 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Salt must be a non-empty Buffer or Uint8Array',
      { saltType: salt ? typeof salt : 'null', saltLength: salt?.length }
    );
  }
  
  // Select algorithm implementation
  switch (algorithm) {
    case KdfAlgorithm.PBKDF2_HMAC_SHA256:
      return deriveKeyPbkdf2WithAlgorithm(input, salt, options, 'sha256', flags);
      
    case KdfAlgorithm.PBKDF2_HMAC_SHA512:
      return deriveKeyPbkdf2WithAlgorithm(input, salt, options, 'sha512', flags);
      
    case KdfAlgorithm.SCRYPT:
      return deriveKeyScrypt(input, salt, options, flags);
      
    case KdfAlgorithm.ARGON2ID:
      throw new ZeroError(
        ZeroErrorCode.UNSUPPORTED_ALGORITHM,
        'Argon2id is not directly supported by Node.js crypto module',
        { algorithm, supportedAlgorithms: getSupportedKdfAlgorithms() }
      );
      
    default:
      throw new ZeroError(
        ZeroErrorCode.UNSUPPORTED_ALGORITHM,
        `Unsupported KDF algorithm: ${algorithm}`,
        { algorithm, supportedAlgorithms: getSupportedKdfAlgorithms() }
      );
  }
}

/**
 * Gets the default KDF options
 */
export function getDefaultKdfOptions(): IKdfOptions {
  return { ...DEFAULT_KDF_OPTIONS };
}

/**
 * Applies default options to partial KDF options
 */
function applyDefaultOptions(options?: Partial<IKdfOptions>): IKdfOptions {
  const defaults = getDefaultKdfOptions();
  
  if (!options) {
    return defaults;
  }
  
  // Create result with defaults and overrides using type assertion
  // This avoids the 'never' type error
  const result: IKdfOptions = {
    iterations: typeof options.iterations !== 'undefined' ? options.iterations : defaults.iterations,
    memorySize: typeof options.memorySize !== 'undefined' ? options.memorySize : defaults.memorySize,
    parallelism: typeof options.parallelism !== 'undefined' ? options.parallelism : defaults.parallelism,
    outputLength: typeof options.outputLength !== 'undefined' ? options.outputLength : defaults.outputLength
  };
  
  // Validate merged options

  if (!isKdfOptions(result)) {

    const errorData = result as Partial<IKdfOptions>;

    throw new ZeroError(

      ZeroErrorCode.INVALID_ARGUMENT,

      'Invalid KDF options',

      {

        iterations: errorData.iterations,

        memorySize: errorData.memorySize,

        parallelism: errorData.parallelism,

        outputLength: errorData.outputLength

      }

    );

  }

  
  return result;
}


/**
 * Derives key using PBKDF2 with a specific hash algorithm
 */
function deriveKeyPbkdf2WithAlgorithm(
  input: Buffer | Uint8Array | string,
  salt: Buffer | Uint8Array,
  options?: Partial<IKdfOptions>,
  algorithm: string = 'sha512',
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  // Apply default options
  const opts = applyDefaultOptions(options);
  
  // Convert input to buffer if it's a string
  const inputBuffer = typeof input === 'string'
    ? Buffer.from(input, 'utf8')
    : Buffer.from(input);
  
  try {
    // Derive key using PBKDF2 with specified algorithm
    const rawKey = crypto.pbkdf2Sync(
      inputBuffer,
      salt,
      opts.iterations,
      opts.outputLength,
      algorithm
    );
    
    // Create secure buffer for result
    const secureKey = secureAlloc(opts.outputLength, flags);
    secureCopy(rawKey, secureKey);
    
    // Wipe raw key from memory
    rawKey.fill(0);
    
    return secureKey;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      `Failed to derive key using PBKDF2 with ${algorithm}`,
      { 
        algorithm,
        iterations: opts.iterations,
        outputLength: opts.outputLength
      },
      err instanceof Error ? err : undefined
    );
  } finally {
    // Ensure input buffer is wiped if it was created from a string
    if (typeof input === 'string') {
      inputBuffer.fill(0);
    }
  }
}

/**
 * Stretches a key by iteratively applying a hash function
 * 
 * @param key - Input key material
 * @param salt - Salt value
 * @param iterations - Number of iterations
 * @param outputLength - Desired output length
 * @param flags - Security flags
 * @returns Stretched key material
 */
export function stretchKey(
  key: Buffer | Uint8Array,
  salt: Buffer | Uint8Array,
  iterations: number = 10000,
  outputLength: number = 32,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  if (!key || !salt) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Key and salt are required',
      { keyProvided: !!key, saltProvided: !!salt }
    );
  }
  
  if (iterations < 1000) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Iterations must be at least 1000 for security',
      { iterations }
    );
  }
  
  if (outputLength < 16 || outputLength > 128) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Output length must be between 16 and 128 bytes',
      { outputLength }
    );
  }
  
  // Use PBKDF2 for key stretching
  return deriveKeyPbkdf2WithAlgorithm(
    key,
    salt,
    {
      iterations,
      outputLength,
      memorySize: CRYPTO.KDF.DEFAULT_MEMORY_SIZE,
      parallelism: 1
    },
    'sha512',
    flags
  );
}

/**
 * Creates a key derivation function using a specified hash function
 * 
 * @param hashFunction - Hash function to use
 * @returns Key derivation function
 */
export function createKeyDerivationFunction(
  hashFunction: (data: Buffer) => Buffer
): (input: Buffer, salt: Buffer, iterations: number, outputLength: number) => Buffer {
  return function(input: Buffer, salt: Buffer, iterations: number, outputLength: number): Buffer {
    if (!input || !salt) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Input and salt are required'
      );
    }
    
    // Initial key material
    let result = Buffer.concat([input, salt]);
    
    // Iterative hashing
    for (let i = 0; i < iterations; i++) {
      result = hashFunction(Buffer.concat([result, Buffer.from([i & 0xFF])]));
    }
    
    // Truncate or extend to desired length
    if (result.length === outputLength) {
      return result;
    } else if (result.length > outputLength) {
      return result.subarray(0, outputLength);
    } else {
      // Extend by repeating hash with counter
      const extendedResult = Buffer.alloc(outputLength);
      let offset = 0;
      let counter = 0;
      
      while (offset < outputLength) {
        const counterBuf = Buffer.alloc(4);
        counterBuf.writeUInt32BE(counter++, 0);
        const chunk = hashFunction(Buffer.concat([result, counterBuf]));
        const copySize = Math.min(chunk.length, outputLength - offset);
        chunk.copy(extendedResult, offset, 0, copySize);
        offset += copySize;
      }
      
      return extendedResult;
    }
  };
}

/**
 * Gets list of supported KDF algorithms
 * 
 * @returns Array of supported algorithm names
 */
function getSupportedKdfAlgorithms(): string[] {
  return [
    'PBKDF2_HMAC_SHA256',
    'PBKDF2_HMAC_SHA512',
    'SCRYPT'
  ];
}