/**
 * Utility module exports for the Zero library
 * 
 * This module provides access to various utility functions used throughout
 * the library, including secure memory operations, string manipulation,
 * and shared constants.
 */

// Export memory utilities
export {
    secureAlloc,
    secureFree,
    secureWipe,
    constantTimeCompare,
    isSecureBuffer,
    secureRandomBytes,
    secureCopy,
    secureClone
  } from './memory.js';
  
  // Export string utilities
  export {
    StringFlags,
    safeConcat,
    secureStringCompare,
    secureSplit,
    truncateString,
    safeParseInt,
    bufferToHex,
    hexToBuffer,
    maskSensitiveString,
    normalizeBooleanString
  } from './strings.js';
  
  // Export constants
  export * from './constants.js';
  
  /**
   * Safely executes a callback with timeout
   * 
   * @param callback - Function to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param timeoutMessage - Message for timeout error
   * @returns Promise that resolves with the callback result or rejects on timeout
   */
  export function withTimeout<T>(
    callback: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout;
      let completed = false;
      
      // Set timeout
      timeoutHandle = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error(timeoutMessage));
        }
      }, timeoutMs);
      
      // Execute callback
      callback()
        .then((result) => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutHandle);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutHandle);
            reject(error);
          }
        });
    });
  }
  
  /**
   * Retry a function with exponential backoff
   * 
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retry attempts
   * @param initialDelayMs - Initial delay between retries in milliseconds
   * @param maxDelayMs - Maximum delay between retries in milliseconds
   * @returns Promise that resolves with the function result or rejects after all retries
   */
  export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 100,
    maxDelayMs: number = 5000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt >= maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );
        
        // Add jitter to prevent synchronized retries
        const jitteredDelay = delay * (0.75 + Math.random() * 0.5);
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }
  
  /**
   * Converts a value to a boolean
   * 
   * @param value - Value to convert (string, number, boolean)
   * @returns Boolean representation of the value
   */
  export function toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return (['true', 'yes', 'y', '1', 'on', 't'].includes(normalized));
    }
    
    return Boolean(value);
  }
  
  /**
   * Deep freezes an object to make it immutable
   * 
   * @param obj - Object to freeze
   * @returns Frozen object
   */
  export function deepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }
    
    // Freeze properties
    Object.getOwnPropertyNames(obj).forEach(prop => {
      const value = (obj as any)[prop];
      if (
        value !== null &&
        (typeof value === 'object' || typeof value === 'function') &&
        !Object.isFrozen(value)
      ) {
        deepFreeze(value);
      }
    });
    
    return Object.freeze(obj);
  }
  
  /**
   * Creates a throttled version of a function that can only be called once
   * within the specified time period
   * 
   * @param fn - Function to throttle
   * @param limitMs - Minimum time between calls in milliseconds
   * @returns Throttled function
   */
  export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    limitMs: number
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    let lastCallTime = 0;
    let lastResult: ReturnType<T> | undefined;
    
    return function throttled(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
      const now = Date.now();
      
      if (now - lastCallTime >= limitMs) {
        lastCallTime = now;
        lastResult = fn.apply(this, args);
      }
      
      return lastResult;
    };
  }
  
  /**
   * Checks if the execution environment is Node.js
   * 
   * @returns True if running in Node.js, false otherwise
   */
  export function isNodeEnvironment(): boolean {
    return (
      typeof process !== 'undefined' &&
      process.versions != null &&
      process.versions.node != null
    );
  }