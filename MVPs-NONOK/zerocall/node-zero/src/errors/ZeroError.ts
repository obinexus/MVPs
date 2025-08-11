/**
 * Zero library custom error implementation
 * Provides standardized error handling with detailed information
 */

import { IZeroErrorInfo, ZeroErrorCode } from "@/types/error.js";
/**
 * Custom error class for all Zero library errors
 * Extends standard Error with additional context and metadata
 */
export class ZeroError extends Error {
  /**
   * Error code identifying the specific error type
   */
  public readonly code: ZeroErrorCode;
  
  /**
   * Additional contextual details about the error
   */
  public readonly details?: Record<string, unknown>;
  
  /**
   * Original error that caused this error (if applicable)
   */
  public readonly cause?: Error;
  
  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: number;
  
  /**
   * Original message without details
   */
  private readonly originalMessage: string;
  
  /**
   * Stack trace capturing the error's origin
   */
  public readonly stack!: string;
  
  /**
   * Creates a new ZeroError instance
   * 
   * @param code - Error code from ZeroErrorCode enum
   * @param message - Human-readable error message
   * @param details - Additional error context (optional)
   * @param cause - Original error that caused this error (optional)
   */
  constructor(
    code: ZeroErrorCode,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    
    // Store the original message
    this.originalMessage = message;
    
    // Set error name to match class name
    this.name = 'ZeroError';
    
    // Capture error metadata
    this.code = code;
    this.details = details;
    this.cause = cause;
    this.timestamp = Date.now();
    
    // Ensure proper stack trace in modern environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ZeroError);
    }
    
    // Add additional context to the message when details are available
    if (details && Object.keys(details).length > 0) {
      const contextStr = Object.entries(details)
        .map(([key, value]) => `${key}: ${stringifyValue(value)}`)
        .join(', ');
      
      this.message = `${this.message} (${contextStr})`;
    }
    
