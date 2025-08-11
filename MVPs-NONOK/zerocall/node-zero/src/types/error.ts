/**
 * Error types and definitions for the Zero library
 */

/**
 * Comprehensive error codes for all possible error conditions
 */
export enum ZeroErrorCode {
  // Success (no error)
  SUCCESS = 0,
  // General errors (1000-1099)
  INVALID_ARGUMENT = 1000,
  OUT_OF_MEMORY = 1001,
  BUFFER_TOO_SMALL = 1002,
  INVALID_FORMAT = 1003,
  IO_ERROR = 1004,
  PERMISSION_DENIED = 1005,
  NOT_FOUND = 1006,
  ALREADY_EXISTS = 1007,
  TIMEOUT = 1008,
  CANCELED = 1009,
  UNKNOWN = 1099,
  
  // Cryptographic errors (1100-1199)
  CRYPTO_FAILURE = 1100,
  UNSUPPORTED_ALGORITHM = 1101,
  WEAK_KEY = 1102,
  INVALID_KEY = 1103,
  INVALID_SIGNATURE = 1104,
  INVALID_CERTIFICATE = 1105,
  INVALID_HASH = 1106,
  INVALID_PADDING = 1107,
  INVALID_MAC = 1108,
  RANDOM_SOURCE_FAILURE = 1109,
  HASH_MISMATCH = 1110,
  
  // Initialization errors (1200-1299)
  NOT_INITIALIZED = 1200,
  ALREADY_INITIALIZED = 1201,
  INITIALIZATION_FAILED = 1202,
  
  // Encoding errors (1300-1399)
  INVALID_CHARACTER = 1300,
  INVALID_ENCODING = 1301,
  INVALID_BASE64 = 1302,
  INVALID_HEX = 1303,
  INVALID_UTF8 = 1304,
  ENCODING_FAILED = 1305,
  INVALID_SALT = 1306,
  
  // Verification errors (1400-1499)
  VERIFICATION_FAILED = 1400,
  EXPIRED = 1401,
  REVOKED = 1402,
  INVALID_CHALLENGE = 1403,
  INVALID_PROOF = 1404,
  INVALID_IDENTITY = 1405,
  INVALID_STATE = 1406,

  // Network errors (1500-1599)
  NETWORK_ERROR = 1500,
  CONNECTION_FAILED = 1501,
  INVALID_RESPONSE = 1502,
  
  // Limits exceeded (1600-1699)
  MAX_ATTEMPTS_EXCEEDED = 1600,
  MAX_SIZE_EXCEEDED = 1601,
  RATE_LIMITED = 1602,
  
  // Compatibility errors (1700-1799)
  VERSION_MISMATCH = 1700,
  UNSUPPORTED_VERSION = 1701,
  UNSUPPORTED_PLATFORM = 1702,
  UNSUPPORTED_FEATURE = 1703,
  
  // Security errors (1800-1899)
  SECURE_MODE_REQUIRED = 1800,
  INSECURE_OPERATION = 1801,
  POTENTIAL_SECURITY_VULNERABILITY = 1802,
  INVALID_SALT_LENGTH = 1803,
  INVALID_NONCE_LENGTH = 1804,
  TAMPERING_DETECTED = 1805,
}
  /**
   * Interface for error information including code, message, and optional details
   */
  export interface IZeroErrorInfo {
    code: ZeroErrorCode;
    message: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }
  
  /**
   * Result type for operations that may succeed or fail
   * Provides a structured way to handle errors with detailed information
   */
  export type ZeroResult<T> = 
    | { success: true; value: T }
    | { success: false; error: IZeroErrorInfo };
  
  /**
   * Type guard to check if a value is a valid ZeroErrorInfo
   * @param value The value to check
   * @returns True if the value is a valid ZeroErrorInfo
   */
  export function isZeroErrorInfo(value: unknown): value is IZeroErrorInfo {
    if (!value || typeof value !== 'object') {
      return false;
    }
    
    const candidate = value as Partial<IZeroErrorInfo>;
    
    return (
      typeof candidate.code === 'number' &&
      Object.values(ZeroErrorCode).includes(candidate.code) &&
      typeof candidate.message === 'string' &&
      (candidate.details === undefined || typeof candidate.details === 'object') &&
      (candidate.cause === undefined || candidate.cause instanceof Error)
    );
  }
  
  /**
   * Type guard to check if a value is a successful ZeroResult
   * @param result The result to check
   * @returns True if the result represents a success
   */
  export function isSuccessResult<T>(result: ZeroResult<T>): result is { success: true; value: T } {
    return result.success === true;
  }
  
  /**
   * Type guard to check if a value is a failed ZeroResult
   * @param result The result to check
   * @returns True if the result represents a failure
   */
  export function isErrorResult<T>(result: ZeroResult<T>): result is { success: false; error: IZeroErrorInfo } {
    return result.success === false;
  }
  
  /**
   * Creates a success result
   * @param value The success value
   * @returns A success result containing the value
   */
  export function createSuccessResult<T>(value: T): ZeroResult<T> {
    return { success: true, value };
  }
  
  /**
   * Creates an error result
   * @param code The error code
   * @param message The error message
   * @param details Optional additional error details
   * @param cause Optional cause of the error
   * @returns An error result with the specified information
   */
  export function createErrorResult<T>(
    code: ZeroErrorCode,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): ZeroResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        cause
      }
    };
  }