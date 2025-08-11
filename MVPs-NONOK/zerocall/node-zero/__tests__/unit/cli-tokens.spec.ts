import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ZeroContext } from '../../src/context/ZeroContext';
import { AuditLogger } from '../../src/context/AuditLogger';
import { registerCreateTokenCommand } from '../../src/cli/commands/create-token';
import { registerRevokeTokenCommand } from '../../src/cli/commands/revoke-token';
import { registerRotateTokenCommand } from '../../src/cli/commands/rotate-token';
import { registerListTokensCommand } from '../../src/cli/commands/list-tokens';
import { Command } from 'commander';
import { FileHandler } from '../../src/cli/handlers/FileHandler';
import { createId } from '../../src/encoding/id';

function createProgram(ctx: ZeroContext, logger: AuditLogger): Command {
  const program = new Command();
  registerCreateTokenCommand(program, ctx, logger);
  registerRevokeTokenCommand(program, ctx, logger);
  registerRotateTokenCommand(program, ctx, logger);
  registerListTokensCommand(program, ctx);
  return program;
}

describe('CLI token commands', () => {
  it('creates, revokes and rotates tokens', async () => {
    const ctx = ZeroContext.create();
    const logger = new AuditLogger(path.join(os.tmpdir(), 'audit.log'));
    const program = createProgram(ctx, logger);

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-token-'));
    const zidFile = path.join(tmp, 'id.zid');
    const tokenFile = path.join(tmp, 'tok.txt');
    const data = { keys: ['a'], values: ['b'], count: 1 };
    const id = createId(ctx, data);
    await FileHandler.writeOutput(zidFile, { id });

    await program.parseAsync(['node', 'test', 'create-token', '-i', zidFile, '-o', tokenFile]);
    const token = (await fs.readFile(tokenFile, 'utf8')).trim();
    expect(token.length).toBeGreaterThan(0);

    await program.parseAsync(['node', 'test', 'revoke-token', '-i', tokenFile]);
    const listed = ctx.tokenManager.listTokens(JSON.stringify(id));
    expect(listed[0].revoked).toBe(true);

    await fs.writeFile(tokenFile, token);
    await program.parseAsync(['node', 'test', 'rotate-token', '-i', tokenFile, '-z', zidFile, '-o', tokenFile]);
    const rotated = (await fs.readFile(tokenFile, 'utf8')).trim();
    expect(rotated).not.toBe(token);
  });
});
