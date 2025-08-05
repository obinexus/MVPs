/**
 * Secure memory operations for the Zero library
 * 
 * Implements memory management utilities with security features:
 * - Secure memory allocation with canaries for overflow detection
 * - Secure memory wiping to prevent data leakage
 * - Constant-time memory comparison to prevent timing attacks
 */
import crypto from 'crypto';
import { MEMORY, SYSTEM } from './constants.js';
import { ZeroError } from '../errors/ZeroError.js';
import { ZeroErrorCode } from '../types/error.js';
import { CryptoFlags } from '../types/common.js';

/**
 * Memory block header structure
 * Used to track allocated blocks and detect overflows
 */
interface MemoryHeader {
  /**
   * Size of allocated user data
   */
  size: number;
  
  /**
   * Magic number for validation
   */
  magic: number;
  
  /**
   * Canary value for overflow detection
   */
  canary: Uint8Array;
}

/**
 * Size of memory header structure in bytes
 */
const HEADER_SIZE = 8 + MEMORY.CANARY_SIZE; // 4 bytes size + 4 bytes magic + CANARY_SIZE bytes canary

/**
 * Allocates memory with security features
 * 
 * @param size - Size of memory to allocate in bytes
 * @param flags - Security flags for allocation
 * @returns Allocated buffer
 * @throws ZeroError if allocation fails
 */
