/**
 * HTTP-specific error implementation for Zero library
 * Extends ZeroError with HTTP status codes and response formatting capabilities
 */

import { ZeroErrorCode } from "@/types";
import { ZeroError} from "./ZeroError";



/**
 * Maps ZeroErrorCode to appropriate HTTP status codes
 */
const ERROR_CODE_TO_HTTP_STATUS: Record<ZeroErrorCode, number> = {
  [ZeroErrorCode.SUCCESS]: 200,
  [ZeroErrorCode.INVALID_ARGUMENT]: 400,
  [ZeroErrorCode.OUT_OF_MEMORY]: 500,
  [ZeroErrorCode.INVALID_STATE]: 500,
  [ZeroErrorCode.BUFFER_TOO_SMALL]: 500,
  [ZeroErrorCode.INVALID_FORMAT]: 400,
  [ZeroErrorCode.IO_ERROR]: 500,
  [ZeroErrorCode.PERMISSION_DENIED]: 403,
  [ZeroErrorCode.NOT_FOUND]: 404,
  [ZeroErrorCode.ALREADY_EXISTS]: 409,
  [ZeroErrorCode.TIMEOUT]: 408,
  [ZeroErrorCode.CANCELED]: 499,
  [ZeroErrorCode.UNKNOWN]: 500,
  [ZeroErrorCode.CRYPTO_FAILURE]: 500,
  [ZeroErrorCode.UNSUPPORTED_ALGORITHM]: 501,
  [ZeroErrorCode.WEAK_KEY]: 400,
  [ZeroErrorCode.INVALID_KEY]: 400,
  [ZeroErrorCode.INVALID_SIGNATURE]: 400,
  [ZeroErrorCode.INVALID_CERTIFICATE]: 400,
  [ZeroErrorCode.INVALID_HASH]: 400,
  [ZeroErrorCode.INVALID_PADDING]: 400,
  [ZeroErrorCode.INVALID_MAC]: 400,
  [ZeroErrorCode.RANDOM_SOURCE_FAILURE]: 500,
  [ZeroErrorCode.HASH_MISMATCH]: 400,
  [ZeroErrorCode.NOT_INITIALIZED]: 500,
  [ZeroErrorCode.ALREADY_INITIALIZED]: 500,
  [ZeroErrorCode.INITIALIZATION_FAILED]: 500,
  [ZeroErrorCode.INVALID_CHARACTER]: 400,
  [ZeroErrorCode.INVALID_ENCODING]: 400,
  [ZeroErrorCode.INVALID_BASE64]: 400,
  [ZeroErrorCode.INVALID_HEX]: 400,
  [ZeroErrorCode.INVALID_UTF8]: 400,
  [ZeroErrorCode.VERIFICATION_FAILED]: 401,
  [ZeroErrorCode.EXPIRED]: 401,
  [ZeroErrorCode.REVOKED]: 401,
  [ZeroErrorCode.INVALID_CHALLENGE]: 400,
  [ZeroErrorCode.INVALID_PROOF]: 401,
  [ZeroErrorCode.INVALID_IDENTITY]: 401,
  [ZeroErrorCode.NETWORK_ERROR]: 503,
  [ZeroErrorCode.CONNECTION_FAILED]: 503,
  [ZeroErrorCode.INVALID_RESPONSE]: 502,
  [ZeroErrorCode.MAX_ATTEMPTS_EXCEEDED]: 429,
  [ZeroErrorCode.MAX_SIZE_EXCEEDED]: 413,
  [ZeroErrorCode.RATE_LIMITED]: 429,
  [ZeroErrorCode.VERSION_MISMATCH]: 400,
  [ZeroErrorCode.UNSUPPORTED_VERSION]: 400,
  [ZeroErrorCode.UNSUPPORTED_PLATFORM]: 400,
  [ZeroErrorCode.UNSUPPORTED_FEATURE]: 501,
  [ZeroErrorCode.SECURE_MODE_REQUIRED]: 426,
  [ZeroErrorCode.INSECURE_OPERATION]: 400,
  [ZeroErrorCode.POTENTIAL_SECURITY_VULNERABILITY]: 403,
  [ZeroErrorCode.TAMPERING_DETECTED]: 403,
  [ZeroErrorCode.ENCODING_FAILED]: 0,
  [ZeroErrorCode.INVALID_SALT]: 0,
  [ZeroErrorCode.INVALID_SALT_LENGTH]: 0,
  [ZeroErrorCode.INVALID_NONCE_LENGTH]: 0
};

/**
 * HTTP response data structure for error handling
 */
export interface IHttpErrorResponse {
  /**
   * HTTP status code
   */
  status: number;
  
  /**
   * Error object for API responses
   */
  error: {
    /**
     * Error code from ZeroErrorCode
     */
    code: ZeroErrorCode;
    
    /**
     * Error message
     */
    message: string;
    
    /**
     * Error name
     */
    name: string;
    
    /**
     * Request path that caused the error
     */
    path?: string;
    
    /**
     * Timestamp when the error occurred
     */
    timestamp: number;
    
    /**
     * Trace ID for error correlation
     */
    traceId?: string;
    
    /**
     * Error details
     */
    details?: Record<string, unknown>;
  };
}

