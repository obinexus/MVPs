/**
 * HMAC-based authentication system for Zero-Knowledge Proofs
 * 
 * Implements the protocol described in the formal proof document:
 * K_derived = HMAC_x_A(y_A)
 * 
 * Where:
 * - x_A: Private key (secret)
 * - y_A: Public key
 * - K_derived: Derived key for authentication
 */

import crypto from 'crypto';
import { ZeroError } from '../../errors/ZeroError.js';
import { ZeroErrorCode } from '../../types/error.js';
import { secureAlloc, constantTimeCompare } from '../../utils/memory.js';
import { CryptoFlags } from '../../types/common.js';
import { HashAlgorithm } from '../hash.js';

/**
 * Options for HMAC key derivation
 */
export interface HmacKeyOptions {
  /**
   * Hash algorithm to use for HMAC
   */
  algorithm: HashAlgorithm;
  
  /**
   * Security flags
   */
  flags: CryptoFlags;

  /**
   * Optional salt for additional security
   */
  salt?: Buffer;

  /**
   * Optional iterations for key strengthening
   */
  iterations?: number;
}

/**
 * Default options for HMAC key derivation
 */
const DEFAULT_HMAC_OPTIONS: HmacKeyOptions = {
  algorithm: HashAlgorithm.SHA512,
  flags: CryptoFlags.SECURE_MEMORY,
  iterations: 1
};

/**
 * Derives a key using HMAC with the provided secret and public data
 * 
 * Implements: K_derived = HMAC_secret(publicData)
 * 
 * @param secret - Secret key material (private key)
 * @param publicData - Public data (public key)
 * @param options - Options for HMAC computation
 * @returns Derived key in a secure buffer
 * @throws ZeroError if parameters are invalid or derivation fails
 */
export function deriveHmacKey(
  secret: Buffer | Uint8Array,
  publicData: Buffer | Uint8Array,
  options?: Partial<HmacKeyOptions>
): Buffer {
  if (!secret || !publicData) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Secret and public data are required',
      { 
        secretProvided: !!secret, 
        publicDataProvided: !!publicData 
      }
    );
  }

  // Apply default options
  const opts: HmacKeyOptions = {
    ...DEFAULT_HMAC_OPTIONS,
    ...options
  };

  // Get algorithm name from HashAlgorithm enum
  const algorithmName = getAlgorithmName(opts.algorithm);

  try {
    let derivedKey: Buffer;
    
    if (opts.iterations && opts.iterations > 1) {
      // Use multiple iterations for key strengthening
      let result = Buffer.from(publicData);
      
      for (let i = 0; i < opts.iterations; i++) {
        const hmac = crypto.createHmac(algorithmName, secret);
        
        // If there's a salt, add it to the first iteration
        if (opts.salt && i === 0) {
          hmac.update(opts.salt);
        }
        
        hmac.update(result);
        result = Buffer.from(hmac.digest());
      }
      
      derivedKey = result;
    } else {
      // Single iteration HMAC
      const hmac = crypto.createHmac(algorithmName, secret);
      
      // Add salt if provided
      if (opts.salt) {
        hmac.update(opts.salt);
      }
      
      hmac.update(publicData);
      derivedKey = Buffer.from(hmac.digest());
    }

    // Create secure buffer for the derived key if requested
    if (opts.flags & CryptoFlags.SECURE_MEMORY) {
      const secureKey = secureAlloc(derivedKey.length, opts.flags);
      derivedKey.copy(secureKey);
      
      // Wipe original buffer
      derivedKey.fill(0);
      
      return secureKey;
    }

    return derivedKey;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to derive HMAC key',
      { 
        algorithm: opts.algorithm,
        iterations: opts.iterations 
      },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies a derived key against the expected key in constant time
 * 
 * @param derived - Derived key to verify
 * @param expected - Expected key value
 * @returns True if keys match, false otherwise
 * @throws ZeroError if parameters are invalid
 */
export function verifyHmacKey(
  derived: Buffer | Uint8Array,
  expected: Buffer | Uint8Array
): boolean {
  if (!derived || !expected) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Derived and expected keys are required',
      { 
        derivedProvided: !!derived, 
        expectedProvided: !!expected 
      }
    );
  }

  // Compare in constant time to prevent timing attacks
  return constantTimeCompare(derived, expected) === 0;
}

