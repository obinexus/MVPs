/**
 * String manipulation utilities for the Zero library
 * 
 * Provides secure string operations with:
 * - Constant-time comparison for sensitive strings
 * - Safe concatenation with boundary checking
 * - String splitting with secure handling
 * - Secure parsing and formatting
 */
import { CryptoFlags } from '../types/common';
import { ZeroError } from '../errors/ZeroError';
import { ZeroErrorCode } from '../types/error';
import { secureAlloc, secureFree, constantTimeCompare } from './memory';
import { IZeroData } from '@/encoding';

/**
 * Flags for string operations
 */
export enum StringFlags {
  NONE = 0,
  SECURE = 1 << 0,    // Use secure memory operations
  NO_ALLOC = 1 << 1,  // Don't allocate new memory, use provided buffer
  TRIM = 1 << 2,      // Trim whitespace from result
  NORMALIZE = 1 << 3  // Normalize Unicode strings
}

/**
 * Safely concatenates strings with size checking
 * 
 * @param dest - Destination string buffer
 * @param src - Source string to append
 * @param maxLength - Maximum allowed length for the resulting string
 * @returns Combined string
 * @throws ZeroError if resulting string would exceed maxLength
 */
export function safeConcat(dest: string, src: string, maxLength: number): string {
  if (typeof dest !== 'string' || typeof src !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Both arguments must be strings',
      { destType: typeof dest, srcType: typeof src }
    );
  }
  
  const combinedLength = dest.length + src.length;
  if (combinedLength > maxLength) {
    throw new ZeroError(
      ZeroErrorCode.BUFFER_TOO_SMALL,
      `String concatenation would exceed maximum length (${maxLength})`,
      { 
        destLength: dest.length,
        srcLength: src.length,
        combinedLength,
        maxLength,
        deficit: combinedLength - maxLength
      }
    );
  }
  
  return dest + src;
}


/**
 * Compares two strings in constant time
 * Prevents timing attacks when comparing sensitive strings
 * 
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal, false otherwise
 */
export function secureStringCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Both arguments must be strings',
      { aType: typeof a, bType: typeof b }
    );
  }
  
  // First check length equality (this leaks length information)
  if (a.length !== b.length) {
    return false;
  }
  
  // Convert strings to buffers for constant-time comparison
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  try {
    // Compare buffers in constant time
    return constantTimeCompare(bufferA, bufferB) === 0;
  } finally {
    // Clear buffers from memory
    bufferA.fill(0);
    bufferB.fill(0);
  }
}

/**
 * Splits a string into tokens with optional secure handling
 * 
 * @param str - String to split
 * @param delim - Delimiter to split on
 * @param maxTokens - Maximum number of tokens to return
 * @param flags - Operation flags
 * @returns Array of string tokens
 */
export function secureSplit(
  str: string,
  delim: string,
  maxTokens: number = Number.MAX_SAFE_INTEGER,
  flags: StringFlags = StringFlags.NONE
): string[] {
  if (typeof str !== 'string' || typeof delim !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'String and delimiter must be strings',
      { strType: typeof str, delimType: typeof delim }
    );
  }
  
  if (maxTokens <= 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Maximum tokens must be positive',
      { maxTokens }
    );
  }
  
  if (str.length === 0) {
    return [];
  }
  
  const useSecureMemory = (flags & StringFlags.SECURE) !== 0;
  const shouldTrim = (flags & StringFlags.TRIM) !== 0;
  const shouldNormalize = (flags & StringFlags.NORMALIZE) !== 0;
  
  // Create a copy of the string if using secure memory
  let strCopy: string;
  let bufferCopy: Buffer | null = null;

  try {    
    if (useSecureMemory) {
      // Allocate secure buffer and copy string data
      bufferCopy = secureAlloc(str.length * 4, CryptoFlags.SECURE_MEMORY);
      bufferCopy.write(str, 0, str.length, 'utf8');
      strCopy = bufferCopy.toString('utf8');
    } else {
      strCopy = str;
    }
    
    // Normalize if requested
    if (shouldNormalize) {
      strCopy = strCopy.normalize('NFC');
    }
    
    // Split the string
    const parts = strCopy.split(delim);
    const result: string[] = [];
    
    // Process tokens
    for (let i = 0; i < Math.min(parts.length, maxTokens); i++) {
      let token = parts[i];
      
      // Trim if requested
      if (shouldTrim) {
        token = token.trim();
      }
      
      // Skip empty tokens if trimming
      if (shouldTrim && token.length === 0) {
        continue;
      }
      
      result.push(token);
    }
    
    return result;
  } finally {
    // Clean up secure memory if used
    if (useSecureMemory && bufferCopy) {
      secureFree(bufferCopy);
    }
  }
}

