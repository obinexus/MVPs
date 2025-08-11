/**
 * Configuration provider for the Zero library
 * 
 * Provides centralized access to configuration with:
 * - Environment variable resolution
 * - Hierarchical config access
 * - Configuration path resolution
 * - Default configuration settings
 * - Schema-based configuration validation
 */
import path from 'path';
import { ZeroError, ZeroErrorCode } from '../errors';
import { ZeroConfig } from './ZeroConfig';
import { EnvironmentResolver } from './EnvironmentResolver';
import { IZeroConfigModel } from './models/IZeroConfigModel';
import { ContextFlags, CryptoFlags, HashAlgorithm } from '../types';
import { CRYPTO, ENCODING, VERSION } from '../utils/constants';

/**
 * Configuration provider for the Zero library
 */
export class ConfigProvider {
  /**
   * Zero configuration instance
   */
  private _config: ZeroConfig;
  
  /**
   * Environment resolver for variable substitution
   */
  private _envResolver: EnvironmentResolver;
  
  /**
   * Loaded configuration cache
   */
  private _cachedConfig: IZeroConfigModel | null = null;
  
  /**
   * Creates a new ConfigProvider instance
   * 
   * @param configPath - Path to configuration file (optional)
   */
  constructor(configPath?: string) {
    this._config = new ZeroConfig(configPath);
    this._envResolver = new EnvironmentResolver('ZERO_');
  }
  
  /**
   * Gets the ZeroConfig instance
   */
  public get config(): ZeroConfig {
    return this._config;
  }
  
  /**
   * Gets the EnvironmentResolver instance
   */
  public get envResolver(): EnvironmentResolver {
    return this._envResolver;
  }
  
  /**
   * Gets the full configuration
   * 
   * @returns Full configuration object
   */
  public async getConfig(): Promise<IZeroConfigModel> {
    if (this._cachedConfig) {
      return this._cachedConfig;
    }
    
    try {
      // Load config from file
      let config = await this._config.load();
      
      // Resolve environment variables
      config = this._envResolver.resolveEnvironmentVariables(config) as IZeroConfigModel;
      
      // Cache for future use
      this._cachedConfig = config;
      
      return config;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.INITIALIZATION_FAILED,
        'Failed to load configuration',
        {},
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Gets a specific configuration value by key path
   * 
   * @param key - Dot-separated key path (e.g., 'crypto.defaultHashAlgorithm')
   * @returns Configuration value or undefined if not found
   */
  public async getConfigValue<T>(key: string): Promise<T | undefined> {
    const config = await this.getConfig();
    
    // Split key path into parts
    const parts = key.split('.');
    
    // Traverse config object
    let current: any = config;
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current as T;
  }
  
  /**
   * Sets a specific configuration value
   * 
   * @param key - Dot-separated key path
   * @param value - Value to set
   * @returns Success status
   */
  public async setConfigValue<T>(key: string, value: T): Promise<boolean> {
    const config = await this.getConfig();
    
    // Split key path into parts
    const parts = key.split('.');
    
    // Create a copy of the config
    const newConfig = { ...config };
    
    // Traverse and update config object
    let current: any = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    // Set the value
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
    
    // Save and update cache
    const success = await this._config.save(newConfig);
    if (success) {
      this._cachedConfig = newConfig;
    }
    
    return success;
  }
  
  /**
   * Checks if a configuration key exists
   * 
   * @param key - Dot-separated key path
   * @returns True if key exists
   */
  public async hasConfigValue(key: string): Promise<boolean> {
    const value = await this.getConfigValue(key);
    return value !== undefined;
  }
  
  /**
   * Resolves configuration path from various sources
   * 
   * @returns Resolved configuration path
   */
  public resolveConfigPath(): string {
    // Check environment variable first
    const envPath = process.env.ZERO_CONFIG_PATH;
    if (envPath) {
      return path.resolve(envPath);
    }
    
    // Get path from config
    return this._config.configPath;
  }
}