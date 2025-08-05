/**
 * Environment variable resolver for the Zero library
 * 
 * Handles environment variable substitution in configuration:
 * - Maps environment variables to configuration properties
 * - Performs environment variable substitution
 * - Resolves variables with a specified prefix
 */

/**
 * Environment variable to configuration mapping
 */
export interface EnvMapping {
    [envVar: string]: string;
  }
  
  /**
   * Default environment variable mapping
   */
  const DEFAULT_ENV_MAPPING: EnvMapping = {
    'ZERO_SALT_LENGTH': 'security.saltLength',
    'ZERO_SECURE_MEMORY': 'security.secureMemory',
    'ZERO_QUANTUM_RESISTANT': 'security.quantumResistant',
    'ZERO_HASH_ALGORITHM': 'crypto.defaultHashAlgorithm',
    'ZERO_KDF_ALGORITHM': 'crypto.defaultKdfAlgorithm',
    'ZERO_KDF_ITERATIONS': 'crypto.defaultIterations',
    'ZERO_STORAGE_PATH': 'storage.storagePath',
    'ZERO_ENCRYPT_STORAGE': 'storage.encryptStorage',
    'ZERO_FILE_FORMAT': 'storage.fileFormat',
    'ZERO_SEPARATOR': 'encoding.defaultSeparator',
    'ZERO_ENCODING_SIZE': 'encoding.encodingSize',
    'ZERO_TIMEOUT': 'network.defaultTimeout',
    'ZERO_MAX_RETRIES': 'network.maxRetries',
    'ZERO_ID_EXPIRATION': 'timeouts.idExpiration',
    'ZERO_KEY_EXPIRATION': 'timeouts.keyExpiration'
  };
  
  /**
   * Environment variable resolver for the Zero library
   */
  export class EnvironmentResolver {
    /**
     * Environment variable to configuration mapping
     */
    private _envMapping: EnvMapping;
    
    /**
     * Environment variable prefix
     */
    private _prefix: string;
    
    /**
     * Creates a new EnvironmentResolver instance
     * 
     * @param prefix - Environment variable prefix (default: 'ZERO_')
     * @param mapping - Custom environment variable mapping
     */
    constructor(prefix: string = 'ZERO_', mapping?: EnvMapping) {
      this._prefix = prefix;
      this._envMapping = mapping || DEFAULT_ENV_MAPPING;
    }
    
    /**
     * Gets the environment mapping
     */
    public get envMapping(): EnvMapping {
      return this._envMapping;
    }
    
    /**
     * Gets the environment variable prefix
     */
    public get prefix(): string {
      return this._prefix;
    }
    
    /**
     * Resolves environment variables in configuration
     * 
     * @param config - Configuration object
     * @returns Configuration with environment variables applied
     */
    public resolveEnvironmentVariables(config: unknown): unknown {
      if (!config || typeof config !== 'object') {
        return config;
      }
      
      // Create a copy of the config
      const result = { ...config };
      
      // Apply environment variables from mapping
      for (const [envName, configPath] of Object.entries(this._envMapping)) {
        const envValue = this.getEnvironmentValue(envName);
        
        if (envValue !== undefined) {
          this.setNestedValue(result, configPath, envValue);
        }
      }
      
      // Look for any environment variables with the prefix
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(this._prefix) && !(key in this._envMapping)) {
          // Convert environment variable name to config path
          const configPath = this.mapEnvToConfig(key);
          
          if (configPath && value !== undefined) {
            this.setNestedValue(result, configPath, this.parseEnvValue(value));
          }
        }
      }
      
      return result;
    }
    
    /**
     * Maps an environment variable name to a configuration path
     * 
     * @param envVar - Environment variable name
     * @returns Configuration path or undefined if no mapping exists
     */
    public mapEnvToConfig(envVar: string): string | undefined {
      // Check explicit mapping first
      if (envVar in this._envMapping) {
        return this._envMapping[envVar];
      }
      
      // If it starts with the prefix, convert to camelCase path
      if (envVar.startsWith(this._prefix)) {
        const path = envVar.substring(this._prefix.length)
          .toLowerCase()
          .split('_')
          .map((segment, index) => {
            if (index === 0) {
              return segment;
            }
            return segment.charAt(0).toUpperCase() + segment.slice(1);
          })
          .join('.');
        
        return path;
      }
      
      return undefined;
    }
    
    /**
     * Gets an environment variable value
     * 
     * @param key - Environment variable name
     * @returns Parsed environment variable value or undefined
     */
    public getEnvironmentValue(key: string): any {
      const value = process.env[key];
      
      if (value === undefined) {
        return undefined;
      }
      
      return this.parseEnvValue(value);
    }
    
    /**
     * Parses an environment variable value to the appropriate type
     * 
     * @param value - Environment variable value
     * @returns Parsed value
     */
    private parseEnvValue(value: string): any {
      // Try to parse as number
      if (/^-?\d+$/.test(value)) {
        return parseInt(value, 10);
      }
      
      // Try to parse as float
      if (/^-?\d+\.\d+$/.test(value)) {
        return parseFloat(value);
      }
      
      // Try to parse as boolean
      if (value.toLowerCase() === 'true') {
        return true;
      }
      
      if (value.toLowerCase() === 'false') {
        return false;
      }
      
      // Return as string
      return value;
    }
    
    /**
     * Sets a nested value in an object by path
     * 
     * @param obj - Object to update
     * @param path - Dot-separated path
     * @param value - Value to set
     */
    private setNestedValue(obj: any, path: string, value: any): void {
      const parts = path.split('.');
      
      // Navigate to the correct nested object
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        // Create the path if it doesn't exist
        if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
          current[part] = {};
        }
        
        current = current[part];
      }
      
      // Set the value on the final property
      const lastPart = parts[parts.length - 1];
      current[lastPart] = value;
    }
  }