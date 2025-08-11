import { Command } from 'commander';
import { ZeroContext } from '@/context/ZeroContext.js';
import { FileHandler } from '../handlers/FileHandler.js';

export interface ListOptions { input: string; }

export function registerListTokensCommand(program: Command, ctx: ZeroContext): Command {
  return program
    .command('list-tokens')
    .description('List tokens for a ZID')
    .requiredOption('-i, --input <file>', 'ZID file')
    .action(async (opts: ListOptions) => {
      const zidData = await FileHandler.readId(opts.input);
      const tokens = ctx.tokenManager.listTokens(JSON.stringify(zidData));
      tokens.forEach(t => {
        console.log(`${t.token} ${t.revoked ? '(revoked)' : ''}`);
      });
    });
}
