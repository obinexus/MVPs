/**
 * Base64 steganography implementation for secure data hiding
 * 
 * Allows for hiding sensitive data within base64-encoded images or documents
 * while maintaining cryptographic security properties.
 */
import crypto from 'crypto';
import { ZeroError } from '../../errors/ZeroError.js';
import { ZeroErrorCode } from '../../types/error.js';
import { deriveHmacKey, HmacKeyOptions } from './hmac.js';
import { secureAlloc, secureFree } from '../../utils/memory.js';
import { CryptoFlags } from '../../types/common.js';
import { HashAlgorithm } from '../hash.js';

/**
 * Options for steganography operations
 */
export interface SteganographyOptions extends HmacKeyOptions {
  /**
   * Password for encryption
   */
  password?: string | Buffer;
  
  /**
   * Spread factor for embedding data (higher means more spread out)
   */
  spreadFactor?: number;
  
  /**
   * Bits per pixel to use for embedding (1-3)
   */
  bitsPerPixel?: number;
}

/**
 * Default options for steganography
 */
const DEFAULT_STEG_OPTIONS: SteganographyOptions = {
  algorithm: HashAlgorithm.SHA512,
  flags: CryptoFlags.SECURE_MEMORY,
  iterations: 1,
  spreadFactor: 8,
  bitsPerPixel: 1
};

/**
 * Encodes data into a base64 image using steganography
 * 
 * @param imageData - Original image data (Buffer)
 * @param secretData - Secret data to encode
 * @param options - Encoding options
 * @returns Base64 encoded image with hidden data
 */
