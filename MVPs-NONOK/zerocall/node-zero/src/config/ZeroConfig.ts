/**
 * Main configuration class for the Zero library
 * 
 * Handles loading, saving, validating, and merging configurations
 */
import path from 'path';
import { ZeroError, ZeroErrorCode } from '../errors';
import { IZeroConfigModel } from './models/IZeroConfigModel';
import { FileConfigAdapter } from './adapter/FileConfigAdapter';
import { JsonConfigAdapter } from './adapter/JsonConfigAdapter';
import { ConfigSchema } from './schema/ConfigSchema';
import { ConfigValidator } from './validators/ConfigValidator';


/**
 * Default configuration path
 */
const DEFAULT_CONFIG_PATH = '.zero/config.json';

/**
 * Main configuration class for the Zero library
 */
export class ZeroConfig {
  /**
   * Configuration file path
   */
  public readonly configPath: string;
  
  /**
   * Default configuration
   */
  public readonly defaultConfig: IZeroConfigModel;
  
  /**
   * Whether the configuration has been initialized
   */
  private _isInitialized: boolean = false;
  
  /**
   * File adapter for config loading/saving
   */
  private fileAdapter: FileConfigAdapter;
  
  /**
   * JSON adapter for serialization/deserialization
   */
  private jsonAdapter: JsonConfigAdapter;
  
  /**
   * Config validator
   */
  private validator: ConfigValidator;
  
  /**
   * Creates a new ZeroConfig instance
   * 
   * @param configPath - Path to configuration file (optional)
   */
  constructor(configPath?: string) {
    this.configPath = configPath ?? this.resolveDefaultConfigPath();
    this.defaultConfig = this.getDefault();
    this.fileAdapter = new FileConfigAdapter(this.configPath);
    this.jsonAdapter = new JsonConfigAdapter();
    this.validator = new ConfigValidator();
  }
  
  /**
   * Checks if configuration is initialized
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }
  
  /**
   * Loads configuration from file
   * 
   * @returns Loaded configuration
   */
  public async load(): Promise<IZeroConfigModel> {
    try {
      // Check if config file exists
      if (!await this.fileAdapter.exists()) {
        // Create default config
        const defaultConfig = this.getDefault();
        await this.save(defaultConfig);
        this._isInitialized = true;
        return defaultConfig;
      }
      
      // Load config from file
      const fileContent = await this.fileAdapter.load();
      
      // Parse JSON
      const userConfig = this.jsonAdapter.parse(fileContent);
      
      // Merge with defaults
      const mergedConfig = this.merge(this.defaultConfig, userConfig);
      
      // Validate
      if (!this.validate(mergedConfig)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Invalid configuration format',
          { config: mergedConfig }
        );
      }
      
      this._isInitialized = true;
      return mergedConfig as IZeroConfigModel;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        'Failed to load configuration',
        { configPath: this.configPath },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Saves configuration to file
   * 
   * @param config - Configuration to save
   * @returns Success status
   */
  public async save(config: IZeroConfigModel): Promise<boolean> {
    try {
      // Validate config
      if (!this.validate(config)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Invalid configuration format',
          { config }
        );
      }
      
      // Serialize to JSON
      const jsonContent = this.jsonAdapter.stringify(config);
      
      // Save to file
      await this.fileAdapter.save(jsonContent);
      
      return true;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        'Failed to save configuration',
        { configPath: this.configPath },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Gets default configuration
   * 
   * @returns Default configuration
   */
  public getDefault(): IZeroConfigModel {
    return ConfigSchema.getDefaultConfig();
  }
  
  /**
   * Validates configuration against schema
   * 
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validate(config: unknown): boolean {
    const schema = ConfigSchema.getConfigSchema();
    const result = this.validator.validateConfig(config, schema);
    return result.isValid;
  }
  
  /**
   * Merges user configuration with default configuration
   * 
   * @param defaultConfig - Default configuration
   * @param userConfig - User configuration
   * @returns Merged configuration
   */
  public merge(defaultConfig: IZeroConfigModel, userConfig: unknown): unknown {
    if (!userConfig || typeof userConfig !== 'object') {
      return defaultConfig;
    }
    
    const result = { ...defaultConfig };
    
    // Merge top-level properties
    for (const [key, value] of Object.entries(userConfig)) {
      if (key in defaultConfig && value !== null && typeof value === 'object') {
        // Deep merge objects
        const defaultValue = defaultConfig[key as keyof IZeroConfigModel];
        result[key as keyof IZeroConfigModel] = {
          ...(typeof defaultValue === 'object' && defaultValue !== null ? defaultValue : {}),
          ...value
        };
      } else if (key in defaultConfig) {
        // Replace primitive values
        result[key as keyof IZeroConfigModel] = value as any;
      }
    }
    
    return result;
  }
  
  /**
   * Resets configuration to defaults
   * 
   * @returns Success status
   */
  public async reset(): Promise<boolean> {
    try {
      const defaultConfig = this.getDefault();
      return await this.save(defaultConfig);
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        'Failed to reset configuration',
        { configPath: this.configPath },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Resolves default configuration path
   * 
   * @returns Default configuration path
   */
  private resolveDefaultConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(homeDir, DEFAULT_CONFIG_PATH);
  }
}