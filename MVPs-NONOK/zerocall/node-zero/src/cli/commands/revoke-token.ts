import { Command } from 'commander';
import { ZeroContext } from '@/context/ZeroContext.js';
import { FileHandler } from '../handlers/FileHandler.js';
import { AuditLogger } from '@/context/AuditLogger.js';

export interface RevokeOptions {
  input: string;
}

export function registerRevokeTokenCommand(program: Command, ctx: ZeroContext, logger: AuditLogger): Command {
  return program
    .command('revoke-token')
    .description('Revoke an existing token')
    .requiredOption('-i, --input <file>', 'Token file')
    .action(async (opts: RevokeOptions) => {
      const token = (await FileHandler.readText(opts.input)).trim();
      ctx.tokenManager.revokeToken(token);
      logger.log('revoke-token', '', token);
    });
}
