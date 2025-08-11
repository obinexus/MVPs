// src/cli/commands/derive.ts

import { ZeroContext } from "@/context/ZeroContext.js";
import { deriveId } from "@/encoding/id.js";
import { createKey } from "@/encoding/key.js";
import { ZeroError, ZeroErrorCode } from "@/errors/index.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { FileHandler } from "../handlers/FileHandler.js";
import { displayId, displayIdAndKey } from "../utils/index.js";
import { DeriveCommandOptions, FileFormat } from "@/parser/index.js";

/**
 * Registers the 'derive' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerDeriveCommand(program: Command): Command {
  return program
    .command('derive')
    .description('Generate a derived ID for a specific purpose or network joining')
    .requiredOption('-i, --input <file>', 'Input ID file')
    .requiredOption('-p, --purpose <str>', 'Purpose string for derived ID (e.g., "authentication", "network-join")')
    .option('-o, --output <file>', 'Output file for derived ID')
    .option('-a, --algorithm <algo>', 'KDF algorithm (pbkdf2-sha256, pbkdf2-sha512, scrypt)', 'pbkdf2-sha512')
    .option('-f, --format <format>', 'Output format (text, json, binary)', 'text')
    .option('-k, --with-key', 'Generate a verification key along with the derived ID', false)
    .option('-n, --network <id>', 'Network ID to join (only used with network-join purpose)')
    .option('-v, --verbose', 'Enable verbose output', false)
    .action(async (options: DeriveCommandOptions) => {
      try {
        await handleDeriveCommand(options);
      } catch (error) {
        handleDeriveError(error);
      }
    });
}

/**
 * Handles the 'derive' command execution
 * 
 * @param options - Command options
 */
export async function handleDeriveCommand(options: DeriveCommandOptions): Promise<void> {
  const spinner = ora('Deriving ID...').start();
  const context = ZeroContext.create();
  
  try {
    // Validate purpose
    if (!validatePurposeString(options.purpose)) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        `Invalid purpose string: ${options.purpose}`,
        { purpose: options.purpose }
      );
    }

    // Read base ID
    const baseId = await FileHandler.readId(options.input);

    // Check if this is a network join operation
    const isNetworkJoin = options.purpose.toLowerCase() === 'network-join';
    
    // For network join, require network ID
    if (isNetworkJoin && !options.network) {
      spinner.fail('Network join requires a network ID parameter (-n, --network)');
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Missing network ID for network-join purpose',
        { purpose: options.purpose }
      );
    }

    // Special handling for network join
    let derivedId;
    if (isNetworkJoin && options.network) {
      // For network join, use the network ID as additional salt
      const networkIdObj = await FileHandler.readId(options.network);
      // Combine the purpose with network info for derivation
      const networkPurpose = `${options.purpose}:${networkIdObj.hash.toString('hex')}`;
      
      derivedId = deriveId(context, baseId, networkPurpose);
      if (options.verbose) {
        console.log(chalk.gray(`Network join: Derived from base ID using network ID as salt`));
      }
    } else {
      // Standard derivation for other purposes
      derivedId = deriveId(context, baseId, options.purpose);
    }

    // Generate verification key if requested
    let verificationKey = undefined;
    if (options.withKey) {
      verificationKey = createKey(context, derivedId);
      if (options.verbose) {
        console.log(chalk.gray(`Generated verification key for derived ID`));
      }
    }
    
    // Write output or display to console
    if (options.output) {
      const format = parseOutputFormat(options.format);
      
      // Create directory if it doesn't exist
      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });

      // Write the output with or without key
      if (verificationKey) {
        await FileHandler.writeOutput(options.output, { id: derivedId, key: verificationKey }, format);
        spinner.succeed(`Derived ID with verification key created successfully: ${chalk.green(options.output)}`);
      } else {
        await FileHandler.writeOutput(options.output, { id: derivedId }, format);
        spinner.succeed(`Derived ID created successfully: ${chalk.green(options.output)}`);
      }
    } else {
      spinner.succeed('Derived ID created successfully');
      
      if (verificationKey) {
        displayIdAndKey(derivedId, verificationKey, context);
      } else {
        displayId(derivedId, context);
      }
    }

    // Additional output for network join
    if (isNetworkJoin) {
      console.log(chalk.cyan('\nNetwork Join Information:'));
      console.log(`  Purpose: ${chalk.green('network-join')}`);
      console.log(`  Network ID: ${chalk.green(options.network)}`);
      console.log(`  Derived ID is now authorized to participate in the network`);
      console.log(chalk.cyan('\nRecommended Next Steps:'));
      console.log(`  1. Share your derived ID with the network operator`);
      console.log(`  2. Use 'zero challenge' to create verification challenges`);
      console.log(`  3. Use 'zero prove' to respond to challenges from the network`);
    }
  } catch (error) {
    spinner.fail('Failed to derive ID');
    throw error;
  }
}

/**
 * Validates the purpose string for derivation
 * 
 * @param purpose - The purpose string to validate
 * @returns True if purpose is valid
 */
function validatePurposeString(purpose: string): boolean {
  if (!purpose || typeof purpose !== 'string') {
    return false;
  }

  // Remove any special characters that could cause issues
  const sanitizedPurpose = purpose.trim();
  
  // Check if the purpose is empty after sanitization
  if (sanitizedPurpose.length === 0) {
    return false;
  }

  // List of allowed purposes (extensible)
  const allowedPurposes = [
    'authentication',
    'network-join',
    'signing',
    'encryption',
    'communication'
  ];

  // If the purpose is one of the standard ones, it's valid
  if (allowedPurposes.includes(sanitizedPurpose.toLowerCase())) {
    return true;
  }

  // Otherwise, check if it's a custom purpose with valid format
  // Allow alphanumeric, hyphens, underscores, and colons for custom purposes
  return /^[a-zA-Z0-9-_:]+$/.test(sanitizedPurpose);
}

/**
 * Handles errors from the derive command
 * 
 * @param error - Error object
 */
function handleDeriveError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  
  // Provide more context for specific error types
  if (error instanceof ZeroError) {
    switch (error.code) {
      case ZeroErrorCode.INVALID_ARGUMENT:
        console.error(chalk.yellow('Hint: Check your command parameters and try again'));
        break;
      case ZeroErrorCode.IO_ERROR:
        console.error(chalk.yellow('Hint: Ensure all input files exist and are readable'));
        break;
      case ZeroErrorCode.INVALID_FORMAT:
        console.error(chalk.yellow('Hint: The input file may be corrupted or in an unsupported format'));
        break;
      default:
        // Generic additional help
        console.error(chalk.yellow('Try running with --verbose for more information'));
    }
  }
  
  process.exit(1);
}

/**
 * Parses output format string to FileFormat enum
 * 
 * @param format - Format string
 * @returns FileFormat enum value
 */
function parseOutputFormat(format?: string): FileFormat {
  if (!format) return FileFormat.TEXT;
  
  switch (format.toLowerCase()) {
    case 'json':
      return FileFormat.JSON;
    case 'binary':
      return FileFormat.BINARY;
    case 'text':
    default:
      return FileFormat.TEXT;
  }
}