/**
 * Truncates a string to a maximum length and adds ellipsis if needed
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum allowed length
 * @param ellipsis - String to append when truncated (default: "...")
 * @returns Truncated string
 * @throws ZeroError if parameters are invalid
 */
export function truncateString(
  str: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (typeof str !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a string',
      { inputType: typeof str }
    );
  }
  
  if (maxLength <= 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Maximum length must be positive',
      { maxLength }
    );
  }
  
  if (typeof ellipsis !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Ellipsis must be a string',
      { ellipsisType: typeof ellipsis }
    );
  }
  
  // If string is already short enough, return it unchanged
  if (str.length <= maxLength) {
    return str;
  }
  
  // If ellipsis is longer than maxLength, truncate ellipsis
  if (ellipsis.length >= maxLength) {
    return ellipsis.substring(0, maxLength);
  }
  
  // Calculate how much of the string we can include
  const contentLength = maxLength - ellipsis.length;
  
  // Truncate the string and add ellipsis
  return str.substring(0, contentLength) + ellipsis;
}

/**
 * Safely parses an integer with range validation
 * 
 * @param str - String to parse
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param defaultValue - Default value if parsing fails (optional)
 * @returns Parsed integer value
 * @throws ZeroError if parsing fails and no default value is provided
 */
export function safeParseInt(
  str: string,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER,
  defaultValue?: number
): number {
  if (typeof str !== 'string') {
    if (defaultValue !== undefined) {
      return validateRange(defaultValue, min, max);
    }
    
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a string',
      { inputType: typeof str }
    );
  }
  
  // Try to parse the string
  const trimmedStr = str.trim();
  const parsedValue = Number.parseInt(trimmedStr, 10);
  
  // Check if parsing was successful
  if (Number.isNaN(parsedValue) || !Number.isInteger(parsedValue)) {
    if (defaultValue !== undefined) {
      return validateRange(defaultValue, min, max);
    }
    
    throw new ZeroError(
      ZeroErrorCode.INVALID_FORMAT,
      `Failed to parse "${str}" as an integer`,
      { input: str }
    );
  }
  
  // Validate the parsed value against range
  return validateRange(parsedValue, min, max);
}

/**
 * Formats a binary buffer as a hexadecimal string
 * 
 * @param buffer - Buffer to format
 * @param upperCase - Whether to use uppercase letters (default: false)
 * @param prefix - Prefix to add (default: none)
 * @returns Hexadecimal string representation
 */
export function bufferToHex(
  buffer: Buffer | Uint8Array,
  upperCase: boolean = false,
  prefix: string = ''
): string {
  if (!buffer || !(buffer instanceof Buffer || buffer instanceof Uint8Array)) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a Buffer or Uint8Array',
      { inputType: buffer ? typeof buffer : 'null' }
    );
  }
  
  let result = '';
  for (let i = 0; i < buffer.length; i++) {
    const byteHex = buffer[i].toString(16).padStart(2, '0');
    result += upperCase ? byteHex.toUpperCase() : byteHex;
  }
  
  return prefix + result;
}


/**
 * Pads a string to a fixed length
 * 
 * @param input - Input string
 * @param length - Target length
 * @param padChar - Character to pad with
 * @param padEnd - Whether to pad at end (true) or beginning (false)
 * @returns Padded string
 */

