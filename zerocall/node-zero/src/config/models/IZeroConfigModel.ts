/**
 * Configuration model interfaces for the Zero library
 * 
 * Defines configuration structure and validation for:
 * - Security settings
 * - Cryptographic settings
 * - Storage settings
 * - Encoding settings
 * - Network settings
 * - Timeout settings
 */

/**
 * Security configuration settings
 */
export interface SecurityConfig {
  /**
   * Whether secure memory should be used
   */
  secureMemory: boolean;

  /**
   * Whether quantum-resistant algorithms should be used
   */
  quantumResistant: boolean;

  /**
   * Whether strict validation should be enforced
   */
  strictValidation: boolean;

  /**
   * Default salt length in bytes
   */
  saltLength: number;

  /**
   * List of allowed cryptographic algorithms
   */
  allowedAlgorithms: string[];
}

/**
 * Cryptographic configuration settings
 */
export interface CryptoConfig {
  /**
   * Default hash algorithm to use
   */
  defaultHashAlgorithm: string;

  /**
   * Default key derivation function (KDF) algorithm
   */
  defaultKdfAlgorithm: string;

  /**
   * Default number of iterations for key derivation
   */
  defaultIterations: number;

  /**
   * Default memory size for KDF in kilobytes
   */
  defaultMemorySize: number;

  /**
   * Default output length for key derivation in bytes
   */
  defaultOutputLength: number;
}

/**
 * Storage configuration settings
 */
export interface StorageConfig {
  /**
   * Default path for storing Zero library data
   */
  storagePath: string;

  /**
   * Whether storage should be encrypted
   */
  encryptStorage: boolean;

  /**
   * Default file format for storage
   */
  fileFormat: string;

  /**
   * Maximum allowed file size in bytes
   */
  maxFileSize: number;
}

/**
 * Encoding configuration settings
 */
export interface EncodingConfig {
  /**
   * Default separator character for encoding
   */
  defaultSeparator: string;

  /**
   * Size of the encoding alphabet
   */
  encodingSize: number;

  /**
   * Default encoding algorithm
   */
  defaultAlgorithm: string;
}

/**
 * Network configuration settings
 */
export interface NetworkConfig {
  /**
   * Default network timeout in milliseconds
   */
  defaultTimeout: number;

  /**
   * Maximum number of retries for network operations
   */
  maxRetries: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelay: number;
}

/**
 * Timeout configuration settings
 */
export interface TimeoutsConfig {
  /**
   * Default expiration time for IDs (0 means no expiration)
   */
  idExpiration: number;

  /**
   * Default expiration time for keys in milliseconds
   */
  keyExpiration: number;

  /**
   * Default expiration time for challenges in milliseconds
   */
  challengeExpiration: number;

  /**
   * Default expiration time for proofs in milliseconds
   */
  proofExpiration: number;
}

/**
 * Main configuration model interface
 * Combines all configuration sections into a single, comprehensive interface
 */
export interface IZeroConfigModel {
  /**
   * Configuration version string
   */
  configVersion: string;

  /**
   * Security-related configuration
   */
  security: SecurityConfig;

  /**
   * Cryptographic configuration
   */
  crypto: CryptoConfig;

  /**
   * Storage configuration
   */
  storage: StorageConfig;

  /**
   * Encoding configuration
   */
  encoding: EncodingConfig;

  /**
   * Network configuration
   */
  network: NetworkConfig;

  /**
   * Timeout configuration
   */
  timeouts: TimeoutsConfig;
}

/**
 * Type guard to validate the configuration model
 * 
 * @param config - Configuration object to validate
 * @returns Whether the object matches the IZeroConfigModel interface
 */
export function isZeroConfigModel(config: unknown): config is IZeroConfigModel {
  if (!config || typeof config !== 'object') return false;

  const requiredKeys: (keyof IZeroConfigModel)[] = [
    'configVersion', 'security', 'crypto', 
    'storage', 'encoding', 'network', 'timeouts'
  ];

  return requiredKeys.every(key => {
    if (!(key in config)) return false;
    
    const value = (config as IZeroConfigModel)[key];
    
    switch (key) {
      case 'configVersion':
        return typeof value === 'string';
      case 'security':
        return validateSecurityConfig(value);
      case 'crypto':
        return validateCryptoConfig(value);
      case 'storage':
        return validateStorageConfig(value);
      case 'encoding':
        return validateEncodingConfig(value);
      case 'network':
        return validateNetworkConfig(value);
      case 'timeouts':
        return validateTimeoutsConfig(value);
      default:
        return false;
    }
  });
}

/**
 * Validates security configuration
 */
function validateSecurityConfig(config: unknown): config is SecurityConfig {
  if (!config || typeof config !== 'object') return false;
  
  const secConfig = config as SecurityConfig;
  return typeof secConfig.secureMemory === 'boolean' &&
         typeof secConfig.quantumResistant === 'boolean' &&
         typeof secConfig.strictValidation === 'boolean' &&
         typeof secConfig.saltLength === 'number' &&
         Array.isArray(secConfig.allowedAlgorithms) &&
         secConfig.allowedAlgorithms.every(algo => typeof algo === 'string');
}

/**
 * Validates crypto configuration
 */
function validateCryptoConfig(config: unknown): config is CryptoConfig {
  if (!config || typeof config !== 'object') return false;
  
  const cryptoConfig = config as CryptoConfig;
  return typeof cryptoConfig.defaultHashAlgorithm === 'string' &&
         typeof cryptoConfig.defaultKdfAlgorithm === 'string' &&
         typeof cryptoConfig.defaultIterations === 'number' &&
         typeof cryptoConfig.defaultMemorySize === 'number' &&
         typeof cryptoConfig.defaultOutputLength === 'number';
}

/**
 * Validates storage configuration
 */
function validateStorageConfig(config: unknown): config is StorageConfig {
  if (!config || typeof config !== 'object') return false;
  
  const storageConfig = config as StorageConfig;
  return typeof storageConfig.storagePath === 'string' &&
         typeof storageConfig.encryptStorage === 'boolean' &&
         typeof storageConfig.fileFormat === 'string' &&
         typeof storageConfig.maxFileSize === 'number';
}

/**
 * Validates encoding configuration
 */
function validateEncodingConfig(config: unknown): config is EncodingConfig {
  if (!config || typeof config !== 'object') return false;
  
  const encodingConfig = config as EncodingConfig;
  return typeof encodingConfig.defaultSeparator === 'string' &&
         typeof encodingConfig.encodingSize === 'number' &&
         typeof encodingConfig.defaultAlgorithm === 'string';
}

/**
 * Validates network configuration
 */
function validateNetworkConfig(config: unknown): config is NetworkConfig {
  if (!config || typeof config !== 'object') return false;
  
  const networkConfig = config as NetworkConfig;
  return typeof networkConfig.defaultTimeout === 'number' &&
         typeof networkConfig.maxRetries === 'number' &&
         typeof networkConfig.retryDelay === 'number';
}

/**
 * Validates timeouts configuration
 */
function validateTimeoutsConfig(config: unknown): config is TimeoutsConfig {
  if (!config || typeof config !== 'object') return false;
  
  const timeoutsConfig = config as TimeoutsConfig;
  return typeof timeoutsConfig.idExpiration === 'number' &&
         typeof timeoutsConfig.keyExpiration === 'number' &&
         typeof timeoutsConfig.challengeExpiration === 'number' &&
         typeof timeoutsConfig.proofExpiration === 'number';
}