export function secureAlloc(size: number, flags: CryptoFlags = CryptoFlags.SECURE_MEMORY): Buffer {
  if (size <= 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Memory allocation size must be positive',
      { size }
    );
  }
  
  if (size > SYSTEM.MAX_AUTO_BUFFER_SIZE) {
    throw new ZeroError(
      ZeroErrorCode.MAX_SIZE_EXCEEDED,
      `Requested allocation size (${size} bytes) exceeds maximum allowed (${SYSTEM.MAX_AUTO_BUFFER_SIZE} bytes)`,
      { requestedSize: size, maxSize: SYSTEM.MAX_AUTO_BUFFER_SIZE }
    );
  }
  
  try {
    const useSecureMemory = (flags & CryptoFlags.SECURE_MEMORY) !== 0;
    const totalSize = HEADER_SIZE + size + MEMORY.CANARY_SIZE;
    
    // Align to page boundary if secure memory is requested
    const alignedSize = useSecureMemory
      ? Math.ceil(totalSize / MEMORY.PAGE_SIZE) * MEMORY.PAGE_SIZE
      : totalSize;
    
    // Allocate memory
    const block = Buffer.alloc(alignedSize);
    
    // Initialize header
    const header = createMemoryHeader(size);
    
    // Write header to buffer
    writeHeaderToBuffer(block, header);
    
    // Set trailing canary
    const trailingCanaryOffset = HEADER_SIZE + size;
    block.set(header.canary, trailingCanaryOffset);
    
    // Return data portion of buffer
    return block.subarray(HEADER_SIZE, HEADER_SIZE + size);
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.OUT_OF_MEMORY,
      'Failed to allocate secure memory',
      { requestedSize: size },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Securely frees memory, wiping its contents first
 * 
 * @param buffer - Buffer to free
 * @param expectedSize - Expected size for validation (optional)
 * @throws ZeroError if buffer is invalid or corrupted
 */
export function secureFree(buffer: Buffer | Uint8Array, expectedSize?: number): void {
  if (!buffer || buffer.length === 0) {
    return;
  }
  
  try {
    // Get original allocation
    const originalBuffer = getOriginalAllocation(buffer);
    
    // Verify block integrity
    const header = readHeaderFromBuffer(originalBuffer);
    verifyBlockIntegrity(header, originalBuffer);
    
    // Verify expected size if provided
    if (expectedSize !== undefined && header.size !== expectedSize) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        `Buffer size mismatch: expected ${expectedSize} bytes, got ${header.size} bytes`,
        { expectedSize, actualSize: header.size }
      );
    }
    
    // Wipe user data
    secureWipe(buffer);
    
    // Wipe entire allocation including header and canary
    secureWipe(originalBuffer);
    
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to securely free memory',
      {},
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Securely wipes memory contents with multiple overwrite patterns
 * 
 * @param buffer - Buffer to wipe
 */

/**
 * Use me later
 * @param buffer 
 * // Simplify secure memory handling
export function secureWipe(buffer: Buffer | Uint8Array): void {
  if (!buffer || buffer.length === 0) return;
  
  // Simple but effective for most use cases
  buffer.fill(0);
  
  // Add a crypto operation to prevent optimization
  try {
    crypto.randomBytes(1);
  } catch {
    // Ignore errors
  }
}

// Replace the complex header-based system with simpler alternatives
export function secureAlloc(size: number): Buffer {
  const buffer = Buffer.alloc(size);
  // Track allocations separately, don't embed in buffer
  return buffer;
}
 * @returns 
 */
export function secureWipe(buffer: Buffer | Uint8Array): void {
  if (!buffer || buffer.length === 0) {
    return;
  }
  
  try {
    // Multiple pass wipe using different patterns
    for (const pattern of MEMORY.WIPE_PATTERNS) {
      fill(buffer, pattern);
      // Memory barrier to prevent optimization
      memoryBarrier();
    }
    
    // Final wipe with zeros
    fill(buffer, 0);
    memoryBarrier();
    
  } catch (err) {
    // We don't throw from secureWipe as it's often used in cleanup paths
    console.error('Failed to securely wipe memory:', err);
  }
}

/**
 * Compares two buffers in constant time to prevent timing attacks
 * 
 * @param a - First buffer
 * @param b - Second buffer
 * @returns 0 if buffers are equal, non-zero otherwise
 */
export function constantTimeCompare(a: Buffer | Uint8Array, b: Buffer | Uint8Array): number {
  if (!a || !b) {
    return -1;
  }
  
  // If lengths differ, compare in constant time anyway
  // but always return non-zero
  const aLength = a.length;
  const bLength = b.length;
  const maxLength = Math.max(aLength, bLength);
  
  let result = aLength ^ bLength; // Will be non-zero if lengths differ
  
  // Compare all bytes in constant time
  for (let i = 0; i < maxLength; i++) {
    // If index is out of bounds for either buffer, use 0
    const aByte = i < aLength ? a[i] : 0;
    const bByte = i < bLength ? b[i] : 0;
    result |= aByte ^ bByte;
  }
  
  return result;
}

/**
 * Checks if a buffer was allocated securely
 * 
 * @param buffer - Buffer to check
 * @returns True if the buffer was securely allocated
 */
export function isSecureBuffer(buffer: unknown): buffer is Buffer | Uint8Array {
  if (!buffer || !(buffer instanceof Buffer || buffer instanceof Uint8Array)) {
    return false;
  }
  
  try {
    // Try to get original allocation
    const originalBuffer = getOriginalAllocation(buffer);
    
    // Try to read and verify header
    const header = readHeaderFromBuffer(originalBuffer);
    return verifyBlockIntegrity(header, originalBuffer, false);
  } catch {
    return false;
  }
}

/**
 * Creates a secure random buffer with cryptographically secure random data
 * 
 * @param size - Size of the buffer in bytes
 * @returns Buffer filled with secure random data
 */
export function secureRandomBytes(size: number): Buffer {
  if (size <= 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Random bytes size must be positive',
      { size }
    );
  }
  
  try {
    return crypto.randomBytes(size);
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.RANDOM_SOURCE_FAILURE,
      'Failed to generate secure random bytes',
      { requestedSize: size },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Copies data between buffers securely
 * 
 * @param source - Source buffer
 * @param target - Target buffer
 * @param sourceStart - Start position in source buffer (default: 0)
 * @param targetStart - Start position in target buffer (default: 0)
 * @param length - Number of bytes to copy (default: source length)
 * @throws ZeroError if parameters are invalid or buffer sizes are insufficient
 */
export function secureCopy(
  source: Buffer | Uint8Array,
  target: Buffer | Uint8Array,
  sourceStart: number = 0,
  targetStart: number = 0,
  length?: number
): void {
  // Validate parameters
  if (!source || !target) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Source and target buffers must be provided',
      { source: !!source, target: !!target }
    );
  }
  
  const sourceLength = source.length;
  const targetLength = target.length;
  
  if (sourceStart < 0 || sourceStart >= sourceLength) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Invalid source start position',
      { sourceStart, sourceLength }
    );
  }
  
  if (targetStart < 0 || targetStart >= targetLength) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Invalid target start position',
      { targetStart, targetLength }
    );
  }
  
  const copyLength = length ?? (sourceLength - sourceStart);
  
  if (copyLength <= 0) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Copy length must be positive',
      { length: copyLength }
    );
  }
  
  if (sourceStart + copyLength > sourceLength) {
    throw new ZeroError(
      ZeroErrorCode.BUFFER_TOO_SMALL,
      'Source buffer too small for requested copy operation',
      { 
        sourceLength,
        sourceStart,
        copyLength,
        requiredSize: sourceStart + copyLength
      }
    );
  }
  
  if (targetStart + copyLength > targetLength) {
    throw new ZeroError(
      ZeroErrorCode.BUFFER_TOO_SMALL,
      'Target buffer too small for requested copy operation',
      { 
        targetLength,
        targetStart,
        copyLength,
        requiredSize: targetStart + copyLength
      }
    );
  }
  
  // Perform the copy
  try {
    for (let i = 0; i < copyLength; i++) {
      target[targetStart + i] = source[sourceStart + i];
    }
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to copy data between buffers',
      { sourceLength, targetLength, copyLength },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Creates a secure copy of a buffer
 * 
 * @param source - Source buffer to copy
 * @param flags - Security flags for the new buffer
 * @returns Secure copy of the source buffer
 */
export function secureClone(
  source: Buffer | Uint8Array,
  flags: CryptoFlags = CryptoFlags.SECURE_MEMORY
): Buffer {
  if (!source) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Source buffer must be provided'
    );
  }
  
  const length = source.length;
  const clone = secureAlloc(length, flags);
  
  secureCopy(source, clone, 0, 0, length);
  return clone;
}

