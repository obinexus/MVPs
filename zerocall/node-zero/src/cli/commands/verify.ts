// src/cli/commands/verify.ts

import { ZeroContext } from "@/context/ZeroContext.js";
import { verifyId } from "@/encoding/id.js";
import { IZeroId, IZeroKey } from "@/encoding/index.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { FileHandler } from "../handlers/FileHandler.js";
import { readInputData, displayIdAndKey } from "../utils/index.js";
import { VerifyCommandOptions } from "@/parser/index.js";


/**
 * Registers the 'verify' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerVerifyCommand(program: Command): Command {
  return program
    .command('verify')
    .description('Verify a ZeroID against input data')
    .requiredOption('-i, --input <file>', 'Input data file')
    .requiredOption('-k, --key <file>', 'Key file for verification')
    .option('-d, --id <file>', 'ID file for verification')
    .action(async (options: VerifyCommandOptions) => {
      try {
        await handleVerifyCommand(options);
      } catch (error) {
        handleVerifyError(error);
      }
    });
}

/**
 * Handles the 'verify' command execution
 * 
 * @param options - Command options
 */
export async function handleVerifyCommand(options: VerifyCommandOptions): Promise<void> {
  const spinner = ora('Verifying ID...').start();
  const context = ZeroContext.create();
  
  try {
    // Read input data
    const data = await readInputData(options.input);
    
    let id: IZeroId;
    let key: IZeroKey;

    try {
      // Determine ID source and read it
      if (options.id) {
        // If separate ID file is specified, read it directly
        id = await FileHandler.readId(options.id);
        if (options.verbose) {
          console.log(chalk.gray(`Read ID from ${options.id}`));
        }
      } else {
        // Try to extract ID from key file
        const result = await FileHandler.readIdAndKey(options.key);
        if (!result || !result.id) {
          throw new Error('Could not extract ID from key file');
        }
        id = result.id;
        if (options.verbose) {
          console.log(chalk.gray(`Extracted ID from ${options.key}`));
        }
      }

      // Read verification key
      key = await FileHandler.readKey(options.key);
      if (options.verbose) {
        console.log(chalk.gray(`Read key from ${options.key}`));
      }

      // Verify ID
      const isValid = verifyId(context, id, key, data);
      
      if (isValid) {
        spinner.succeed(chalk.green('Verification successful: ID is valid'));
        
        if (options.verbose) {
          console.log('\nVerification Details:');
          displayIdAndKey(id, key, context);
          console.log('\nVerified against data:', JSON.stringify(data, null, 2));
        }
      } else {
        spinner.fail(chalk.red('Verification failed: ID is invalid'));
        process.exit(1);
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to process verification files'));
      throw new Error(`File processing error: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    spinner.fail('Verification failed');
    throw error;
  }
}

/**
 * Handles errors from the verify command
 * 
 * @param error - Error object
 */
function handleVerifyError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
}