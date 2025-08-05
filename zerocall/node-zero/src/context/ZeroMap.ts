/**
 * Implementation of encoding map for the Zero library
 * 
 * The ZeroMap provides bidirectional character mapping for encoding and decoding
 * operations with validation and secure memory handling. It supports custom
 * character sets and maintains forward/reverse mappings.
 */
import { ZeroError } from '../errors/index.js';
import { ZeroErrorCode } from '../types/index.js';
import { IZeroMap } from '../types/index.js';
import { CryptoFlags } from '../types/index.js';
import { ENCODING } from '../utils/index.js';
// import { secureAlloc, secureFree } from '../utils/';

/**
 * Implementation of encoding map for character mapping operations
 */
export class ZeroMap implements IZeroMap {
  /**
   * Forward mapping (index to character)
   */
  public readonly forward: string;
  
  /**
   * Reverse mapping (character to index)
   */
  public readonly reverse: Record<string, number>;
  
  /**
   * Size of encoding alphabet
   */
  public readonly size: number;
  
  /**
   * Operation flags
   */
  public readonly flags: number;
  
  /**
   * Creates a new encoding map
   * 
   * @param charset - Character set for encoding
   * @param flags - Security flags for operations
   * @throws ZeroError if charset is invalid
   */
  constructor(charset: string, flags: number = CryptoFlags.SECURE_MEMORY) {
    if (!charset || typeof charset !== 'string' || charset.length === 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Character set must be a non-empty string',
        { charsetType: typeof charset, charsetLength: charset?.length ?? 0 }
      );
    }
    
    // Validate charset has no duplicate characters
    this.validateCharset(charset);
    