// ===== Internal helper functions =====

/**
 * Creates a memory header with secure canary value
 */
function createMemoryHeader(size: number): MemoryHeader {
  return {
    size,
    magic: MEMORY.BLOCK_MAGIC,
    canary: generateCanary()
  };
}

/**
 * Generates a random canary value for overflow detection
 */
function generateCanary(): Uint8Array {
  try {
    return crypto.randomBytes(MEMORY.CANARY_SIZE);
  } catch {
    // Fallback if crypto random generation fails
    const canary = new Uint8Array(MEMORY.CANARY_SIZE);
    for (let i = 0; i < MEMORY.CANARY_SIZE; i++) {
      canary[i] = (i ^ 0xAA) & 0xFF;
    }
    return canary;
  }
}

/**
 * Writes memory header to buffer
 */
function writeHeaderToBuffer(buffer: Buffer, header: MemoryHeader): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset, HEADER_SIZE);
  view.setUint32(0, header.size, true);
  view.setUint32(4, header.magic, true);
  buffer.set(header.canary, 8);
}

/**
 * Reads memory header from buffer
 */
function readHeaderFromBuffer(buffer: Buffer): MemoryHeader {
  const view = new DataView(buffer.buffer, buffer.byteOffset, HEADER_SIZE);
  return {
    size: view.getUint32(0, true),
    magic: view.getUint32(4, true),
    canary: buffer.subarray(8, 8 + MEMORY.CANARY_SIZE)
  };
}

/**
 * Verifies memory block integrity
 */
