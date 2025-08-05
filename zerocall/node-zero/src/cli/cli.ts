/**
 * Command-line interface for Zero library
 * 
 * Provides a command-line interface for using Zero library features including
 * identity management, zero-knowledge proofs, and network operations.
 * 
 * @module cli
 */
/**
 * Zero CLI - Command-line interface for Zero library
 * 
 * This module provides a command-line interface to the Zero library,
 * allowing users to perform secure identity and zero-knowledge proof
 * operations from the terminal.
 * 
 * Usage: zero <command> [options]
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommands } from './commands/index.js';
import { ZeroContext } from '@/context/ZeroContext.js';
import { AuditLogger } from '@/context/AuditLogger.js';
import { ZeroError } from '@/errors/ZeroError.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get package version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
const CLI_VERSION = packageJson.version;
const PROGRAM_NAME = 'zero';

/**
 * Creates and configures the CLI program
 * 
 * @returns Configured Commander program
 */
export function createCLI(): Command {
  const program = new Command();
  const context = ZeroContext.create();
  const logger = new AuditLogger('audit.log');
  
  // Configure global settings
  program
    .name(PROGRAM_NAME)
    .description(chalk.bold('Zero Identity and ZKP Command Line Interface'))
    .version(CLI_VERSION, '-V, --version', 'Show version information')
    .option('-v, --verbose', 'Enable verbose output')
    .helpOption('-h, --help', 'Show help information');
  
  // Register all commands
  registerCommands(program, context, logger);
  
  // Add help examples
  program.on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log('  $ zero create -i identity.json -o identity.zid');
    console.log('  $ zero derive -i identity.zid -p "authentication" -o auth.zid');
    console.log('  $ zero derive -i identity.zid -p "network-join" -n network.zid -o network-member.zid');
    console.log('');
  });
  
  return program;
}

/**
 * Handles global errors in the CLI
 * @param error - Error object
 */
function handleGlobalError(error: unknown): void {
  if (error instanceof ZeroError) {
    console.error(chalk.red(`\nError: ${error.message}`));
    
    // Output additional details if available
    if (error.details) {
      console.error(chalk.yellow('Details:'), error.details);
    }
    
    // Show stack trace in verbose mode
    if (process.env.ZERO_VERBOSE === 'true' && error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`\nError: ${error.message}`));
    
    // Show stack trace in verbose mode
    if (process.env.ZERO_VERBOSE === 'true' && error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red(`\nUnknown error: ${String(error)}`));
  }
  
  process.exit(1);
}


const program = createCLI();

/**
 * Main entry point for the CLI
 */
async function main(): Promise<void> {
  try {
    program.parse(process.argv);
  } catch (error) {
    handleGlobalError(error);
  }
}

/**
 * Run the CLI if this is the main module
 */
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error: Error) => {
    console.error(chalk.red('Unhandled exception:'), error);
    process.exit(1);
  });
}

program.parse(process.argv);

export { program, main };
export default { createCLI, main };