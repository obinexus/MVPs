// src/cli/commands/prove.ts

import { ZeroContext } from "@/context/ZeroContext.js";
import { createProof } from "@/encoding/id.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { ProveCommandOptions } from "@/parser/index.js";
import { FileHandler } from "../handlers/FileHandler.js";

/**
 * Registers the 'prove' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerProveCommand(program: Command): Command {
  return program
    .command('prove')
    .description('Generate a zero-knowledge proof for a ZeroID')
    .requiredOption('-i, --input <file>', 'ZeroID file to create proof for')
    .requiredOption('-c, --challenge <file>', 'Challenge file to respond to')
    .requiredOption('-o, --output <file>', 'Output file for proof')
    .option('-f, --format <format>', 'Output format (binary, base64)', 'binary')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: ProveCommandOptions) => {
      try {
        await handleProveCommand(options);
      } catch (error) {
        handleProveError(error);
      }
    });
}

/**
 * Handles the 'prove' command execution
 * 
 * @param options - Command options
 */
export async function handleProveCommand(options: ProveCommandOptions): Promise<void> {
  const spinner = ora('Generating zero-knowledge proof...').start();
  const context = ZeroContext.create();
  
  try {
    // Read ID from file
    const id = await FileHandler.readId(options.input);
    
    // Read challenge from file
    const challenge = await FileHandler.readChallenge(options.challenge);
    
    // Generate proof
    const proof = createProof(context, id, challenge);
    
    // Create directory if it doesn't exist
    const directory = path.dirname(options.output);
    await fs.mkdir(directory, { recursive: true });
    
    // Format output if needed
    let outputData: Buffer | string = proof;
    if (options.format.toLowerCase() === 'base64') {
      outputData = proof.toString('base64');
      await fs.writeFile(options.output, outputData, 'utf8');
    } else {
      // Default: binary format
      await fs.writeFile(options.output, outputData);
    }
    
    spinner.succeed(`Proof generated successfully: ${chalk.green(options.output)}`);
    
    if (options.verbose) {
      console.log(chalk.bold('\nProof Details:'));
      console.log(`  ${chalk.cyan('ID Hash:')}     ${id.hash.toString('hex').substring(0, 16)}...`);
      console.log(`  ${chalk.cyan('Challenge:')}   ${challenge.toString('hex').substring(0, 16)}...`);
      console.log(`  ${chalk.cyan('Proof Size:')}  ${proof.length} bytes`);
      console.log(`  ${chalk.cyan('Format:')}      ${options.format.toLowerCase()}`);
      console.log('');
    }
  } catch (error) {
    spinner.fail('Failed to generate proof');
    throw error;
  }
}

/**
 * Handles errors from the prove command
 * 
 * @param error - Error object
 */
function handleProveError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
}