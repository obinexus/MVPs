/**
 * Context module exports for the Zero library
 * 
 * This module provides access to core context management functionality including:
 * - Context creation and configuration
 * - Encoding maps for character mapping operations
 * - Resource tracking and management
 */

// Export context implementation


// Re-export relevant type definitions
import {
  IZeroContext,
  IZeroConfig,
  IZeroStatus,
  IZeroAllocator,
  IZeroMap,
  ContextFlags,
  isZeroContext,
  isZeroConfig,
  isZeroStatus,
  isZeroAllocator,
  isZeroMap
} from '../types/index.js';
import { ZeroContext } from './ZeroContext.js';

// Export type definitions
export type {
  IZeroContext,
  IZeroConfig,
  IZeroStatus,
  IZeroAllocator,
  IZeroMap
};
export {
  ContextFlags,
  isZeroContext,
  isZeroConfig,
  isZeroStatus,
  isZeroAllocator,
  isZeroMap
};

export {
  ZeroHashTable,
} from './ZeroHashTable.js';
export { TokenManager, TokenInfo } from './TokenManager.js';
export { AuditLogger } from "./AuditLogger.js";

// Additional utility functions for context module

/**
 * Creates a default Zero context
 * 
 * @returns New ZeroContext instance with default configuration
 */
export function createContext(): IZeroContext {
  return ZeroContext.create();
}

/**
 * Creates a Zero context with the specified configuration
 * 
 * @param config - Configuration options
 * @param flags - Context flags (optional)
 * @returns New ZeroContext instance with the specified configuration
 */
export function createContextWithConfig(
  config: Partial<IZeroConfig>,
  flags?: ContextFlags
): IZeroContext {
  return ZeroContext.createWithConfig(config, flags);
}

/**
 * Creates a secure Zero context optimized for high security operations
 * 
 * @returns New ZeroContext instance with secure configuration
 */
export function createSecureContext(): IZeroContext {
  const secureFlags = ContextFlags.SECURE_MEMORY | 
                      ContextFlags.STRICT_VALIDATION |
                      ContextFlags.QUANTUM_RESISTANT;
                   
  const secureConfig: Partial<IZeroConfig> = {
    saltLength: 64 // Maximum salt length for highest security
  };
  
  return ZeroContext.createWithConfig(secureConfig, secureFlags);
}

/**
 * Creates a high-performance Zero context optimized for speed
 * 
 * @returns New ZeroContext instance with performance-optimized configuration
 */
export function createPerformanceContext(): IZeroContext {
  const performanceFlags = ContextFlags.HIGH_PERFORMANCE |
                          ContextFlags.ASYNC_OPERATIONS;
                     
  const performanceConfig: Partial<IZeroConfig> = {
    saltLength: 16 // Minimum secure salt length
  };
  
  return ZeroContext.createWithConfig(performanceConfig, performanceFlags);
}

/**
 * Creates a memory-efficient Zero context optimized for constrained environments
 * 
 * @returns New ZeroContext instance with memory-efficient configuration
 */
export function createLowMemoryContext(): IZeroContext {
  const lowMemoryFlags = ContextFlags.LOW_MEMORY;
  
  const lowMemoryConfig: Partial<IZeroConfig> = {
    saltLength: 16,
    encodingSize: 16 // Hex encoding for memory efficiency
  };
  
  return ZeroContext.createWithConfig(lowMemoryConfig, lowMemoryFlags);
}