/**
 * Error handling exports for the Zero library
 * 
 * This module provides standardized error handling capabilities with rich
 * context and detailed error information to simplify debugging and error
 * management throughout the application.
 */

import { ZeroErrorCode, createErrorResult, createSuccessResult, isErrorResult, isSuccessResult } from "@/types/error.js";
import { ZeroError } from "./ZeroError.js";



// Re-export all error-related types and utilities
export {
  // Error implementation
  ZeroError,
  
  // Error codes
  ZeroErrorCode,
  
  // Result handling utilities
  createErrorResult,
  createSuccessResult,
  isErrorResult,
  isSuccessResult
};

/**
 * Creates a standardized error with automatic logging
 * 
 * @param code - Error code identifying the error type
 * @param message - Human-readable error message 
 * @param details - Additional error context (optional)
 * @param cause - Original error that caused this error (optional)
 * @returns Instantiated ZeroError
 */
export function createError(
  code: ZeroErrorCode,
  message: string,
  details?: Record<string, unknown>,
  cause?: Error
): ZeroError {
  const error = new ZeroError(code, message, details, cause);
  
  // Log error to console in development environments
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ZeroError] ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  
  return error;
}

/**
 * Wraps a function to catch and standardize errors
 * 
 * @param fn - Function to wrap with error handling
 * @returns Wrapped function that catches and standardizes errors
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => T
): (...args: Args) => T {
  return function(...args: Args): T {
    try {
      return fn(...args);
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      // Convert standard errors to ZeroError
      if (err instanceof Error) {
        throw new ZeroError(
          ZeroErrorCode.UNKNOWN,
          `Unexpected error: ${err.message}`,
          {},
          err
        );
      }
      
      // Handle non-Error throws
      throw new ZeroError(
        ZeroErrorCode.UNKNOWN,
        `Unexpected exception: ${String(err)}`,
        { originalError: err }
      );
    }
  };
}

/**
 * Wraps an async function to catch and standardize errors
 * 
 * @param fn - Async function to wrap with error handling
 * @returns Wrapped async function that catches and standardizes errors
 */
export function withAsyncErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  return async function(...args: Args): Promise<T> {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      // Convert standard errors to ZeroError
      if (err instanceof Error) {
        throw new ZeroError(
          ZeroErrorCode.UNKNOWN,
          `Unexpected error in async operation: ${err.message}`,
          {},
          err
        );
      }
      
      // Handle non-Error throws
      throw new ZeroError(
        ZeroErrorCode.UNKNOWN,
        `Unexpected exception in async operation: ${String(err)}`,
        { originalError: err }
      );
    }
  };
}

/**
 * Converts any error to a ZeroError
 * If the error is already a ZeroError, it is returned unchanged
 * 
 * @param error - Error to normalize
 * @param defaultCode - Default error code if not a ZeroError
 * @returns Normalized ZeroError
 */
export function normalizeError(
  error: unknown,
  defaultCode: ZeroErrorCode = ZeroErrorCode.UNKNOWN
): ZeroError {
  if (error instanceof ZeroError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ZeroError(
      defaultCode,
      error.message,
      {},
      error
    );
  }
  
  return new ZeroError(
    defaultCode,
    typeof error === 'string' ? error : `Unknown error: ${String(error)}`,
    { originalError: error }
  );
}

/**
 * Error guard to ensure a value is not null or undefined
 * Throws a ZeroError if the value is null or undefined
 * 
 * @param value - Value to check
 * @param paramName - Name of the parameter for error context
 * @param message - Custom error message (optional)
 * @returns The non-null value
 * @throws ZeroError if value is null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  paramName: string,
  message?: string
): T {
  if (value === null || value === undefined) {
    throw ZeroError.invalidArgument(
      message || `Parameter '${paramName}' must not be null or undefined`,
      paramName,
      'non-null',
      value
    );
  }
  
  return value;
}

/**
 * Error guard to ensure a condition is true
 * Throws a ZeroError if the condition is false
 * 
 * @param condition - Condition to check
 * @param code - Error code to use if condition fails
 * @param message - Error message if condition fails
 * @param details - Additional error details
 * @throws ZeroError if condition is false
 */
export function assert(
  condition: boolean,
  code: ZeroErrorCode,
  message: string,
  details?: Record<string, unknown>
): asserts condition {
  if (!condition) {
    throw new ZeroError(code, message, details);
  }
}