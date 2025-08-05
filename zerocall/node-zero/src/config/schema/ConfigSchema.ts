import { IZeroConfigModel } from '../models/IZeroConfigModel';

/**
 * Provides schema definitions and default configurations for Zero library
 */
export class ConfigSchema {
  /**
   * Retrieves the complete configuration schema
   * 
   * @returns Object representing the full configuration schema
   */
  static getConfigSchema(): object {
    return {
      type: 'object',
      properties: {
        configVersion: { type: 'string' },
        security: this.getSecuritySchema(),
        crypto: this.getCryptoSchema(),
        storage: this.getStorageSchema(),
        encoding: this.getEncodingSchema(),
        network: this.getNetworkSchema(),
        timeouts: this.getTimeoutSchema()
      },
      required: [
        'configVersion', 'security', 'crypto', 
        'storage', 'encoding', 'network', 'timeouts'
      ],
      additionalProperties: false
    };
  }

  /**
   * Retrieves the security configuration schema
   * 
   * @returns Object representing the security configuration schema
   */
  static getSecuritySchema(): object {
    return {
      type: 'object',
      properties: {
        secureMemory: { type: 'boolean' },
        quantumResistant: { type: 'boolean' },
        strictValidation: { type: 'boolean' },
        saltLength: { type: 'number', minimum: 16, maximum: 64 },
        allowedAlgorithms: { 
          type: 'array', 
          items: { type: 'string' },
          minItems: 1
        }
      },
      required: [
        'secureMemory', 'quantumResistant', 
        'strictValidation', 'saltLength', 'allowedAlgorithms'
      ],
      additionalProperties: false
    };
  }

  /**
   * Retrieves the crypto configuration schema
   * 
   * @returns Object representing the crypto configuration schema
   */
  static getCryptoSchema(): object {
    return {
      type: 'object',
      properties: {
        defaultHashAlgorithm: { type: 'string' },
        defaultKdfAlgorithm: { type: 'string' },
        defaultIterations: { type: 'number', minimum: 1000 },
        defaultMemorySize: { type: 'number', minimum: 64 },
        defaultOutputLength: { type: 'number', minimum: 16, maximum: 128 }
      },
      required: [
        'defaultHashAlgorithm', 'defaultKdfAlgorithm', 
        'defaultIterations', 'defaultMemorySize', 'defaultOutputLength'
      ],
      additionalProperties: false
    };
  }

  /**
   * Retrieves the storage configuration schema
   * 
   * @returns Object representing the storage configuration schema
   */
  static getStorageSchema(): object {
    return {
      type: 'object',
      properties: {
        storagePath: { type: 'string' },
        encryptStorage: { type: 'boolean' },
        fileFormat: { type: 'string' },
        maxFileSize: { type: 'number', minimum: 0 }
      },
      required: [
        'storagePath', 'encryptStorage', 
        'fileFormat', 'maxFileSize'
      ],
      additionalProperties: false
    };
  }

  /**
   * Retrieves the encoding configuration schema
   * 
   * @returns Object representing the encoding configuration schema
   */
  static getEncodingSchema(): object {
    return {
      type: 'object',
      properties: {
        defaultSeparator: { type: 'string', maxLength: 1 },
        encodingSize: { type: 'number', minimum: 2, maximum: 256 },
        defaultAlgorithm: { type: 'string' }
      },
      required: [
        'defaultSeparator', 'encodingSize', 'defaultAlgorithm'
      ],
      additionalProperties: false
    };
  }

  /**
   * Retrieves the network configuration schema
   * 
   * @returns Object representing the network configuration schema
   */
  static getNetworkSchema(): object {
    return {
      type: 'object',
      properties: {
        defaultTimeout: { type: 'number', minimum: 0 },
        maxRetries: { type: 'number', minimum: 0 },
        retryDelay: { type: 'number', minimum: 0 }
      },
      required: [
        'defaultTimeout', 'maxRetries', 'retryDelay'
      ],
      additionalProperties: false
    };
  }

  /**
   * Retrieves the timeouts configuration schema
   * 
   * @returns Object representing the timeouts configuration schema
   */
  static getTimeoutSchema(): object {
    return {
      type: 'object',
      properties: {
        idExpiration: { type: 'number', minimum: 0 },
        keyExpiration: { type: 'number', minimum: 0 },
        challengeExpiration: { type: 'number', minimum: 0 },
        proofExpiration: { type: 'number', minimum: 0 }
      },
      required: [
        'idExpiration', 'keyExpiration', 
        'challengeExpiration', 'proofExpiration'
      ],
      additionalProperties: false
    };
  }

  /**
   * Provides a default configuration that matches the schema
   * 
   * @returns Default Zero configuration object
   */
  static getDefaultConfig(): IZeroConfigModel {
    return {
      configVersion: '1.0.0',
      security: {
        secureMemory: true,
        quantumResistant: false,
        strictValidation: true,
        saltLength: 32,
        allowedAlgorithms: ['SHA256', 'SHA512']
      },
      crypto: {
        defaultHashAlgorithm: 'SHA512',
        defaultKdfAlgorithm: 'PBKDF2_HMAC_SHA512',
        defaultIterations: 600000,
        defaultMemorySize: 65536,
        defaultOutputLength: 32
      },
      storage: {
        storagePath: './zero-data',
        encryptStorage: true,
        fileFormat: 'TEXT',
        maxFileSize: 10485760
      },
      encoding: {
        defaultSeparator: '.',
        encodingSize: 62,
        defaultAlgorithm: 'BASE64'
      },
      network: {
        defaultTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
      },
      timeouts: {
        idExpiration: 0,
        keyExpiration: 7776000000,
        challengeExpiration: 300000,
        proofExpiration: 900000
      }
    };
  }
}