export function padToLength(
  input: string,
  length: number,
  padChar: string = ' ',
  padEnd: boolean = true
): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  if (input.length >= length) {
    return input;
  }
  
  const paddingLength = length - input.length;
  const padding = padChar.repeat(paddingLength);
  
  return padEnd ? input + padding : padding + input;
}



/**
 * Converts a hexadecimal string to a buffer
 * 
 * @param hex - Hexadecimal string
 * @param allowPrefix - Whether to allow '0x' prefix (default: true)
 * @returns Buffer containing the decoded bytes
 * @throws ZeroError if the input is not a valid hexadecimal string
 */
export function hexToBuffer(hex: string, allowPrefix: boolean = true): Buffer {
  if (typeof hex !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a string',
      { inputType: typeof hex }
    );
  }
  
  // Remove 0x prefix if present and allowed
  let processedHex = hex;
  if (allowPrefix && hex.startsWith('0x')) {
    processedHex = hex.slice(2);
  }
  
  // Validate hex string format
  if (!isValidHex(processedHex)) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_HEX,
      'Input is not a valid hexadecimal string',
      { input: hex }
    );
  }
  
  // Ensure even length by padding with leading zero if needed
  if (processedHex.length % 2 !== 0) {
    processedHex = '0' + processedHex;
  }
  
  // Convert to buffer
  const buffer = Buffer.alloc(processedHex.length / 2);
  for (let i = 0; i < processedHex.length; i += 2) {
    const byteValue = parseInt(processedHex.substring(i, i + 2), 16);
    buffer[i / 2] = byteValue;
  }
  
  return buffer;
}

/**
 * Masks sensitive parts of a string for logging/display
 * 
 * @param input - String containing sensitive data
 * @param visibleStartChars - Number of characters to show at start
 * @param visibleEndChars - Number of characters to show at end
 * @param maskChar - Character to use for masking (default: '*')
 * @returns Masked string
 */
export function maskSensitiveString(
  input: string,
  visibleStartChars: number = 4,
  visibleEndChars: number = 4,
  maskChar: string = '*'
): string {
  if (typeof input !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a string',
      { inputType: typeof input }
    );
  }
  
  if (visibleStartChars < 0 || visibleEndChars < 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Visible character counts must be non-negative',
      { visibleStartChars, visibleEndChars }
    );
  }
  
  if (typeof maskChar !== 'string' || maskChar.length !== 1) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Mask character must be a single character',
      { maskChar }
    );
  }
  
  const inputLength = input.length;
  
  // If string is too short to mask meaningfully, mask everything
  if (inputLength <= visibleStartChars + visibleEndChars) {
    return maskChar.repeat(inputLength);
  }
  
  const start = input.substring(0, visibleStartChars);
  const end = input.substring(inputLength - visibleEndChars);
  const maskedLength = inputLength - visibleStartChars - visibleEndChars;
  const maskedPart = maskChar.repeat(maskedLength);
  
  return start + maskedPart + end;
}

/**
 * Sanitizes a string for secure usage
 * Removes control characters and normalizes whitespace
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove control characters
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;

}


/**
 * Safely removes sensitive data patterns from a string
 * 
 * @param input - Input string
 * @returns Sanitized string
 */
