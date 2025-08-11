import { ZeroContext } from "@/context/ZeroContext.js";
import { generateChallenge } from "@/encoding/id.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { ChallengeCommandOptions } from "@/parser/index.js";


/**
 * Registers the 'challenge' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerChallengeCommand(program: Command): Command {
  return program
    .command('challenge')
    .description('Generate a challenge for ZKP verification')
    .requiredOption('-o, --output <file>', 'Output file for challenge')
    .option('-s, --size <size>', 'Challenge size in bytes', '32')
    .action(async (options: ChallengeCommandOptions) => {
      try {
        await handleChallengeCommand(options);
      } catch (error) {
        handleChallengeError(error);
      }
    });
}

/**
 * Handles the 'challenge' command execution
 * 
 * @param options - Command options
 */
export async function handleChallengeCommand(options: ChallengeCommandOptions): Promise<void> {
  const spinner = ora('Generating challenge...').start();
  const context = ZeroContext.create();
  
  try {
    // Parse options
    const challengeSize = options.size ? parseInt(options.size, 10) : 32;
    
    // Generate challenge
    const challenge = generateChallenge(context, challengeSize);
    
    // Create directory if it doesn't exist
    const directory = path.dirname(options.output);
    await fs.mkdir(directory, { recursive: true });
    
    // Write challenge to file
    await fs.writeFile(options.output, challenge);
    
    spinner.succeed(`Challenge generated successfully: ${chalk.green(options.output)}`);
  } catch (error) {
    spinner.fail('Failed to generate challenge');
    throw error;
  }
}

/**
 * Handles errors from the challenge command
 * 
 * @param error - Error object
 */
function handleChallengeError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
}