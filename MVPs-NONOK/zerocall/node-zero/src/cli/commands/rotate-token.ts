import { Command } from 'commander';
import { ZeroContext } from '@/context/ZeroContext.js';
import { FileHandler } from '../handlers/FileHandler.js';
import { AuditLogger } from '@/context/AuditLogger.js';

export interface RotateOptions {
  input: string;
  output?: string;
  zid: string;
}

export function registerRotateTokenCommand(program: Command, ctx: ZeroContext, logger: AuditLogger): Command {
  return program
    .command('rotate-token')
    .description('Rotate a token, revoking the old one')
    .requiredOption('-i, --input <file>', 'Existing token file')
    .requiredOption('-z, --zid <file>', 'ZID file for context')
    .option('-o, --output <file>', 'Output path for new token')
    .action(async (opts: RotateOptions) => {
      const token = (await FileHandler.readText(opts.input)).trim();
      const zidData = await FileHandler.readId(opts.zid);
      const newInfo = ctx.tokenManager.rotateToken(token, JSON.stringify(zidData));
      if (!newInfo) return;
      logger.log('rotate-token', JSON.stringify(zidData), newInfo.token);
      if (opts.output) {
        await FileHandler.writeText(opts.output, newInfo.token);
      } else {
        console.log(newInfo.token);
      }
    });
}
