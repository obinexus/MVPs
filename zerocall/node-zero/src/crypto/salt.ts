/**
 * Cryptographic salt generation and handling for the Zero library
 * 
 * Provides secure salt generation facilities with:
 * - Cryptographically secure random source (Node.js crypto)
 * - Entropy mixing for additional security
 * - Configurable salt lengths with validation
 * - Secure memory handling for sensitive data
 */

import { ZeroError } from "@/errors/ZeroError.js";
import { SecureBuffer, CryptoFlags } from "@/types/common.js";
import { ISaltOptions, isSaltOptions } from "@/types/crypto";
import { ZeroErrorCode } from "@/types/error.js";
import { CRYPTO } from "@/utils/constants.js";
import { secureAlloc, secureCopy } from "@/utils/memory.js";
import crypto from 'crypto';


// Internal entropy pool for salt generation
let entropyPool: Uint8Array | null = null;
let lastEntropyRefresh = 0;

/**
 * Generates a cryptographically secure random salt
 * 
 * @param options - Salt generation options
 * @returns Securely generated salt
 * @throws ZeroError if options are invalid or generation fails
 */
export function generateSalt(options?: Partial<ISaltOptions>): SecureBuffer {
  // Apply default options if not provided
  const opts: ISaltOptions = applyDefaultOptions(options);
  
  // Validate options
  validateSaltOptions(opts);
  
  try {
    // Ensure entropy pool is initialized
    ensureEntropyPool();
    
    // Generate random salt
    const rawSalt = crypto.randomBytes(opts.length);
    
    // Mix in entropy pool and custom entropy if provided
    mixEntropy(rawSalt, opts);
    
    // Create secure buffer for result
    const secureSalt = secureAlloc(opts.length, opts.flags);
    secureCopy(rawSalt, secureSalt);
    
    // Wipe raw salt from memory
    rawSalt.fill(0);
    
    return secureSalt;
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.RANDOM_SOURCE_FAILURE,
      'Failed to generate secure salt',
      { saltLength: opts.length },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Generates a deterministic salt from input data
 * WARNING: Only use for testing purposes!
 * 
 * @param seed - Seed data for deterministic generation
 * @param length - Desired salt length
 * @param flags - Security flags
 * @returns Deterministically generated salt
 * @throws ZeroError if parameters are invalid or generation fails
 */
export function generateDeterministicSalt(
  seed: Buffer | Uint8Array | string,
  length: number = CRYPTO.DEFAULT_SALT_LENGTH,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): SecureBuffer {
  if (process.env.NODE_ENV === 'production') {
    throw new ZeroError(
      ZeroErrorCode.INSECURE_OPERATION,
      'Deterministic salt generation is not allowed in production environments',
      { environment: process.env.NODE_ENV }
    );
  }
  
  if (length < CRYPTO.MIN_SALT_LENGTH || length > CRYPTO.MAX_SALT_LENGTH) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      `Salt length must be between ${CRYPTO.MIN_SALT_LENGTH} and ${CRYPTO.MAX_SALT_LENGTH} bytes`,
      { requestedLength: length, minLength: CRYPTO.MIN_SALT_LENGTH, maxLength: CRYPTO.MAX_SALT_LENGTH }
    );
  }
  
  try {
    // Convert seed to buffer if it's a string
    const seedBuffer = typeof seed === 'string' 
      ? Buffer.from(seed, 'utf8')
      : Buffer.from(seed);
    
    // Create HMAC from seed
    const hmac = crypto.createHmac('sha512', 'ZeroSaltGenerator');
    hmac.update(seedBuffer);
    const deterministicBytes = hmac.digest();
    
    // Create secure buffer with proper length
    const secureSalt = secureAlloc(length, flags);
    
    // Fill salt with bytes from HMAC output (with wraparound if needed)
    for (let i = 0; i < length; i++) {
      secureSalt[i] = deterministicBytes[i % deterministicBytes.length];
    }
    
    // Wipe intermediate buffers
    deterministicBytes.fill(0);
    
    return secureSalt;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to generate deterministic salt',
      { seedType: typeof seed, length },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies if a salt meets security requirements
 * 
 * @param salt - Salt to verify
 * @param minLength - Minimum acceptable length (default: 16 bytes)
 * @returns True if salt meets requirements, false otherwise
 */
export function verifySalt(
  salt: Buffer | Uint8Array,
  minLength: number = CRYPTO.MIN_SALT_LENGTH
): boolean {
  if (!salt || !(salt instanceof Buffer || salt instanceof Uint8Array)) {
    return false;
  }
  
  // Check minimum length
  if (salt.length < minLength) {
    return false;
  }
  
  // Check for excessive repetition (weak salt)
  const repetitionCheck = checkForRepetition(salt);
  if (!repetitionCheck) {
    return false;
  }
  
  return true;
}

/**
 * Applies default options to partial salt options
 */
function applyDefaultOptions(options?: Partial<ISaltOptions>): ISaltOptions {
  const defaults: ISaltOptions = {
    length: CRYPTO.DEFAULT_SALT_LENGTH,
    flags: CryptoFlags.SECURE_MEMORY
  };
  
  if (!options) {
    return defaults;
  }
  
  return {
    length: options.length ?? defaults.length,
    flags: options.flags ?? defaults.flags,
    customEntropy: options.customEntropy,
    entropySize: options.entropySize
  };
}

/**
 * Validates salt generation options
 */
function validateSaltOptions(options: ISaltOptions): void {
  if (!isSaltOptions(options)) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Invalid salt options',
      { options }
    );
  }
  
  // Additional validation for custom entropy
  if (options.customEntropy && options.entropySize === undefined) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'entropySize must be provided when customEntropy is specified',
      { customEntropyLength: options.customEntropy.length }
    );
  }
}

