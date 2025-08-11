import { Command } from 'commander';
import { ZeroContext } from '@/context/ZeroContext.js';
import { FileHandler } from '../handlers/FileHandler.js';
import { AuditLogger } from '@/context/AuditLogger.js';

export interface TokenCommandOptions {
  input: string;
  output?: string;
}

export function registerCreateTokenCommand(program: Command, ctx: ZeroContext, logger: AuditLogger): Command {
  return program
    .command('create-token')
    .description('Generate a new ZID token')
    .requiredOption('-i, --input <file>', 'ZID file to use')
    .option('-o, --output <file>', 'Output file for token')
    .action(async (options: TokenCommandOptions) => {
      const id = await FileHandler.readId(options.input);
      const tokenInfo = ctx.tokenManager.createToken(JSON.stringify(id));
      logger.log('create-token', JSON.stringify(id), tokenInfo.token);
      if (options.output) {
        await FileHandler.writeText(options.output, tokenInfo.token);
      } else {
        console.log(tokenInfo.token);
      }
    });
}
