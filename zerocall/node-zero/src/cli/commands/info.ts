import { ZeroContext } from "@/context/ZeroContext.js";
import { InfoCommandOptions } from "@/parser/index.js";
import { VERSION } from "@/utils/constants.js";
import chalk from "chalk";
import { Command } from "commander";
import { table } from "console";


/**
 * Registers the 'info' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerInfoCommand(program: Command): Command {
  return program
    .command('info')
    .description('Display information about Zero library and CLI')
    .action(async (options: InfoCommandOptions) => {
      try {
        await handleInfoCommand(options);
      } catch (error) {
        handleInfoError(error);
      }
    });
}

/**
 * Handles the 'info' command execution
 * 
 * @param options - Command options
 */
export async function handleInfoCommand(options: InfoCommandOptions): Promise<void> {
  const context = ZeroContext.create();
  const status = context.getStatus();
  
  console.log(chalk.bold.blue('\nZero CLI Information'));
  console.log('====================');
  
  const tableData = [
    ['CLI Version', '1.0.0'],
    ['Library Version', VERSION.CURRENT.toString()],
    ['Protocol Version', status.version.toString()],
    ['Default Salt Length', context.config.saltLength.toString()],
    ['Default Hash Algorithm', 'SHA-512'],
    ['Supported Hash Algorithms', 'SHA-256, SHA-384, SHA-512'],
    ['Supported KDF Algorithms', 'PBKDF2, scrypt'],
    ['Active IDs', status.activeIds.toString()],
    ['Memory Used', `${(status.memoryUsed / 1024).toFixed(2)} KB`],
    ['Created Time', new Date(status.createdTime).toISOString()]
  ];
  
  console.log(table(tableData));
  
  console.log(chalk.bold('\nUsage Examples:'));
  console.log('  $ zero create -i identity.json -o identity.zid');
  console.log('  $ zero verify -i identity.json -k identity.zid');
  console.log('  $ zero derive -i identity.zid -p "authentication" -o auth.zid');
  console.log('  $ zero challenge -o challenge.bin');
  console.log('  $ zero prove -i identity.zid -c challenge.bin -o proof.bin');
  console.log('  $ zero verify-proof -i proof.bin -c challenge.bin -d identity.zid\n');
}

/**
 * Handles errors from the info command
 * 
 * @param error - Error object
 */
function handleInfoError(error: unknown): void {
  console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
}