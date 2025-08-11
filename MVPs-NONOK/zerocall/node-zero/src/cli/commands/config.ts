import { Command } from 'commander';
import chalk from 'chalk';

import { 
  ConfigProvider, 
  ZeroConfig, 
  ValidationResult, 
  ConfigSchema 
} from '../../config/index.js';
import { ZeroError } from '../../errors/index.js';

/**
 * Configuration command handler for Zero CLI
 * Provides commands to manage configuration:
 * - view: Display current configuration
 * - set: Update specific configuration values
 * - reset: Reset configuration to defaults
 * - validate: Validate current configuration
 */
export function registerConfigCommand(program: Command): Command {
  const configCommand = program
    .command('config')
    .description('Manage Zero library configuration');

  // View configuration
  configCommand
    .command('view')
    .description('View current configuration')
    .option('-f, --format <format>', 'Output format (json, yaml, table)', 'table')
    .action(async (options) => {
      await handleViewConfig(options);
    });

  // Set configuration value
  configCommand
    .command('set <key> <value>')
    .description('Set a specific configuration value')
    .option('-f, --force', 'Force set value without validation')
    .action(async (key: string, value: string, options) => {
      await handleSetConfig(key, value, options);
    });

  // Reset configuration
  configCommand
    .command('reset')
    .description('Reset configuration to default values')
    .option('-y, --yes', 'Confirm reset without prompt')
    .action(async (options) => {
      await handleResetConfig(options);
    });

  // Validate configuration
  configCommand
    .command('validate')
    .description('Validate current configuration')
    .action(async () => {
      await handleValidateConfig();
    });

  // Path command
  configCommand
    .command('path')
    .description('Show the current configuration file path')
    .action(() => {
      handleConfigPath();
    });

  return configCommand;
}

/**
 * Handles viewing the current configuration
 * 
 * @param options - Command options
 */
async function handleViewConfig(options: { format: string }): Promise<void> {
  try {
    const configProvider = new ConfigProvider();
    const config = await configProvider.getConfig();

    switch (options.format.toLowerCase()) {
      case 'json':
        console.log(JSON.stringify(config, null, 2));
        break;
      case 'yaml':
        console.log(convertToYAML(config));
        break;
      case 'table':
      default:
        displayConfigTable(config);
    }
  } catch (error) {
    handleConfigError(error);
  }
}

/**
 * Handles setting a specific configuration value
 * 
 * @param key - Configuration key to set
 * @param value - Value to set
 * @param options - Command options
 */
async function handleSetConfig(
  key: string, 
  value: string, 
  options: { force?: boolean }
): Promise<void> {
  try {
    const configProvider = new ConfigProvider();
    
    // Parse value based on type
    const parsedValue = parseConfigValue(value);

    // Validate if not forced
    if (!options.force) {
      const validationResult = validateConfigValue(key, parsedValue);
      if (!validationResult.isValid) {
        console.error(chalk.red('Validation failed:'));
        validationResult.getErrors().forEach(error => {
          console.error(chalk.yellow(`- ${error.toString()}`));
        });
        process.exit(1);
      }
    }

    // Set the configuration value
    const success = await configProvider.setConfigValue(key, parsedValue);
    
    if (success) {
      console.log(chalk.green(`Configuration value for "${key}" updated successfully.`));
    } else {
      console.error(chalk.red(`Failed to update configuration value for "${key}".`));
    }
  } catch (error) {
    handleConfigError(error);
  }
}

/**
 * Handles resetting configuration to defaults
 * 
 * @param options - Command options
 */
async function handleResetConfig(options: { yes?: boolean }): Promise<void> {
  try {
    // Prompt for confirmation if not forced
    if (!options.yes) {
      const confirmed = await promptConfirmation(
        'Are you sure you want to reset the configuration to default values? (y/N) '
      );
      
      if (!confirmed) {
        console.log(chalk.yellow('Configuration reset cancelled.'));
        return;
      }
    }

    // const configProvider = new ConfigProvider();
    const config = new ZeroConfig();
    
    // Reset to default configuration
    const defaultConfig = ConfigSchema.getDefaultConfig();
    await config.save(defaultConfig);

    console.log(chalk.green('Configuration successfully reset to default values.'));
  } catch (error) {
    handleConfigError(error);
  }
}