/**
 * Creates a zero-knowledge proof of key possession
 * 
 * @param secret - Secret key (private key)
 * @param challenge - Challenge data
 * @param options - Options for proof generation
 * @returns Proof of key possession
 * @throws ZeroError if parameters are invalid or proof generation fails
 */
export function createHmacProof(
  secret: Buffer | Uint8Array,
  challenge: Buffer | Uint8Array,
  options?: Partial<HmacKeyOptions>
): Buffer {
  if (!secret || !challenge) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Secret and challenge are required',
      { 
        secretProvided: !!secret, 
        challengeProvided: !!challenge 
      }
    );
  }

  // Apply default options
  const opts: HmacKeyOptions = {
    ...DEFAULT_HMAC_OPTIONS,
    ...options
  };

  // Get algorithm name
  const algorithmName = getAlgorithmName(opts.algorithm);

  try {
    // Create HMAC of the challenge using the secret
    const hmac = crypto.createHmac(algorithmName, secret);
    
    // Add salt if provided
    if (opts.salt) {
      hmac.update(opts.salt);
    }
    
    hmac.update(challenge);
    const proof = hmac.digest();

    // Create secure buffer for the proof if requested
    if (opts.flags & CryptoFlags.SECURE_MEMORY) {
      const secureProof = secureAlloc(proof.length, opts.flags);
      proof.copy(secureProof);
      
      // Wipe original buffer
      proof.fill(0);
      
      return secureProof;
    }

    return proof;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to create HMAC proof',
      { 
        algorithm: opts.algorithm 
      },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies a zero-knowledge proof without revealing the secret
 * 
 * @param proof - Proof to verify
 * @param challenge - Challenge used to create the proof
 * @param publicKey - Public key associated with the secret
 * @param derivedKey - Previously derived key for verification
 * @param options - Options for proof verification
 * @returns True if proof is valid, false otherwise
 * @throws ZeroError if parameters are invalid or verification fails
 */
export function verifyHmacProof(
  proof: Buffer | Uint8Array,
  challenge: Buffer | Uint8Array,
  publicKey: Buffer | Uint8Array,
  derivedKey: Buffer | Uint8Array,
  options?: Partial<HmacKeyOptions>
): boolean {
  if (!proof || !challenge || !publicKey || !derivedKey) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Proof, challenge, public key, and derived key are required',
      { 
        proofProvided: !!proof, 
        challengeProvided: !!challenge,
        publicKeyProvided: !!publicKey,
        derivedKeyProvided: !!derivedKey
      }
    );
  }

  // Apply default options
  const opts: HmacKeyOptions = {
    ...DEFAULT_HMAC_OPTIONS,
    ...options
  };

  // Get algorithm name
  const algorithmName = getAlgorithmName(opts.algorithm);

  try {
    // Compute combined challenge and public key
    const combined = Buffer.concat([challenge, publicKey]);
    
    // Create HMAC of the combined data using the derived key
    const hmac = crypto.createHmac(algorithmName, derivedKey);
    
    // Add salt if provided
    if (opts.salt) {
      hmac.update(opts.salt);
    }
    
    hmac.update(combined);
    const expectedProof = hmac.digest();

    // Compare proofs in constant time
    const isValid = constantTimeCompare(proof, expectedProof) === 0;
    
    // Clean up
    expectedProof.fill(0);
    
    return isValid;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.VERIFICATION_FAILED,
      'Failed to verify HMAC proof',
      { 
        algorithm: opts.algorithm 
      },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Gets algorithm name string from HashAlgorithm enum
 * 
 * @param algorithm - Hash algorithm enum value
 * @returns Algorithm name string
 */
function getAlgorithmName(algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case HashAlgorithm.SHA256:
      return 'sha256';
    case HashAlgorithm.SHA384:
      return 'sha384';
    case HashAlgorithm.SHA512:
      return 'sha512';
    case HashAlgorithm.SHA3_256:
      return 'sha3-256';
    case HashAlgorithm.SHA3_384:
      return 'sha3-384';
    case HashAlgorithm.SHA3_512:
      return 'sha3-512';
    default:
      return 'sha512';
  }
}