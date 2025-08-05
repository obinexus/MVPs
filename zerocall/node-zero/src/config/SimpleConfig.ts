// src/config/SimpleConfig.ts

import { ZeroError, ZeroErrorCode } from '../errors/index.js';
import { ContextFlags, CryptoFlags, HashAlgorithm } from '../types/index.js';
import { CRYPTO, ENCODING, VERSION } from '../utils/constants.js';

/**
 * Configuration interface
 */
export interface ISimpleZeroConfig {
  /**
   * Salt length for ID generation (bytes)
   */
  saltLength: number;

  /**
   * Separator character for encoding
   */
  separator: string;

  /**
   * Encoding alphabet size
   */
  encodingSize: number;

  /**
   * Library version
   */
  version: number;

  /**
   * Default crypto algorithm
   */
  algorithm: HashAlgorithm;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ISimpleZeroConfig = {
  saltLength: CRYPTO.DEFAULT_SALT_LENGTH,
  separator: ENCODING.DEFAULT_SEPARATOR,
  encodingSize: ENCODING.DEFAULT_ENCODING_SIZE,
  version: VERSION.CURRENT,
  algorithm: CRYPTO.DEFAULT_ALGORITHM
};

/**
 * Simplified configuration provider for Zero library
 * This is a lightweight version that doesn't rely on complex file operations
 */
export class SimpleConfigProvider {
  /**
   * Current configuration
   */
  private _config: ISimpleZeroConfig;

  /**
   * Whether configuration has been initialized
   */
  private _initialized: boolean = false;

  /**
   * Creates a new SimpleConfigProvider instance
   */
  constructor() {
    this._config = { ...DEFAULT_CONFIG };
    this._initialized = true;
  }

  /**
   * Gets the current configuration
   * 
   * @returns Current configuration
   */
  public async getConfig(): Promise<ISimpleZeroConfig> {
    if (!this._initialized) {
      await this.initialize();
    }
    return this._config;
  }

  /**
   * Initializes configuration
   * 
   * @returns Promise that resolves when initialization is complete
   */
  private async initialize(): Promise<void> {
    try {
      // Apply environment variable overrides
      this._config = this.applyEnvironmentOverrides(this._config);
      this._initialized = true;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INITIALIZATION_FAILED,
        'Failed to initialize configuration',
        {},
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Applies environment variable overrides to configuration
   * 
   * @param config - Base configuration
   * @returns Configuration with environment overrides
   */
  private applyEnvironmentOverrides(config: ISimpleZeroConfig): ISimpleZeroConfig {
    const result = { ...config };

    // ZERO_SALT_LENGTH
    if (process.env.ZERO_SALT_LENGTH) {
      const saltLength = parseInt(process.env.ZERO_SALT_LENGTH, 10);
      if (!isNaN(saltLength) && saltLength > 0) {
        result.saltLength = saltLength;
      }
    }

    // ZERO_SEPARATOR
    if (process.env.ZERO_SEPARATOR) {
      result.separator = process.env.ZERO_SEPARATOR;
    }

    // ZERO_ENCODING_SIZE
    if (process.env.ZERO_ENCODING_SIZE) {
      const encodingSize = parseInt(process.env.ZERO_ENCODING_SIZE, 10);
      if (!isNaN(encodingSize) && encodingSize > 0) {
        result.encodingSize = encodingSize;
      }
    }

    // ZERO_ALGORITHM
    if (process.env.ZERO_ALGORITHM) {
      const algorithm = process.env.ZERO_ALGORITHM as HashAlgorithm;
      // Validate algorithm
      if (Object.values(HashAlgorithm).includes(algorithm)) {
        result.algorithm = algorithm;
      }
    }

    return result;
  }
}

/**
 * Creates default context flags
 * 
 * @returns Default context flags
 */
export function createDefaultContextFlags(): ContextFlags {
  return ContextFlags.SECURE_MEMORY;
}

/**
 * Creates default crypto flags
 * 
 * @returns Default crypto flags
 */
export function createDefaultCryptoFlags(): CryptoFlags {
  return CryptoFlags.SECURE_MEMORY;
}