    // Add cause information to the message when available
    if (cause) {
      this.message = `${this.message} | Caused by: ${cause.message}`;
    }
  }
  

  /**
   * Gets the original message without added details
   */
  public getOriginalMessage(): string {
    return this.originalMessage;
  }
  /**
   * Converts the error to an IZeroErrorInfo object
   * Useful for serialization and error handling
   * 
   * @returns The error information object
   */
  public toErrorInfo(): IZeroErrorInfo {
    return {
      code: this.code,
      message: this.originalMessage, // Use original message for error info
      details: this.details,
      cause: this.cause
    };
  }
 /**
   * Creates a JSON representation of the error
   * 
   * @returns JSON-compatible object representation
   */
 public toJSON(): Record<string, unknown> {
  return {
    name: this.name,
    code: this.code,
    message: this.message,
    originalMessage: this.originalMessage,
    details: this.details,
    timestamp: this.timestamp,
    stack: this.stack,
    cause: this.cause ? {
      name: this.cause.name,
      message: this.cause.message,
      stack: this.cause.stack
    } : undefined
  };
}
  
 /**
   * Factory method to create error from an error info object
   * 
   * @param errorInfo - Error information object
   * @returns New ZeroError instance
   */
 public static fromErrorInfo(errorInfo: IZeroErrorInfo): ZeroError {
  return new ZeroError(
    errorInfo.code,
    errorInfo.message,
    errorInfo.details,
    errorInfo.cause
  );
}
   /**
   * Creates an error for invalid arguments
   * 
   * @param message - Error message detail
   * @param paramName - Name of the invalid parameter
   * @param expectedType - Expected type information
   * @param actualValue - Actual invalid value received
   * @returns New ZeroError instance
   */
   public static invalidArgument(
    message: string,
    paramName?: string,
    expectedType?: string,
    actualValue?: unknown
  ): ZeroError {
    const details: Record<string, unknown> = {};
    
    if (paramName) {
      details.paramName = paramName;
    }
    
    if (expectedType) {
      details.expectedType = expectedType;
    }
    
    if (actualValue !== undefined) {
      details.actualValue = stringifyValue(actualValue);
    }
    
    return new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      message,
      details
    );
  }
 /**
   * Creates an error for uninitialized context
   * 
   * @param componentName - Name of the component requiring initialization
   * @returns New ZeroError instance
   */
 public static notInitialized(componentName?: string): ZeroError {
  const message = componentName
    ? `${componentName} is not initialized`
    : 'Component not initialized';
    
  return new ZeroError(
    ZeroErrorCode.NOT_INITIALIZED,
    message,
    componentName ? { component: componentName } : undefined
  );
}
  

  /**
   * Creates an error for buffer size issues
   * 
   * @param requiredSize - Size required for the operation
   * @param actualSize - Actual buffer size provided
   * @returns New ZeroError instance
   */
  public static bufferTooSmall(requiredSize: number, actualSize: number): ZeroError {
    return new ZeroError(
      ZeroErrorCode.BUFFER_TOO_SMALL,
      `Buffer too small: required ${requiredSize} bytes, got ${actualSize} bytes`,
      {
        requiredSize,
        actualSize,
        deficit: requiredSize - actualSize
      }
    );
  }
  
  /**
   * Creates an error for cryptographic operation failures
   * 
   * @param operation - Name of the failed operation
   * @param details - Additional error details
   * @param cause - Original error that caused the failure
   * @returns New ZeroError instance
   */
  public static cryptoFailure(
    operation: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): ZeroError {
    return new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      `Cryptographic operation failed: ${operation}`,
      details,
      cause
    );
  }
   /**
   * Creates an error for unsupported algorithm
   * 
   * @param algorithm - Name of the unsupported algorithm
   * @param supportedAlgorithms - List of supported algorithms
   * @returns New ZeroError instance
   */
   public static unsupportedAlgorithm(
    algorithm: string,
    supportedAlgorithms?: string[]
  ): ZeroError {
    const details: Record<string, unknown> = { algorithm };
    
    if (supportedAlgorithms && supportedAlgorithms.length > 0) {
      details.supportedAlgorithms = supportedAlgorithms;
    }
    
    return new ZeroError(
      ZeroErrorCode.UNSUPPORTED_ALGORITHM,
      `Unsupported algorithm: ${algorithm}`,
      details
    );
  }
  /**
   * Creates an error for verification failures
   * 
   * @param entity - Entity that failed verification
   * @param reason - Reason for verification failure
   * @returns New ZeroError instance
   */
  public static verificationFailed(entity: string, reason?: string): ZeroError {
    const message = reason
      ? `Verification failed for ${entity}: ${reason}`
      : `Verification failed for ${entity}`;
      
    return new ZeroError(
      ZeroErrorCode.VERIFICATION_FAILED,
      message,
      { entity, reason }
    );
  }
  /**
   * Creates an error for invalid format
   * 
   * @param format - Expected format
   * @param details - Additional details about the format error
   * @returns New ZeroError instance
   */
  public static invalidFormat(format: string, details?: Record<string, unknown>): ZeroError {
    return new ZeroError(
      ZeroErrorCode.INVALID_FORMAT,
      `Invalid format: expected ${format}`,
      details
    );
  }
}



/**
 * Helper function to safely stringify any value for error messages
 * Handles circular references and provides meaningful representation
 * 
 * @param value - Value to stringify
 * @returns String representation of the value
 */
function stringifyValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  
  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }
  
  if (typeof value === 'object') {
    try {
      // Try to stringify with circular reference handling
      return JSON.stringify(value, function(key, val) {
        if (key !== '' && val === this) {
          return '[Circular]';
        }
        
        if (typeof val === 'function') {
          return `[Function: ${val.name || 'anonymous'}]`;
        }
        
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message
          };
        }
        
        if (val instanceof Uint8Array) {
          return `[Uint8Array(${val.length})]`;
        }
        
        return val;
      });
    } catch (err) {
      // Fallback if JSON.stringify fails
      return `[${value.constructor ? value.constructor.name : 'Object'}]`;
    }
  }
  
  return String(value);
}