export function encodeIntoBase64Image(
  imageData: Buffer,
  secretData: Buffer | string,
  options?: Partial<SteganographyOptions>
): string {
  if (!imageData || !secretData) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Image data and secret data are required',
      { imageProvided: !!imageData, secretProvided: !!secretData }
    );
  }

  // Apply default options
  const opts: SteganographyOptions = { ...DEFAULT_STEG_OPTIONS, ...options };

  try {
    // Convert secret data to buffer if it's a string
    const secretBuffer = typeof secretData === 'string' 
      ? Buffer.from(secretData, 'utf8') 
      : secretData;

    // Prepare password if provided
    let keyBuffer: Buffer;
    if (opts.password) {
      // Derive key from password
      const passwordBuffer = typeof opts.password === 'string' 
        ? Buffer.from(opts.password, 'utf8') 
        : opts.password;
      
      // Create a salt for key derivation
      const salt = opts.salt || crypto.randomBytes(16);
      
      // Store the salt for later use in options
      if (!opts.salt) {
        opts.salt = salt;
      }
      
      // Derive encryption key from password - ensure 32 bytes for AES-256-GCM
      keyBuffer = deriveHmacKey(passwordBuffer, salt, {
        algorithm: opts.algorithm,
        iterations: 10000, // Higher iteration count for password-based derivation
        salt,
        flags: opts.flags
      });
      
      // Ensure key is exactly 32 bytes (256 bits) for AES-256-GCM
      if (keyBuffer.length !== 32) {
        // Create a new buffer of the correct size to avoid reusing
        const adjustedKey = Buffer.alloc(32);
        
        // If key is too long, truncate; if too short, pad with zeros
        const copyLength = Math.min(keyBuffer.length, 32);
        keyBuffer.copy(adjustedKey, 0, 0, copyLength);
        
        // Securely free the original buffer
        secureFree(keyBuffer);
        
        keyBuffer = adjustedKey;
      }
    } else {
      // Use a random key if no password provided - exactly 32 bytes
      keyBuffer = crypto.randomBytes(32);
    }

    // Encrypt the secret data
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    // Use separate buffers for update and final to avoid buffer reuse issues
    const encryptedDataPart1 = cipher.update(secretBuffer);
    const encryptedDataPart2 = cipher.final();
    
    // Combine encrypted data parts
    const encryptedData = Buffer.concat([encryptedDataPart1, encryptedDataPart2]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine salt, IV, auth tag and encrypted data
    const dataToEmbed = Buffer.concat([
      opts.salt || Buffer.alloc(0),
      iv,
      authTag,
      encryptedData
    ]);

    // Compute HMAC of the encrypted data for integrity verification
    // Create a new instance of HMAC to avoid reuse
    const hmacInstance = crypto.createHmac(
      getAlgorithmName(opts.algorithm),
      keyBuffer
    );
    hmacInstance.update(dataToEmbed);
    const signature = hmacInstance.digest();

    // Combine signature and data
    const fullDataToEmbed = Buffer.concat([
      Buffer.from([opts.salt ? 1 : 0]), // Flag for salt presence
      Buffer.from([signature.length]), // Signature length
      signature,
      dataToEmbed
    ]);

    // Embed the data into the image using steganography
    const resultImage = embedDataInImage(imageData, fullDataToEmbed, opts);

    // Convert to base64
    const base64Image = resultImage.toString('base64');

    // Clean up sensitive data
    secureFree(keyBuffer);
    
    return base64Image;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to encode data into image',
      { imageSize: imageData.length },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Decodes hidden data from a base64 image
 * 
 * @param base64Image - Base64 encoded image with hidden data
 * @param password - Password for decryption if data is encrypted
 * @param options - Decoding options
 * @returns Decoded secret data
 */
export function decodeFromBase64Image(
  base64Image: string,
  password?: string | Buffer,
  options?: Partial<SteganographyOptions>
): Buffer {
  if (!base64Image) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Base64 image data is required',
      { base64Provided: !!base64Image }
    );
  }

  // Apply default options
  const opts: SteganographyOptions = { ...DEFAULT_STEG_OPTIONS, ...options };

  let keyBuffer: Buffer | null = null;
  
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Extract embedded data
    const extractedData = extractDataFromImage(imageBuffer, opts);

    // Extract signature and actual data
    const hasSalt = extractedData[0] === 1;
    const signatureLength = extractedData[1];
    const signature = extractedData.slice(2, 2 + signatureLength);
    const embeddedData = extractedData.slice(2 + signatureLength);

    // Determine salt, IV, auth tag positions
    let position = 0;
    
    // Extract salt if present
    let salt: Buffer;
    if (hasSalt) {
      salt = Buffer.from(embeddedData.slice(position, position + 16));
      position += 16;
    } else {
      salt = Buffer.alloc(0);
    }

    // Extract IV and auth tag
    const iv = Buffer.from(embeddedData.slice(position, position + 16));
    position += 16;
    
    const authTag = Buffer.from(embeddedData.slice(position, position + 16));
    position += 16;
    
    // The rest is the encrypted data
    const encryptedData = Buffer.from(embeddedData.slice(position));

    // Derive key from password if provided
    if (password) {
      const passwordBuffer = typeof password === 'string' 
        ? Buffer.from(password, 'utf8') 
        : Buffer.from(password);
      
      // Derive decryption key
      keyBuffer = deriveHmacKey(passwordBuffer, salt, {
        algorithm: opts.algorithm,
        iterations: 10000,
        salt: Buffer.from(salt),
        flags: opts.flags
      });
      
      // Ensure key is exactly 32 bytes for AES-256-GCM
      if (keyBuffer.length !== 32) {
        // Create a new buffer of the correct size
        const adjustedKey = Buffer.alloc(32);
        
        // If key is too long, truncate; if too short, pad with zeros
        const copyLength = Math.min(keyBuffer.length, 32);
        keyBuffer.copy(adjustedKey, 0, 0, copyLength);
        
        // Securely free the original buffer
        secureFree(keyBuffer);
        
        keyBuffer = adjustedKey;
      }
    } else {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Password is required for decryption',
        {}
      );
    }

    // Verify integrity using HMAC
    // Create a new HMAC instance
    const hmacInstance = crypto.createHmac(
      getAlgorithmName(opts.algorithm),
      keyBuffer
    );
    hmacInstance.update(embeddedData);
    const computedSignature = hmacInstance.digest();

    // Verify signature in constant time
    if (!crypto.timingSafeEqual(signature, computedSignature)) {
      throw new ZeroError(
        ZeroErrorCode.VERIFICATION_FAILED,
        'Data integrity verification failed',
        {}
      );
    }

    // Decrypt the data
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    // Use separate buffers for update and final to avoid buffer reuse issues
    const decryptedDataPart1 = decipher.update(encryptedData);
    const decryptedDataPart2 = decipher.final();
    
    // Combine decrypted data parts
    const decryptedData = Buffer.concat([decryptedDataPart1, decryptedDataPart2]);

    return decryptedData;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to decode data from image',
      {},
      err instanceof Error ? err : undefined
    );
  } finally {
    // Clean up sensitive data
    if (keyBuffer) {
      secureFree(keyBuffer);
    }
  }
}

