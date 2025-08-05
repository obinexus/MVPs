/**
 * Cryptographic module exports for the Zero library
 * 
 * This module provides secure cryptographic operations including:
 * - Hashing functions with multiple algorithm support
 * - Key derivation functions with adjustable security parameters
 * - Secure random salt generation
 * - Secure memory operations for sensitive data
 */

// Hash implementation exports
export {
    HashContext,
    hash,
    hmac,
    verifyHash,
    createHashContext,
    HashAlgorithm,
  } from './hash';
  
  // Key derivation exports
  export {
    KdfAlgorithm,
    deriveKey,
    deriveKeyPbkdf2,
    deriveKeyScrypt,
    getDefaultKdfOptions,
    stretchKey,
    createKeyDerivationFunction
  } from './kdf';
  
  // Salt generation exports
  export {
    generateSalt,
    generateDeterministicSalt,
    verifySalt
  } from './salt';
  
  // Re-export relevant type definitions
  import {
    ISaltOptions,
    IKdfOptions,
    IHashContext,
    isHashAlgorithm,
    isSaltOptions,
    isKdfOptions,
    isHashContext
  } from '../types/crypto';
  
  // Export type definitions
  export type {
    ISaltOptions,
    IKdfOptions,
    IHashContext
  };
  export {
    isHashAlgorithm,
    isSaltOptions,
    isKdfOptions,
    isHashContext
  };
  
  export * from './auth/index';
  
  /**
   * Generates a cryptographically secure random buffer
   * 
   * @param size - Size of the buffer in bytes
   * @returns Buffer filled with cryptographically secure random bytes
   * @throws ZeroError if the random source fails
   */
  export function randomBytes(size: number): Buffer {
    if (size <= 0) {
      throw new Error('Size must be positive');
    }
    
    try {
      return require('crypto').randomBytes(size);
    } catch (err) {
      throw new Error(`Failed to generate random bytes: ${String(err)}`);
    }
  }
  
  /**
   * Creates a secure password hash using best-practice parameters
   * 
   * @param password - Password to hash
   * @param salt - Optional salt (will be generated if not provided)
   * @returns Object containing hash, salt, and parameters used
   */
  export function hashPassword(
    password: string,
    salt?: Buffer
  ): { hash: Buffer; salt: Buffer; params: { algorithm: string; iterations: number; memoryFactor: number } } {
    if (!password) {
      throw new Error('Password is required');
    }
    
    // Generate salt if not provided
    const passwordSalt = salt || randomBytes(32);
    
    // Use scrypt for password hashing with secure parameters
    const hash = require('crypto').scryptSync(password, passwordSalt, 64, {
      cost: 16384,  // Memory/CPU cost parameter (N)
      blockSize: 8, // Block size parameter (r)
      parallelization: 1, // Parallelization parameter (p)
      maxmem: 64 * 1024 * 1024 // 64MB - limit memory to avoid DoS
    });
    
    return {
      hash,
      salt: passwordSalt,
      params: {
        algorithm: 'scrypt',
        iterations: 16384,
        memoryFactor: 8
      }
    };
  }
  
  /**
   * Verifies a password against a stored hash
   * 
   * @param password - Password to verify
   * @param storedHash - Previously stored hash
   * @param salt - Salt used for hashing
   * @param params - Parameters used for original hash
   * @returns Boolean indicating whether verification succeeded
   */
  export function verifyPassword(
    password: string,
    storedHash: Buffer,
    salt: Buffer,
    params: { algorithm: string; iterations: number; memoryFactor: number }
  ): boolean {
    if (!password || !storedHash || !salt) {
      throw new Error('Password, stored hash, and salt are required');
    }
    
    try {
      // Currently only scrypt is supported for password verification
      if (params.algorithm !== 'scrypt') {
        throw new Error(`Unsupported algorithm: ${params.algorithm}`);
      }
      
      const hash = require('crypto').scryptSync(password, salt, storedHash.length, {
        cost: params.iterations,
        blockSize: params.memoryFactor,
        parallelization: 1,
        maxmem: 64 * 1024 * 1024 // 64MB - limit memory to avoid DoS
      });
      
      // Constant-time comparison
      return require('crypto').timingSafeEqual(hash, storedHash);
    } catch (err) {
      throw new Error(`Password verification failed: ${String(err)}`);
    }
  }