/**
 * HTTP-specific error class extending ZeroError
 * Provides HTTP status code mapping and response formatting
 */
export class ZeroHttpError extends ZeroError {
  /**
   * HTTP status code associated with this error
   */
  public readonly statusCode: number;
  
  /**
   * Request path that triggered the error
   */
  public readonly path?: string;
  
  /**
   * Trace ID for request correlation
   */
  public readonly traceId?: string;

  /**
   * Creates a new HTTP-specific error
   * 
   * @param code - Zero error code
   * @param message - Error message
   * @param statusCodeOverride - Optional HTTP status code override
   * @param path - Request path (optional)
   * @param details - Additional error details (optional)
   * @param cause - Original error (optional)
   */
  constructor(
    code: ZeroErrorCode,
    message: string,
    statusCodeOverride?: number,
    path?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(code, message, details, cause);
    
    this.statusCode = statusCodeOverride || ERROR_CODE_TO_HTTP_STATUS[code] || 500;
    this.path = path;
    this.traceId = generateTraceId();
  }
  /**
   * Creates an HTTP response object from this error
   * 
   * @returns Formatted HTTP error response
   */
  public toResponse(): IHttpErrorResponse {
    return {
      status: this.statusCode,
      error: {
        code: this.code,
        message: this.message,
        name: this.name,
        path: this.path,
        timestamp: this.timestamp,
        traceId: this.traceId,
        details: this.details
      }
    };
  }
  
  /**
   * Factory method to create unauthorized error
   * 
   * @param message - Error message
   * @param details - Additional details (optional)
   * @param path - Request path (optional)
   * @returns New ZeroHttpError for unauthorized access
   */
  public static unauthorized(
    message: string = 'Authentication required',
    details?: Record<string, unknown>,
    path?: string
  ): ZeroHttpError {
    return new ZeroHttpError(
      ZeroErrorCode.VERIFICATION_FAILED,
      message,
      401,
      path,
      details
    );
  }
  
  /**
   * Factory method to create forbidden error
   * 
   * @param message - Error message
   * @param details - Additional details (optional)
   * @param path - Request path (optional)
   * @returns New ZeroHttpError for forbidden access
   */
  public static forbidden(
    message: string = 'Access forbidden',
    details?: Record<string, unknown>,
    path?: string
  ): ZeroHttpError {
    return new ZeroHttpError(
      ZeroErrorCode.PERMISSION_DENIED,
      message,
      403,
      path,
      details
    );
  }
  
  /**
   * Factory method to create not found error
   * 
   * @param resource - Resource type that was not found
   * @param identifier - Resource identifier
   * @param path - Request path (optional)
   * @returns New ZeroHttpError for resource not found
   */
  public static notFound(
    resource: string,
    identifier: string,
    path?: string
  ): ZeroHttpError {
    return new ZeroHttpError(
      ZeroErrorCode.NOT_FOUND,
      `${resource} not found: ${identifier}`,
      404,
      path,
      { resource, identifier }
    );
  }
  
  /**
   * Factory method to create bad request error
   * 
   * @param message - Error message
   * @param validationErrors - Validation errors (optional)
   * @param path - Request path (optional)
   * @returns New ZeroHttpError for bad request
   */
  public static badRequest(
    message: string,
    validationErrors?: Record<string, string[]>,
    path?: string
  ): ZeroHttpError {
    return new ZeroHttpError(
      ZeroErrorCode.INVALID_ARGUMENT,
      message,
      400,
      path,
      { validationErrors }
    );
  }
  
  /**
   * Factory method to create rate limit error
   * 
   * @param limit - Rate limit
   * @param window - Rate limit window in seconds
   * @param retryAfter - When the client should retry
   * @param path - Request path (optional)
   * @returns New ZeroHttpError for rate limiting
   */
  public static rateLimited(
    limit: number,
    window: number,
    retryAfter: number,
    path?: string
  ): ZeroHttpError {
    return new ZeroHttpError(
      ZeroErrorCode.RATE_LIMITED,
      `Rate limit exceeded: ${limit} requests per ${window} seconds`,
      429,
      path,
      {
        limit,
        window,
        retryAfter
      }
    );
  }
  
  /**
   * Factory method to create internal server error
   * 
   * @param message - Error message (defaults to generic message)
   * @param cause - Original error (optional)
   * @param path - Request path (optional)
   * @returns New ZeroHttpError for internal server error
   */
  public static internal(
    message: string = 'Internal server error',
    cause?: Error,
    path?: string
  ): ZeroHttpError {
    // In production, use generic message to avoid leaking implementation details
    const safeMessage = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : message;
      
    return new ZeroHttpError(
      ZeroErrorCode.UNKNOWN,
      safeMessage,
      500,
      path,
      {},
      cause
    );
  }
  
  /**
   * Convert standard ZeroError to ZeroHttpError
   * 
   * @param error - Original ZeroError
   * @param path - Request path (optional)
   * @returns Converted ZeroHttpError
   */
  public static fromZeroError(error: ZeroError, path?: string): ZeroHttpError {
    return new ZeroHttpError(
      error.code,
      error.message,
      undefined,  // Use default status code mapping
      path,
      error.details,
      error.cause
    );
  }
}

/**
 * Generates a unique trace ID for error tracking
 * 
 * @returns Unique trace ID string
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}