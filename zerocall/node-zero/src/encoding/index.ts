/**
 * Encoding module exports for the Zero library
 * 
 * This module provides ID and key management functionality including:
 * - Creation and verification of secure identifiers
 * - Key generation and verification
 * - Zero-knowledge proof operations
 * - String serialization and parsing
 */

// ID operations
export {
    createId,
    verifyId,
    deriveId,
    idToString,
    idFromString,
    createProof,
    verifyProof,
    generateChallenge,
    encodeId,
    freeId
  } from './id';
  
  // Key operations
  export {
    createKey,
    verifyKey,
    keyToString,
    keyFromString,
    isKeyExpired,
    renewKey,
    revokeKey,
    freeKey
  } from './key';
  
  // Re-export relevant type definitions
  import {
    IZeroId,
    IZeroKey,
    IZeroData,
    IEncodingOptions,
    IDerivedIdOptions,
    IKeyOptions,
    isZeroId,
    isZeroKey,
    isZeroData
  } from '../types/encoding';
  
  // Export type definitions
  export type {
    IZeroId,
    IZeroKey,
    IZeroData,
    IEncodingOptions,
    IDerivedIdOptions,
    IKeyOptions,
  };
  export {
    isZeroId,
    isZeroKey,
    isZeroData
  };
  
  /**
   * Validates ID contents
   * Helper function that verifies ID structure and properties
   * 
   * @param id - ID to validate
   * @returns True if ID is valid, false otherwise
   */
  export function validateId(id: IZeroId): boolean {
    if (!isZeroId(id)) {
      return false;
    }
    
    // Validate hash size
    const validHashSizes = [32, 48, 64]; // SHA-256, SHA-384, SHA-512
    if (!validHashSizes.includes(id.hash.length)) {
      return false;
    }
    
    // Validate salt
    const validSaltSizes = Array.from({ length: 49 }, (_, i) => i + 16); // 16-64 bytes
    if (!validSaltSizes.includes(id.salt.length)) {
      return false;
    }
    
    // Validate version
    if (id.version < 1) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validates key contents
   * Helper function that verifies key structure and properties
   * 
   * @param key - Key to validate
   * @returns True if key is valid, false otherwise
   */
  export function validateKey(key: IZeroKey): boolean {
    if (!isZeroKey(key)) {
      return false;
    }
    
    // Validate hash size
    const validHashSizes = [32, 48, 64]; // SHA-256, SHA-384, SHA-512
    if (!validHashSizes.includes(key.hash.length)) {
      return false;
    }
    
    // Validate timestamp
    if (key.timestamp <= 0 || key.timestamp > Date.now() + 86400000) { // Not in future + 1 day
      return false;
    }
    
    // Validate expiration (if set)
    if (key.expirationTime !== undefined && 
        (key.expirationTime <= key.timestamp || 
         key.expirationTime > key.timestamp + 10 * 365 * 24 * 60 * 60 * 1000)) { // Max 10 years
      return false;
    }
    
    return true;
  }
  
  /**
   * Determines if two IDs are equivalent
   * Performs a secure comparison of the hash values
   * 
   * @param id1 - First ID
   * @param id2 - Second ID
   * @returns True if IDs are equivalent, false otherwise
   */
  export function areIdsEqual(id1: IZeroId, id2: IZeroId): boolean {
    if (!id1 || !id2) {
      return false;
    }
    
    // Check version first
    if (id1.version !== id2.version) {
      return false;
    }
    
    // Check hash length
    if (id1.hash.length !== id2.hash.length) {
      return false;
    }
    
    try {
      // Use constant-time comparison for hash
      const { constantTimeCompare } = require('../utils/memory');
      return constantTimeCompare(id1.hash, id2.hash) === 0;
    } catch (err) {
      return false;
    }
  }