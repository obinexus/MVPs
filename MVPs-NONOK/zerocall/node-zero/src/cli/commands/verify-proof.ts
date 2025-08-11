// src/cli/commands/verify-proof.ts

import { ZeroContext } from "@/context/ZeroContext.js";
import { verifyProof } from "@/encoding/id.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { FileHandler } from "../handlers/FileHandler.js";
import { VerifyProofCommandOptions } from "@/parser/index.js";
import  fs from "fs";

/**
 * Registers the 'verify-proof' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerVerifyProofCommand(program: Command): Command {
  return program
    .command('verify-proof')
    .description('Verify a zero-knowledge proof')
    .requiredOption('-i, --input <file>', 'Proof file')
    .requiredOption('-c, --challenge <file>', 'Challenge file used for proof')
    .requiredOption('-d, --id <file>', 'ID file for verification')
    .action(async (options: VerifyProofCommandOptions) => {
      try {
        await handleVerifyProofCommand(options);
      } catch (error) {
        handleVerifyProofError(error);
      }
    });
}

/**
 * Handles the 'verify-proof' command execution
 * 
 * @param options - Command options
 */
export async function handleVerifyProofCommand(options: VerifyProofCommandOptions): Promise<void> {
  const spinner = ora('Verifying proof...').start();
  const context = ZeroContext.create();
  
  try {
    // Read proof
    const proof = fs.readFileSync(options.input);
    
    // Read challenge
    const challenge = fs.readFileSync(options.challenge);
    
    // Read ID
    const id = await FileHandler.readId(options.id);
    
    // Verify proof
    const isValid = verifyProof(context, proof, challenge, id);
    
    if (isValid) {
      spinner.succeed(chalk.green('Proof verification successful'));
    } else {
      spinner.fail(chalk.red('Proof verification failed'));
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('Proof verification failed');
    throw error;
  }
}

/**
 * Handles errors from the verify-proof command
 * 
 * @param error - Error object
 */
function handleVerifyProofError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
}