/**
 * Ensures the entropy pool is initialized and refreshed periodically
 */
function ensureEntropyPool(): void {
  const currentTime = Date.now();
  
  // Initialize pool if it doesn't exist or refresh it every 10 minutes
  if (!entropyPool || currentTime - lastEntropyRefresh > 10 * 60 * 1000) {
    try {
      // Create new entropy pool (1KB of random data)
      entropyPool = crypto.randomBytes(1024);
      lastEntropyRefresh = currentTime;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.RANDOM_SOURCE_FAILURE,
        'Failed to initialize entropy pool',
        {},
        err instanceof Error ? err : undefined
      );
    }
  }
}

/**
 * Mixes additional entropy into the salt
 */
function mixEntropy(salt: Buffer, options: ISaltOptions): void {
  if (!entropyPool) {
    return;
  }
  
  // Mix in entropy pool
  for (let i = 0; i < salt.length; i++) {
    salt[i] ^= entropyPool[i % entropyPool.length];
  }
  
  // Mix in custom entropy if provided
  if (options.customEntropy && options.entropySize) {
    const usableSize = Math.min(options.entropySize, options.customEntropy.length);
    for (let i = 0; i < salt.length; i++) {
      salt[i] ^= options.customEntropy[i % usableSize];
    }
  }
  
  // Add some system entropy
  const timeValue = BigInt(Date.now());
  const timeBuf = Buffer.alloc(8);
  timeBuf.writeBigUint64LE(timeValue);
  
  for (let i = 0; i < salt.length && i < timeBuf.length; i++) {
    salt[i] ^= timeBuf[i];
  }
}

/**
 * Checks for excessive repetition in the salt
 */
function checkForRepetition(salt: Buffer | Uint8Array): boolean {
  if (salt.length < 8) {
    return true; // Too short to meaningfully check repetition
  }
  
  // Count byte frequencies
  const frequencies = new Map<number, number>();
  for (let i = 0; i < salt.length; i++) {
    const byte = salt[i];
    frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
  }
  
  // Check if any byte appears with excessive frequency (>40%)
  const maxAllowedFreq = Math.floor(salt.length * 0.4);
  for (const freq of frequencies.values()) {
    if (freq > maxAllowedFreq) {
      return false;
    }
  }
  
  return true;
}