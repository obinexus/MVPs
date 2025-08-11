/**
 * Context-related type definitions for Zero library
 */
import { HashAlgorithm } from '@/crypto/index.js';
import { hasRequiredProperties } from './common.js';

/**
 * Configuration options for Zero context
 */
export interface IZeroConfig {
  algorithm: HashAlgorithm | undefined;
  /**
   * Length of salt used in cryptographic operations (in bytes)
   * Must be between 16 and 64 bytes
   */
  saltLength: number;
  
  /**
   * Character used to separate components in string representations
   * Must be a single printable character that doesn't appear in the encoding alphabet
   */
  separator: string;
  
  /**
   * Size of the encoding alphabet
   * Must be between 16 and 256
   */
  encodingSize: number;
  
  /**
   * Protocol version
   * Must be a positive integer
   */
  version: number;
}

/**
 * Type guard for IZeroConfig
 */
export function isZeroConfig(value: unknown): value is IZeroConfig {
  if (!hasRequiredProperties<IZeroConfig>(
    value,
    ['saltLength', 'separator', 'encodingSize', 'version']
  )) {
    return false;
  }
  
  const config = value as IZeroConfig;
  
  return (
    typeof config.saltLength === 'number' && 
    config.saltLength >= 16 && 
    config.saltLength <= 64 &&
    
    typeof config.separator === 'string' && 
    config.separator.length === 1 &&
    config.separator.match(/^[!-~]$/) !== null &&
    
    typeof config.encodingSize === 'number' && 
    config.encodingSize >= 16 && 
    config.encodingSize <= 256 &&
    
    typeof config.version === 'number' && 
    Number.isInteger(config.version) &&
    config.version > 0
  );
}

/**
 * Status information for a Zero context
 */
export interface IZeroStatus {
  /**
   * Number of active ID objects
   */
  activeIds: number;
  
  /**
   * Memory used by the context in bytes
   */
  memoryUsed: number;
  
  /**
   * Timestamp when the context was created
   */
  createdTime: number;
  
  /**
   * Protocol version being used
   */
  version: number;
}

/**
 * Type guard for IZeroStatus
 */
export function isZeroStatus(value: unknown): value is IZeroStatus {
  if (!hasRequiredProperties<IZeroStatus>(
    value,
    ['activeIds', 'memoryUsed', 'createdTime', 'version']
  )) {
    return false;
  }
  
  const status = value as IZeroStatus;
  
  return (
    typeof status.activeIds === 'number' && 
    Number.isInteger(status.activeIds) && 
    status.activeIds >= 0 &&
    
    typeof status.memoryUsed === 'number' && 
    Number.isInteger(status.memoryUsed) && 
    status.memoryUsed >= 0 &&
    
    typeof status.createdTime === 'number' && 
    Number.isInteger(status.createdTime) && 
    status.createdTime > 0 &&
    
    typeof status.version === 'number' && 
    Number.isInteger(status.version) && 
    status.version > 0
  );
}

/**
 * Memory allocation functions interface
 */
export interface IZeroAllocator {
  /**
   * Allocate memory of specified size
   * @param size Number of bytes to allocate
   * @returns Buffer containing allocated memory
   */
  malloc: (size: number) => Buffer;
  
  /**
   * Free previously allocated memory
   * @param ptr Buffer to free
   */
  free: (ptr: Buffer) => void;
  
  /**
   * Allocate and zero-initialize memory
   * @param count Number of elements
   * @param size Size of each element in bytes
   * @returns Buffer containing allocated memory
   */
  calloc: (count: number, size: number) => Buffer;
  
  /**
   * Resize previously allocated memory
   * @param ptr Buffer to resize
   * @param size New size in bytes
   * @returns Buffer containing resized memory
   */
  realloc: (ptr: Buffer, size: number) => Buffer;
}

/**
 * Type guard for IZeroAllocator
 */
export function isZeroAllocator(value: unknown): value is IZeroAllocator {
  if (!hasRequiredProperties<IZeroAllocator>(
    value,
    ['malloc', 'free', 'calloc', 'realloc']
  )) {
    return false;
  }
  
  const allocator = value as IZeroAllocator;
  
  return (
    typeof allocator.malloc === 'function' &&
    typeof allocator.free === 'function' &&
    typeof allocator.calloc === 'function' &&
    typeof allocator.realloc === 'function'
  );
}

/**
 * Encoding map interface
 */
export interface IZeroMap {
  /**
   * Forward mapping (index to character)
   */
  forward: string;
  
  /**
   * Reverse mapping (character to index)
   */
  reverse: Record<string, number>;
  
  /**
   * Size of encoding alphabet
   */
  size: number;
  
  /**
   * Operation flags
   */
  flags: number;
}

/**
 * Type guard for IZeroMap
 */
export function isZeroMap(value: unknown): value is IZeroMap {
  if (!hasRequiredProperties<IZeroMap>(
    value,
    ['forward', 'reverse', 'size', 'flags']
  )) {
    return false;
  }
  
  const map = value as IZeroMap;
  
  if (typeof map.forward !== 'string' || 
      typeof map.reverse !== 'object' || 
      typeof map.size !== 'number' ||
      typeof map.flags !== 'number') {
    return false;
  }
  
  // Validate size consistency
  if (map.forward.length !== map.size) {
    return false;
  }
  
  // Validate reverse mapping integrity
  for (let i = 0; i < map.size; i++) {
    const char = map.forward[i];
    if (map.reverse[char] !== i) {
      return false;
    }
  }
  
  return true;
}

/**
 * Context configuration flags
 */
export enum ContextFlags {
  NONE = 0,
  SECURE_MEMORY = 1 << 0,
  DEBUG_MODE = 1 << 1,
  STRICT_VALIDATION = 1 << 2,
  ASYNC_OPERATIONS = 1 << 3,
  HIGH_PERFORMANCE = 1 << 4,
  LOW_MEMORY = 1 << 5,
  QUANTUM_RESISTANT = 1 << 6
}

/**
 * Main Zero context interface
 */
export interface IZeroContext {
  /**
   * Configuration options
   */
  config: IZeroConfig;
  
  /**
   * Encoding map
   */
  encodingMap: IZeroMap;
  
  /**
   * Number of active IDs
   */
  activeIds: number;
  
  /**
   * Memory usage in bytes
   */
  memoryUsed: number;
  
  /**
   * Context creation timestamp
   */
  createdTime: number;
  
  /**
   * Context operation flags
   */
  flags: ContextFlags;
  
  /**
   * Optional custom memory allocator
   */
  allocator?: IZeroAllocator;
  
  /**
   * Optional user-defined data
   */
  userData?: unknown;
}

/**
 * Type guard for IZeroContext
 */
export function isZeroContext(value: unknown): value is IZeroContext {
  if (!hasRequiredProperties<IZeroContext>(
    value,
    ['config', 'encodingMap', 'activeIds', 'memoryUsed', 'createdTime', 'flags']
  )) {
    return false;
  }
  
  const ctx = value as IZeroContext;
  
  return (
    isZeroConfig(ctx.config) &&
    isZeroMap(ctx.encodingMap) &&
    typeof ctx.activeIds === 'number' && 
    ctx.activeIds >= 0 &&
    typeof ctx.memoryUsed === 'number' && 
    ctx.memoryUsed >= 0 &&
    typeof ctx.createdTime === 'number' && 
    ctx.createdTime > 0 &&
    typeof ctx.flags === 'number' &&
    Object.values(ContextFlags).includes(ctx.flags) &&
    (ctx.allocator === undefined || isZeroAllocator(ctx.allocator))
  );
}