function verifyBlockIntegrity(
  header: MemoryHeader,
  buffer: Buffer,
  throwOnFailure: boolean = true
): boolean {
  // Verify magic number
  if (header.magic !== MEMORY.BLOCK_MAGIC) {
    if (throwOnFailure) {
      throw new ZeroError(
        ZeroErrorCode.TAMPERING_DETECTED,
        'Memory corruption detected: invalid magic number',
        { expectedMagic: MEMORY.BLOCK_MAGIC, actualMagic: header.magic }
      );
    }
    return false;
  }
  
  // Verify trailing canary
  const trailingCanaryOffset = HEADER_SIZE + header.size;
  if (trailingCanaryOffset + MEMORY.CANARY_SIZE > buffer.length) {
    if (throwOnFailure) {
      throw new ZeroError(
        ZeroErrorCode.TAMPERING_DETECTED,
        'Memory corruption detected: buffer too small for trailing canary',
        { 
          bufferSize: buffer.length,
          headerSize: HEADER_SIZE,
          dataSize: header.size,
          canarySize: MEMORY.CANARY_SIZE,
          requiredSize: trailingCanaryOffset + MEMORY.CANARY_SIZE
        }
      );
    }
    return false;
  }
  
  const trailingCanary = buffer.subarray(
    trailingCanaryOffset,
    trailingCanaryOffset + MEMORY.CANARY_SIZE
  );
  
  // Compare canaries in constant time
  const canaryCompareResult = constantTimeCompare(header.canary, trailingCanary);
  if (canaryCompareResult !== 0) {
    if (throwOnFailure) {
      throw new ZeroError(
        ZeroErrorCode.TAMPERING_DETECTED,
        'Memory corruption detected: canary value mismatch (possible buffer overflow)',
        { compareResult: canaryCompareResult }
      );
    }
    return false;
  }
  
  return true;
}

/**
 * Gets the original allocation buffer from a user buffer
 */
function getOriginalAllocation(buffer: Buffer | Uint8Array): Buffer {
  // For Buffer, we can access the original ArrayBuffer
  if (buffer instanceof Buffer) {
    const headerOffset = -HEADER_SIZE;
    try {
      const fullBuffer = Buffer.from(
        buffer.buffer,
        buffer.byteOffset + headerOffset,
        buffer.byteLength + HEADER_SIZE + MEMORY.CANARY_SIZE
      );
      
      // Verify this is actually a valid header position
      const possibleHeader = readHeaderFromBuffer(fullBuffer);
      if (possibleHeader.magic === MEMORY.BLOCK_MAGIC) {
        return fullBuffer;
      }
    } catch {
      // If accessing buffer with offset fails, fall through to error
    }
  }
  
  // If we can't find the original allocation, this wasn't allocated by us
  throw new ZeroError(
    ZeroErrorCode.INVALID_ARGUMENT,
    'Buffer was not securely allocated using secureAlloc',
    { bufferLength: buffer.length }
  );
}

/**
 * Memory barrier to prevent compiler optimization
 * Forces memory operations to complete before continuing
 */
function memoryBarrier(): void {
  // This is the best we can do in JavaScript/TypeScript
  // In C/C++/Rust this would be a real memory barrier
  if (typeof crypto.randomBytes === 'function') {
    try {
      // Force a side effect that depends on current state
      // to prevent dead code elimination
      crypto.randomBytes(1);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Fills a buffer with a specific value
 */
function fill(buffer: Buffer | Uint8Array, value: number): void {
  if (buffer instanceof Buffer) {
    buffer.fill(value);
  } else {
    buffer.fill(value);
  }
}

/**
 * Gets size of memory structures in bytes
 * 
 * @param type - Name of structure to get size of
 * @returns Size in bytes
 */
export function sizeof(type: 'MemoryHeader'): number {
    switch (type) {
        case 'MemoryHeader':
            // Structure is: 4 bytes size + 4 bytes magic + MEMORY.CANARY_SIZE bytes canary
            return HEADER_SIZE;
        default:
            throw new Error(`Unknown type: ${type}`);
    }
}


