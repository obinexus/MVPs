/**
 * Core context implementation for the Zero library
 * 
 * The ZeroContext provides a centralized configuration and state management
 * system for the library. It holds encoding maps, security settings, and
 * manages resource allocation and tracking.
 */
import { ZeroError, ZeroErrorCode } from '@/errors/index.js';
import { CryptoFlags } from '@/types/common.js';
import { CRYPTO, ENCODING, VERSION } from '@/utils/constants.js';
import { deepFreeze, secureAlloc, secureFree } from '@/utils/index.js';
import { TokenManager } from './TokenManager.js';
import { 
    IZeroContext,
    IZeroConfig,
    IZeroStatus,
    IZeroAllocator,
    IZeroMap,
    ContextFlags,
    isZeroConfig
  } from '../types/index.js';
import { ZeroMap } from './ZeroMap.js';

  
  /**
   * Default configuration values
   */
  const DEFAULT_CONFIG: IZeroConfig = {
    saltLength: CRYPTO.DEFAULT_SALT_LENGTH,
    separator: ENCODING.DEFAULT_SEPARATOR,
    encodingSize: ENCODING.DEFAULT_ENCODING_SIZE,
    version: VERSION.CURRENT,
    algorithm: CRYPTO.DEFAULT_ALGORITHM
  };
  
  /**
   * Central context implementation for the Zero library
   * Manages configuration, resources, and state
   */
  export class ZeroContext implements IZeroContext {
    /**
     * Configuration options
     */
    public readonly config: IZeroConfig;
    
    /**
     * Encoding map for character encoding/decoding
     */
    public readonly encodingMap: IZeroMap;
    
    /**
     * Number of active IDs
     */
    public activeIds: number;
    
    /**
     * Memory usage in bytes
     */
    public memoryUsed: number;
    
    /**
     * Context creation timestamp
     */
    public readonly createdTime: number;
    
    /**
     * Context operation flags
     */
    public readonly flags: ContextFlags;
    
    /**
     * Optional custom memory allocator
     */
    public readonly allocator?: IZeroAllocator;
    
    /**
     * Optional user-defined data
     */
    public userData?: unknown;

    /**
     * Token manager for ZID tokens
     */
    public readonly tokenManager: TokenManager;
    
    /**
     * Creates a new ZeroContext instance
     * 
     * @param config - Configuration options (optional)
     * @param flags - Context flags (optional)
     * @throws ZeroError if configuration is invalid
     */
    private constructor(
      config?: Partial<IZeroConfig>,
      flags: ContextFlags = ContextFlags.SECURE_MEMORY
    ) {
      // Apply configuration with defaults
      this.config = this.mergeWithDefaults(config || {});
      
      // Validate configuration
      this.validateConfig();
      
      // Initialize encoding map
      this.encodingMap = this.createDefaultEncodingMap();
      
      // Initialize context state
      this.activeIds = 0;
      this.memoryUsed = 0;
      this.createdTime = Date.now();
      this.flags = flags;
      this.tokenManager = new TokenManager();
      
      // Freeze config to prevent modifications
      deepFreeze(this.config);
    }
    
    /**
     * Creates a new ZeroContext with default configuration
     * 
     * @param flags - Context flags (optional)
     * @returns New ZeroContext instance
     */
    public static create(flags: ContextFlags = ContextFlags.SECURE_MEMORY): ZeroContext {
      return new ZeroContext(undefined, flags);
    }
    
    /**
     * Creates a new ZeroContext with custom configuration
     * 
     * @param config - Configuration options
     * @param flags - Context flags (optional)
     * @returns New ZeroContext instance
     * @throws ZeroError if configuration is invalid
     */
    public static createWithConfig(
      config: Partial<IZeroConfig>,
      flags: ContextFlags = ContextFlags.SECURE_MEMORY
    ): ZeroContext {
      return new ZeroContext(config, flags);
    }
    
    /**
     * Creates a clone of this context
     * 
     * @returns New ZeroContext instance with the same configuration
     */
    public clone(): ZeroContext {
      const clonedContext = new ZeroContext(this.config, this.flags);
      
      // If we have a custom allocator, set it on the clone
      if (this.allocator) {
        clonedContext.setAllocator(this.allocator);
      }
      
      return clonedContext;
    }
    
    /**
     * Gets the current context status
     * 
     * @returns Status information object
     */
    public getStatus(): IZeroStatus {
      return {
        activeIds: this.activeIds,
        memoryUsed: this.memoryUsed,
        createdTime: this.createdTime,
        version: this.config.version
      };
    }
    
    /**
     * Updates context configuration
     * 
     * @param config - New configuration options (partial)
     * @returns Updated context
     * @throws ZeroError if new configuration is invalid
     */
    public updateConfig(config: Partial<IZeroConfig>): ZeroContext {
      if (!config || typeof config !== 'object') {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Configuration must be an object',
          { configType: typeof config }
        );
      }
      
      // Create new merged configuration
      const newConfig = {
        ...this.config,
        ...config
      };
      
      // Create a new context with the updated configuration
      const updatedContext = new ZeroContext(newConfig, this.flags);
      
      // Copy current state to new context
      updatedContext.activeIds = this.activeIds;
      updatedContext.memoryUsed = this.memoryUsed;
      updatedContext.userData = this.userData;
      
      // If we have a custom allocator, set it on the new context
      if (this.allocator) {
        updatedContext.setAllocator(this.allocator);
      }
      
      return updatedContext;
    }
    
    /**
     * Sets a custom memory allocator
     * 
     * @param allocator - Memory allocator functions
     * @throws ZeroError if allocator is invalid
     */
    public setAllocator(allocator: IZeroAllocator): void {
      if (!allocator || typeof allocator !== 'object') {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Allocator must be an object',
          { allocatorType: typeof allocator }
        );
      }
      
      // Validate allocator functions
      if (
        typeof allocator.malloc !== 'function' ||
        typeof allocator.free !== 'function' ||
        typeof allocator.calloc !== 'function' ||
        typeof allocator.realloc !== 'function'
      ) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Allocator must implement malloc, free, calloc, and realloc functions',
          {
            hasMalloc: typeof allocator.malloc === 'function',
            hasFree: typeof allocator.free === 'function',
            hasCalloc: typeof allocator.calloc === 'function',
            hasRealloc: typeof allocator.realloc === 'function'
          }
        );
      }
      
      // Set allocator
      (this as any).allocator = allocator;
    }
    
    /**
     * Increments the active ID counter
     * Should be called when a new ID is created
     */
    public incrementActiveIds(): void {
      this.activeIds += 1;
    }
    
    /**
     * Decrements the active ID counter
     * Should be called when an ID is freed
     * 
     * @throws ZeroError if counter would go below zero
     */
    public decrementActiveIds(): void {
      if (this.activeIds <= 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_STATE,
          'Cannot decrement active IDs counter below zero',
          { activeIds: this.activeIds }
        );
      }
      
      this.activeIds -= 1;
    }
    
    /**
     * Tracks memory allocation
     * 
     * @param size - Size of allocated memory in bytes
     */
    public trackAllocation(size: number): void {
      if (size < 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Allocation size must be non-negative',
          { size }
        );
      }
      
      this.memoryUsed += size;
    }
    
    /**
     * Tracks memory deallocation
     * 
     * @param size - Size of freed memory in bytes
     * @throws ZeroError if would result in negative memory usage
     */
    public trackDeallocation(size: number): void {
      if (size < 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Deallocation size must be non-negative',
          { size }
        );
      }
      
      if (size > this.memoryUsed) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_STATE,
          'Cannot track deallocation larger than current memory usage',
          { size, currentUsage: this.memoryUsed }
        );
      }
      
      this.memoryUsed -= size;
    }
    
    /**
     * Allocates memory using context-appropriate allocator
     * 
     * @param size - Size of memory to allocate in bytes
     * @param secureFlag - Whether to use secure allocation
     * @returns Allocated buffer
     */
    public allocate(size: number, secureFlag: boolean = true): Buffer {
      if (size <= 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Allocation size must be positive',
          { size }
        );
      }
      
      let buffer: Buffer;
      
      if (this.allocator) {
        // Use custom allocator
        buffer = this.allocator.malloc(size);
      } else {
        // Use default secure allocation
        const flags = secureFlag ? CryptoFlags.SECURE_MEMORY : CryptoFlags.NONE;
        buffer = secureAlloc(size, flags);
      }
      
      // Track allocation
      this.trackAllocation(size);
      
      return buffer;
    }
    
    /**
     * Frees memory using context-appropriate deallocator
     * 
     * @param buffer - Buffer to free
     * @param size - Size of buffer in bytes
     */
    public free(buffer: Buffer, size: number): void {
      if (!buffer || !(buffer instanceof Buffer)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Buffer must be a valid Buffer instance',
          { bufferType: buffer ? typeof buffer : 'null' }
        );
      }
      
      if (size <= 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Buffer size must be positive',
          { size }
        );
      }
      
      if (this.allocator) {
        // Use custom deallocator
        this.allocator.free(buffer);
      } else {
        // Use default secure deallocation
        secureFree(buffer, size);
      }
      
      // Track deallocation
      this.trackDeallocation(size);
    }
    
    /**
     * Sets user data
     * 
     * @param data - User data to store
     */
    public setUserData(data: unknown): void {
      this.userData = data;
    }
    
    /**
     * Gets user data
     * 
     * @returns Stored user data or undefined
     */
    public getUserData<T>(): T | undefined {
      return this.userData as T | undefined;
    }
    
    /**
     * Dispose of context and free resources
     */
    public dispose(): void {
      // Nothing to do for now, but this method allows for future cleanup
      // In a real implementation, this would free encoding maps and other resources
      this.userData = undefined;
    }
    
    // ===== Private helper methods =====
    
    /**
     * Merges partial configuration with defaults
     */
    private mergeWithDefaults(partialConfig: Partial<IZeroConfig>): IZeroConfig {
      return {
        saltLength: partialConfig.saltLength ?? DEFAULT_CONFIG.saltLength,
        separator: partialConfig.separator ?? DEFAULT_CONFIG.separator,
        encodingSize: partialConfig.encodingSize ?? DEFAULT_CONFIG.encodingSize,
        version: partialConfig.version ?? DEFAULT_CONFIG.version,
        algorithm: partialConfig.algorithm ?? DEFAULT_CONFIG.algorithm
      };
    }
    
    /**
     * Validates configuration values
     */
    private validateConfig(): void {
      // Use type guard from types
      if (!isZeroConfig(this.config)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Invalid configuration',
          { config: this.config }
        );
      }
      
      // Additional validations if needed
      this.validateSeparator();
    }
    
    /**
     * Validates separator character is not in the encoding alphabet
     */
    private validateSeparator(): void {
      const defaultAlphabet = this.getDefaultAlphabet();
      
      if (defaultAlphabet.includes(this.config.separator)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Separator character cannot be part of the encoding alphabet',
          { 
            separator: this.config.separator,
            alphabet: defaultAlphabet
          }
        );
      }
    }
    
    /**
     * Creates default encoding map based on configuration
     */
    private createDefaultEncodingMap(): ZeroMap {
      const charset = this.getDefaultAlphabet();
      return new ZeroMap(charset, this.getSecurityFlags());
    }
    
    /**
     * Gets security flags based on context flags
     */
    private getSecurityFlags(): CryptoFlags {
      let flags = CryptoFlags.NONE;
      
      if (this.flags & ContextFlags.SECURE_MEMORY) {
        flags |= CryptoFlags.SECURE_MEMORY;
      }
      
      if (this.flags & ContextFlags.QUANTUM_RESISTANT) {
        flags |= CryptoFlags.QUANTUM_RESISTANT;
      }
      
      return flags;
    }
    
    /**
     * Gets default alphabet based on encoding size
     */
    private getDefaultAlphabet(): string {
      switch (this.config.encodingSize) {
        case 16:
          return ENCODING.HEX_ALPHABET;
        case 32:
          return ENCODING.BASE32_ALPHABET;
        case 58:
          return ENCODING.BASE58_ALPHABET;
        case 64:
          return ENCODING.BASE64_ALPHABET;
        case 62:
        default:
          return ENCODING.BASE64URL_ALPHABET.substring(0, this.config.encodingSize);
      }
    }
  }