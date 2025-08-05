import { ZeroContext } from "@/context/ZeroContext.js";
import { HashAlgorithm } from "@/crypto/hash.js";
import { createId } from "@/encoding/id.js";
import { createKey } from "@/encoding/index.js";
import { CryptoFlags } from "@/types/common.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { FileHandler } from "../handlers/FileHandler.js";
import { readInputData, displayIdAndKey } from "../utils/index.js";
import { CreateCommandOptions, FileFormat } from "@/parser/index.js";


/**
 * Registers the 'create' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerCreateCommand(program: Command): Command {
  return program
    .command('create')
    .description('Create a new ZeroID from input data')
    .requiredOption('-i, --input <file>', 'Input data file')
    .option('-o, --output <file>', 'Output file for ID/key')
    .option('-s, --salt <size>', 'Salt length in bytes', '32')
    .option('-a, --algorithm <algo>', 'Hash algorithm (sha256, sha384, sha512)', 'sha512')
    .option('-f, --format <format>', 'Output format (text, json, binary)', 'text')
    .action(async (options: CreateCommandOptions) => {
      try {
        await handleCreateCommand(options);
      } catch (error) {
        handleCreateError(error);
      }
    });
}


/**
 * Handles the 'create' command execution
 * 
 * @param options - Command options
 */
export async function handleCreateCommand(options: CreateCommandOptions): Promise<void> {
  const spinner = ora('Creating Zero ID...').start();
  const context = ZeroContext.create();
  
  try {
    // Parse options
    const saltLength = options.salt ? parseInt(options.salt, 10) : 32;
    const hashAlgorithm = parseHashAlgorithm(options.algorithm);
    
    // Read input data
    const data = await readInputData(options.input);
    
    // Create new ID
    const id = createId(context, data, {
      hashAlgorithm,
      saltLength,
      flags: CryptoFlags.SECURE_MEMORY
    });
    
    // Create verification key
    const key = createKey(context, id);
    
    // Write output if output file specified
    if (options.output) {
      const format = parseOutputFormat(options.format);
      
      // Write files using FileHandler
      await FileHandler.writeOutput(
        options.output,
        { id, key },
        format
      );

      spinner.succeed(chalk.green(`ID and key created successfully:\n` +
        `  ID file: ${options.output}\n` +
        `  Key file: ${options.output}.key`));

      if (options.verbose) {
        displayIdAndKey(id, key, context);
      }
    } else {
      // Display to console if no output file
      spinner.succeed('ID and key created successfully:');
      displayIdAndKey(id, key, context);
    }
  } catch (error) {
    spinner.fail('Failed to create ID');
    throw error;
  }
}

/**
 * Handles errors from the create command
 * 
 * @param error - Error object
 */
function handleCreateError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
}

/**
 * Parses hash algorithm string to HashAlgorithm enum
 * 
 * @param algorithm - Algorithm string
 * @returns HashAlgorithm enum value
 */
function parseHashAlgorithm(algorithm?: string): HashAlgorithm {
  if (!algorithm) return HashAlgorithm.SHA512;
  
  switch (algorithm.toLowerCase()) {
    case 'sha256':
      return HashAlgorithm.SHA256;
    case 'sha384':
      return HashAlgorithm.SHA384;
    case 'sha512':
    default:
      return HashAlgorithm.SHA512;
  }
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