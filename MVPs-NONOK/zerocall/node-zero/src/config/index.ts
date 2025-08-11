/**
 * Configuration system for Zero library
 * 
 * Provides centralized configuration management with:
 * - Default configuration settings
 * - Environment variable overrides
 * - User configuration loading and validation
 * - Schema-based configuration validation
 */

export * from './adapter/FileConfigAdapter';
export * from './adapter/JsonConfigAdapter';
export * from './validators/ConfigValidator';
export * from './validators/ValidationResult';
export * from './validators/ValidationError';
export * from './schema/ConfigSchema';
export * from './EnvironmentResolver';
export * from './ConfigProvider';
export * from './ZeroConfig';
export * from './models/IZeroConfigModel';