    this.forward = charset;
    this.size = charset.length;
    this.flags = flags;
    this.reverse = this.generateReverseMapping(charset);
  }
  
  /**
   * Encodes data using the mapping
   * 
   * @param input - Input data to encode
   * @param inputSize - Size of input data
   * @param output - Output buffer
   * @param outputSize - Size of output buffer (in/out)
   * @returns ZeroError.SUCCESS if successful
   * @throws ZeroError if parameters are invalid or buffer is too small
   */
  public encode(
    input: Buffer | Uint8Array,
    inputSize: number,
    output: Buffer | Uint8Array,
    outputSize: { value: number }
  ): void {
    // Validate parameters
    this.validateEncodeParameters(input, inputSize, output, outputSize);
    
    // Check output buffer size
    if (outputSize.value < inputSize) {
      throw new ZeroError(
        ZeroErrorCode.BUFFER_TOO_SMALL,
        'Output buffer too small for encoding operation',
        { 
          inputSize,
          outputSize: outputSize.value,
          requiredSize: inputSize
        }
      );
    }
    
    // Perform encoding
    for (let i = 0; i < inputSize; i++) {
      const idx = input[i];
      
      // Check for valid index
      if (idx >= this.size) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_CHARACTER,
          `Invalid character index: ${idx} (exceeds charset size ${this.size})`,
          { index: idx, maxIndex: this.size - 1 }
        );
      }
      
      output[i] = this.forward.charCodeAt(idx);
    }
    
    // Set actual output size
    outputSize.value = inputSize;
  }
  
  /**
   * Decodes data using the mapping
   * 
   * @param input - Input data to decode
   * @param inputSize - Size of input data
   * @param output - Output buffer
   * @param outputSize - Size of output buffer (in/out)
   * @returns ZeroError.SUCCESS if successful
   * @throws ZeroError if parameters are invalid or buffer is too small
   */
  public decode(
    input: Buffer | Uint8Array,
    inputSize: number,
    output: Buffer | Uint8Array,
    outputSize: { value: number }
  ): void {
    // Validate parameters
    this.validateDecodeParameters(input, inputSize, output, outputSize);
    
    // Check output buffer size
    if (outputSize.value < inputSize) {
      throw new ZeroError(
        ZeroErrorCode.BUFFER_TOO_SMALL,
        'Output buffer too small for decoding operation',
        { 
          inputSize,
          outputSize: outputSize.value,
          requiredSize: inputSize
        }
      );
    }
    
    // Perform decoding
    for (let i = 0; i < inputSize; i++) {
      const char = String.fromCharCode(input[i]);
      const idx = this.reverse[char];
      
      // Check for valid character
      if (idx === undefined) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_CHARACTER,
          `Invalid character: "${char}" (not in charset)`,
          { character: char, charCode: input[i] }
        );
      }
      
      output[i] = idx;
    }
    
    // Set actual output size
    outputSize.value = inputSize;
  }
  
  /**
   * Creates a clone of this encoding map
   * 
   * @returns New ZeroMap instance with the same configuration
   */
  public clone(): ZeroMap {
    return new ZeroMap(this.forward, this.flags);
  }
  
  /**
   * Creates a new encoding map with the specified character set
   * 
   * @param charset - Character set for encoding
   * @param flags - Security flags for operations
   * @returns New ZeroMap instance
   * @throws ZeroError if charset is invalid
   */
  public static create(charset: string, flags: number = CryptoFlags.SECURE_MEMORY): ZeroMap {
    return new ZeroMap(charset, flags);
  }
  
  /**
   * Creates an encoding map with standard base64 encoding
   * 
   * @param flags - Security flags for operations
   * @returns New ZeroMap instance for base64 encoding
   */
  public static createBase64(flags: number = CryptoFlags.SECURE_MEMORY): ZeroMap {
    return new ZeroMap(ENCODING.BASE64_ALPHABET, flags);
  }
  
  /**
   * Creates an encoding map with URL-safe base64 encoding
   * 
   * @param flags - Security flags for operations
   * @returns New ZeroMap instance for URL-safe base64 encoding
   */
  public static createBase64Url(flags: number = CryptoFlags.SECURE_MEMORY): ZeroMap {
    return new ZeroMap(ENCODING.BASE64URL_ALPHABET, flags);
  }
  
  /**
   * Creates an encoding map with hexadecimal encoding
   * 
   * @param uppercase - Whether to use uppercase letters
   * @param flags - Security flags for operations
   * @returns New ZeroMap instance for hexadecimal encoding
   */
  public static createHex(
    uppercase: boolean = false,
    flags: number = CryptoFlags.SECURE_MEMORY
  ): ZeroMap {
    const charset = uppercase 
      ? ENCODING.HEX_ALPHABET.toUpperCase()
      : ENCODING.HEX_ALPHABET;
    
    return new ZeroMap(charset, flags);
  }
  
  /**
   * Creates an encoding map with base58 encoding (Bitcoin-style)
   * 
   * @param flags - Security flags for operations
   * @returns New ZeroMap instance for base58 encoding
   */
  public static createBase58(flags: number = CryptoFlags.SECURE_MEMORY): ZeroMap {
    return new ZeroMap(ENCODING.BASE58_ALPHABET, flags);
  }
  
  // ===== Private helper methods =====
  
  /**
   * Validates the character set for duplicate characters
   */
  private validateCharset(charset: string): void {
    const seen = new Set<string>();
    
    for (let i = 0; i < charset.length; i++) {
      const char = charset[i];
      
      if (seen.has(char)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          `Duplicate character "${char}" in charset at position ${i}`,
          { character: char, position: i, firstSeen: charset.indexOf(char) }
        );
      }
      
      seen.add(char);
    }
    
    // Additional validation for allowed size range
    if (charset.length < 2 || charset.length > 256) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        `Charset size ${charset.length} outside valid range (2-256)`,
        { charsetSize: charset.length, minSize: 2, maxSize: 256 }
      );
    }
  }
  
  /**
   * Generates reverse mapping from character to index
   */
  private generateReverseMapping(charset: string): Record<string, number> {
    const reverse: Record<string, number> = {};
    
    for (let i = 0; i < charset.length; i++) {
      reverse[charset[i]] = i;
    }
    
    return reverse;
  }
  
  /**
   * Validates encode operation parameters
   */
  private validateEncodeParameters(
    input: Buffer | Uint8Array,
    inputSize: number,
    output: Buffer | Uint8Array,
    outputSize: { value: number }
  ): void {
    if (!input || !(input instanceof Buffer || input instanceof Uint8Array)) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Input must be a Buffer or Uint8Array',
        { inputType: input ? typeof input : 'null' }
      );
    }
    
    if (inputSize < 0 || inputSize > input.length) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Input size is invalid',
        { inputSize, bufferLength: input.length }
      );
    }
    
    if (!output || !(output instanceof Buffer || output instanceof Uint8Array)) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Output must be a Buffer or Uint8Array',
        { outputType: output ? typeof output : 'null' }
      );
    }
    
    if (!outputSize || typeof outputSize.value !== 'number' || outputSize.value < 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Output size must be a non-negative number',
        { outputSizeType: outputSize ? typeof outputSize.value : 'null' }
      );
    }
  }
  
  /**
   * Validates decode operation parameters
   */
  private validateDecodeParameters(
    input: Buffer | Uint8Array,
    inputSize: number,
    output: Buffer | Uint8Array,
    outputSize: { value: number }
  ): void {
    // Reuse encode parameter validation
    this.validateEncodeParameters(input, inputSize, output, outputSize);
  }
}