export function removeSensitiveData(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Replace potential API keys, tokens, passwords
  let sanitized = input.replace(/(['"]?(?:api_?key|token|secret|password|pwd)['"]?\s*[:=]\s*)['"]?.+?['"]?/gi, '$1[REDACTED]');
  
  // Replace potential private keys
  sanitized = sanitized.replace(/-----BEGIN PRIVATE KEY-----(.|\n)+?-----END PRIVATE KEY-----/g, '[PRIVATE KEY REDACTED]');
  
  // Replace potential emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
  
  return sanitized;
}
/**
 * Normalizes string representation of boolean values
 * 
 * @param value - String to normalize
 * @returns Normalized boolean string ('true' or 'false')
 */
export function normalizeBooleanString(value: string): string {
  if (typeof value !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a string',
      { inputType: typeof value }
    );
  }
  
  const normalized = value.trim().toLowerCase();
  
  // Check for common true values
  if (['true', 'yes', 'y', '1', 'on', 'enable', 'enabled', 't'].includes(normalized)) {
    return 'true';
  }
  
  // Check for common false values
  if (['false', 'no', 'n', '0', 'off', 'disable', 'disabled', 'f'].includes(normalized)) {
    return 'false';
  }
  
  throw new ZeroError(
    ZeroErrorCode.INVALID_FORMAT,
    `Cannot normalize "${value}" as a boolean string`,
    { input: value }
  );
}


/**
 * Normalizes data values for consistent encoding
 * 
 * @param data - Data structure to normalize
 * @returns New data structure with normalized values
 */
export function normalizeDataValues(data: IZeroData): IZeroData {
  if (!data || !data.keys || !data.values) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Invalid data structure',
      { data }
    );
  }
  
  // Create normalized values
  const normalizedValues = data.values.map(value => {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Ensure value is a string
    const strValue = String(value);
    
    // Trim whitespace
    return strValue.trim();
  });
  
  // Create new data structure
  const normalizedData: IZeroData = {
    keys: [...data.keys],
    values: normalizedValues,
    count: data.count
  };
  
  return normalizedData;
}


/**
 * Sorts object keys alphabetically for consistent order
 * 
 * @param data - Data structure to sort
 * @returns New data structure with sorted keys
 */
export function sortObjectKeys(data: IZeroData): IZeroData {
  if (!data || !data.keys || !data.values) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Invalid data structure',
      { data }
    );
  }
  
  // Create array of key-value pairs
  const pairs = data.keys.map((key, index) => ({
    key,
    value: data.values[index]
  }));
  
  // Sort pairs by key (case-insensitive)
  pairs.sort((a, b) => a.key.toLowerCase().localeCompare(b.key.toLowerCase()));
  
  // Rebuild data structure
  const sortedData: IZeroData = {
    keys: pairs.map(p => p.key),
    values: pairs.map(p => p.value),
    count: data.count
  };
  
  return sortedData;
}
// ===== Helper functions =====

/**
 * Validates that a number is within the specified range
 */
function validateRange(value: number, min: number, max: number): number {
  if (value < min) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      `Value ${value} is less than minimum allowed value ${min}`,
      { value, min, max }
    );
  }
  
  if (value > max) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      `Value ${value} is greater than maximum allowed value ${max}`,
      { value, min, max }
    );
  }
  
  return value;
}
/**
 * Safely truncates a string to a maximum length
 * 
 * @param input - Input string
 * @param maxLength - Maximum length
 * @param ellipsis - Whether to add ellipsis if truncated
 * @returns Truncated string
 */
export function safeTruncate(
  input: string,
  maxLength: number,
  ellipsis: boolean = false
): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  if (input.length <= maxLength) {
    return input;
  }
  
  const truncated = input.slice(0, maxLength);
  return ellipsis ? `${truncated}...` : truncated;
}


/**
 * Safely splits a string with proper error handling
 * 
 * @param input - Input string
 * @param separator - Separator string
 * @returns Array of substrings
 */
export function safeSplit(input: string, separator: string): string[] {
  if (typeof input !== 'string') {
    return [];
  }
  
  try {
    return input.split(separator);
  } catch (err) {
    return [input];
  }

}



/**
 * Checks if a string is a valid hexadecimal string
 */
function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]*$/.test(str);
}

/**
 * Converts a URL-safe base64 string to a buffer
 * 
 * @param base64url - URL-safe base64 string
 * @returns Decoded buffer
 * @throws ZeroError if the input is not a valid base64url string
 */
export function fromBase64Url(base64url: string): Buffer {
  if (typeof base64url !== 'string') {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Input must be a string',
      { inputType: typeof base64url }
    );
  }

  if (!/^[-A-Za-z0-9_]*$/.test(base64url)) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_FORMAT,
      'Invalid base64url string',
      { input: base64url }
    );
  }

  // Add padding if needed
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  
  return Buffer.from(base64, 'base64');
}

/**
 * Converts a buffer to a URL-safe base64 string
 * 
 * @param buffer - Buffer to encode
 * @returns URL-safe base64 string
 */
export function toBase64Url(buffer: Buffer | Uint8Array): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