/**
 * Handles configuration validation
 */
async function handleValidateConfig(): Promise<void> {
  try {
    const configProvider = new ConfigProvider();
    const config = await configProvider.getConfig();

    const validator = new ZeroConfig();
    const isValid = validator.validate(config);

    if (isValid) {
      console.log(chalk.green('Configuration is valid.'));
    } else {
      console.error(chalk.red('Configuration is invalid.'));
    }
  } catch (error) {
    handleConfigError(error);
  }
}

/**
 * Handles displaying configuration file path
 */
function handleConfigPath(): void {
  const configProvider = new ConfigProvider();
  const configPath = configProvider.resolveConfigPath();
  
  console.log(chalk.blue('Configuration File Path:'));
  console.log(chalk.white(configPath));
}

/**
 * Converts configuration to YAML format
 * 
 * @param config - Configuration object
 * @returns YAML string representation
 */
function convertToYAML(config: any): string {
  // Simple YAML conversion (for more complex needs, use a YAML library)
  return JSON.stringify(config, null, 2)
    .replace(/^{/g, '')
    .replace(/}$/g, '')
    .replace(/"(\w+)":/g, '$1:')
    .split('\n')
    .map(line => line.trim())
    .join('\n');
}

/**
 * Displays configuration in a tabular format
 * 
 * @param config - Configuration object
 */
function displayConfigTable(config: any): void {
  const displaySection = (sectionName: string, section: any) => {
    console.log(chalk.bold(`\n${sectionName.toUpperCase()} Configuration:`));
    Object.entries(section).forEach(([key, value]) => {
      console.log(`  ${chalk.cyan(key)}: ${formatValue(value)}`);
    });
  };

  // Iterate through configuration sections
  Object.entries(config).forEach(([sectionName, section]) => {
    if (typeof section === 'object' && section !== null) {
      displaySection(sectionName, section);
    } else {
      console.log(`${chalk.cyan(sectionName)}: ${formatValue(section)}`);
    }
  });
}

/**
 * Formats configuration value for display
 * 
 * @param value - Configuration value
 * @returns Formatted string representation
 */
function formatValue(value: any): string {
  if (Array.isArray(value)) {
    return chalk.yellow(`[${value.join(', ')}]`);
  }
  if (typeof value === 'object' && value !== null) {
    return chalk.gray('[Object]');
  }
  return chalk.green(String(value));
}

/**
 * Parses configuration value based on its potential type
 * 
 * @param value - String value to parse
 * @returns Parsed value
 */
function parseConfigValue(value: string): any {
  // Try parsing as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If not JSON, try parsing as simple types
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }
}

/**
 * Validates a specific configuration value
 * 
 * @param key - Configuration key
 * @param value - Value to validate
 * @returns Validation result
 */
function validateConfigValue(key: string, value: any): ValidationResult {
  const validator = new ZeroConfig();
  const fullConfig = ConfigSchema.getDefaultConfig();

  // Traverse to set the specific value
  const parts = key.split('.');
  let current: any = fullConfig;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;

  // Validate the entire configuration
  const validationResult = new ValidationResult();
  const isValid = validator.validate(fullConfig);

  if (!isValid) {
    validationResult.addError(
      key, 
      'Invalid configuration value', 
      'validation_error'
    );
  }

  return validationResult;
}

/**
 * Prompts user for confirmation
 * 
 * @param message - Confirmation prompt message
 * @returns Promise resolving to boolean confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(chalk.yellow(message), (answer) => {
      rl.close();
      resolve(
        answer.trim().toLowerCase() === 'y' || 
        answer.trim().toLowerCase() === 'yes'
      );
    });
  });
}

/**
 * Handles configuration-related errors
 * 
 * @param error - Error object
 */
function handleConfigError(error: unknown): void {
  if (error instanceof ZeroError) {
    console.error(chalk.red(`Configuration Error: ${error.message}`));
    if (error.details) {
      console.error(chalk.yellow('Details:'), error.details);
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`Unexpected Error: ${error.message}`));
  } else {
    console.error(chalk.red('An unknown error occurred.'));
  }
  process.exit(1);
}