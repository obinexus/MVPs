import { Command } from 'commander';
import { ZeroContext } from '@/context/ZeroContext.js';
import { FileHandler } from '../handlers/FileHandler.js';
import { AuditLogger } from '@/context/AuditLogger.js';

export interface RemoveOptions { input: string; }

export function registerRemoveZidCommand(program: Command, ctx: ZeroContext, logger: AuditLogger): Command {
  return program
    .command('remove-zid')
    .description('Delete a ZID and revoke its tokens')
    .requiredOption('-i, --input <file>', 'ZID file')
    .action(async (opts: RemoveOptions) => {
      const zidData = await FileHandler.readId(opts.input);
      ctx.tokenManager.removeZid(JSON.stringify(zidData));
      logger.log('remove-zid', JSON.stringify(zidData));
    });
}