/**
 * Embeds data into an image using LSB steganography
 * 
 * @param imageData - Original image data
 * @param dataToEmbed - Data to embed in the image
 * @param options - Embedding options
 * @returns Modified image with embedded data
 */
function embedDataInImage(
  imageData: Buffer,
  dataToEmbed: Buffer,
  options: SteganographyOptions
): Buffer {
  // Create a copy of the image to modify
  const resultImage = Buffer.from(imageData);
  
  // Calculate maximum data capacity (simplified)
  const maxCapacity = Math.floor(imageData.length * options.bitsPerPixel! / 8);
  
  if (dataToEmbed.length + 4 > maxCapacity) {
    throw new ZeroError(
      ZeroErrorCode.BUFFER_TOO_SMALL,
      'Image too small to embed the data',
      { 
        dataSize: dataToEmbed.length, 
        maxCapacity: maxCapacity - 4
      }
    );
  }
  
  // Embed data length first (4 bytes)
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(dataToEmbed.length, 0);
  
  // Combine length and data
  const fullData = Buffer.concat([lengthBuffer, dataToEmbed]);
  
  // Generate spread pattern based on a seed from the options
  const spreadSeed = options.salt ? Buffer.from(options.salt) : crypto.randomBytes(4);
  const spreadPattern = generateSpreadPattern(
    imageData.length, 
    fullData.length * 8 / options.bitsPerPixel!,
    spreadSeed,
    options.spreadFactor!
  );
  
  // Track bits embedded so far
  let bitsEmbedded = 0;
  
  // For each byte in the data
  for (let dataIndex = 0; dataIndex < fullData.length; dataIndex++) {
    const dataByte = fullData[dataIndex];
    
    // For each bit in the byte
    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
      // Get the bit value
      const bitValue = (dataByte >> (7 - bitIndex)) & 1;
      
      // Calculate how many image bits to use for this data bit
      for (let k = 0; k < options.bitsPerPixel!; k++) {
        // Get the position in the image
        const imagePos = spreadPattern[bitsEmbedded];
        
        // Clear the LSB and set it to the bit value
        resultImage[imagePos] = (resultImage[imagePos] & 0xFE) | bitValue;
        
        bitsEmbedded++;
      }
    }
  }
  
  return resultImage;
}

/**
 * Extracts embedded data from an image
 * 
 * @param imageData - Image data with embedded information
 * @param options - Extraction options
 * @returns Extracted data buffer
 */
function extractDataFromImage(
  imageData: Buffer,
  options: SteganographyOptions
): Buffer {
  // First, read the data length (4 bytes)
  let lengthBuffer = Buffer.alloc(4);
  
  // Generate the same spread pattern
  const spreadSeed = options.salt ? Buffer.from(options.salt) : Buffer.from([0, 0, 0, 0]);
  
  // Extract first 32 bits to get the length
  const initialSpreadPattern = generateSpreadPattern(
    imageData.length,
    32 / options.bitsPerPixel!,
    spreadSeed,
    options.spreadFactor!
  );
  
  // Extract the length value
  for (let i = 0; i < 32; i++) {
    // Calculate which image bit to read
    const imagePos = initialSpreadPattern[Math.floor(i / options.bitsPerPixel!)];
    const bitOffset = 7 - (i % 8);
    const byteIndex = Math.floor(i / 8);
    
    // Read the LSB from the image
    const bitValue = imageData[imagePos] & 1;
    
    // Set the bit in the length buffer
    if (bitValue) {
      lengthBuffer[byteIndex] |= (1 << bitOffset);
    }
  }
  
  // Read the actual data length
  const dataLength = lengthBuffer.readUInt32BE(0);
  
  // Validate the length
  const maxCapacity = Math.floor(imageData.length * options.bitsPerPixel! / 8) - 4;
  if (dataLength <= 0 || dataLength > maxCapacity) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_FORMAT,
      'Invalid embedded data length detected',
      { detectedLength: dataLength, maxCapacity }
    );
  }
  
  // Generate spread pattern for the full data
  const dataSpreadPattern = generateSpreadPattern(
    imageData.length,
    (dataLength + 4) * 8 / options.bitsPerPixel!,
    spreadSeed,
    options.spreadFactor!
  );
  
  // Allocate buffer for the extracted data
  const resultBuffer = Buffer.alloc(dataLength + 4);
  
  // Copy the length we already extracted
  lengthBuffer.copy(resultBuffer, 0, 0, 4);
  
  // Extract the actual data bits
  for (let i = 32; i < (dataLength + 4) * 8; i++) {
    // Calculate which image bit to read
    const imagePos = dataSpreadPattern[Math.floor(i / options.bitsPerPixel!)];
    const bitOffset = 7 - (i % 8);
    const byteIndex = Math.floor(i / 8);
    
    // Read the LSB from the image
    const bitValue = imageData[imagePos] & 1;
    
    // Set the bit in the result buffer
    if (bitValue) {
      resultBuffer[byteIndex] |= (1 << bitOffset);
    }
  }
  
  // Return just the data part (skip the length header)
  return resultBuffer.slice(4);
}

/**
 * Generates a spreading pattern for data embedding
 * 
 * @param imageSize - Size of the image in bytes
 * @param dataSize - Size of data in bits
 * @param seed - Seed for deterministic spreading
 * @param spreadFactor - How spread out the data should be
 * @returns Array of image positions for data bits
 */
function generateSpreadPattern(
  imageSize: number,
  dataSize: number,
  seed: Buffer,
  spreadFactor: number
): number[] {
  // Create a deterministic PRNG based on the seed
  // Create a new HMAC instance to avoid reuse
  const hmacInstance = crypto.createHmac('sha256', seed);
  hmacInstance.update(Buffer.from([spreadFactor]));
  let prngSeed = hmacInstance.digest();
  
  // Create a pattern array
  const pattern: number[] = [];
  
  // Start position based on seed
  let position = prngSeed.readUInt32BE(0) % imageSize;
  
  // Step size based on seed and spread factor
  const step = Math.max(1, Math.floor(imageSize / (dataSize * spreadFactor)));
  
  // Generate positions
  for (let i = 0; i < dataSize; i++) {
    // Add position to pattern
    pattern.push(position % imageSize);
    
    // Update position using PRNG
    if (i % 32 === 31) {
      // Refresh PRNG state every 32 iterations
      // Create a new HMAC instance to avoid reuse
      const refreshHmac = crypto.createHmac('sha256', prngSeed);
      refreshHmac.update(Buffer.from([i]));
      prngSeed = refreshHmac.digest();
    }
    
    // Update position
    const offset = prngSeed.readUInt8(i % 32) * step;
    position = (position + offset) % imageSize;
  }
  
  return pattern;
}

/**
 * Gets algorithm name string from HashAlgorithm enum
 * 
 * @param algorithm - Hash algorithm enum value
 * @returns Algorithm name string
 */
function getAlgorithmName(algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case HashAlgorithm.SHA256:
      return 'sha256';
    case HashAlgorithm.SHA384:
      return 'sha384';
    case HashAlgorithm.SHA512:
      return 'sha512';
    case HashAlgorithm.SHA3_256:
      return 'sha3-256';
    case HashAlgorithm.SHA3_384:
      return 'sha3-384';
    case HashAlgorithm.SHA3_512:
      return 'sha3-512';
    default:
      return 'sha512';
  }
}