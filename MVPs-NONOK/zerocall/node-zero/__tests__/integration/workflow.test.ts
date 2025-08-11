import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ZeroContext } from '../../src/context/ZeroContext';
import { createId, verifyId, deriveId, createProof, verifyProof, generateChallenge, encodeId, freeId } from '../../src/encoding/id';
import { verifySalt } from '../../src/crypto/salt';
import { handleCreateCommand } from '../../src/cli/commands/create';
import { handleChallengeCommand } from '../../src/cli/commands/challenge';
import { handleProveCommand } from '../../src/cli/commands/prove';
import { handleVerifyProofCommand } from '../../src/cli/commands/verify-proof';

describe('Integration: Zero Identity workflow', () => {
  it('creates, verifies, derives and proves identities', () => {
    const context = ZeroContext.create();
    const data = { keys: ['user'], values: ['alice'], count: 1 };

    const { id, key } = encodeId(context, data);
    expect(verifySalt(id.salt)).toBe(true); // salt verification

    // positive verification
    expect(verifyId(context, id, key, data)).toBe(true);

    // negative verification
    const badData = { keys: ['user'], values: ['bob'], count: 1 };
    expect(verifyId(context, id, key, badData)).toBe(false);

    const derivedId = deriveId(context, id, 'auth');
    expect(Buffer.compare(id.hash, derivedId.hash)).not.toBe(0);

    const challenge = generateChallenge(context);
    const proof = createProof(context, derivedId, challenge);
    expect(verifyProof(context, proof, challenge, derivedId)).toBe(true);

    const wrongChallenge = generateChallenge(context);
    expect(verifyProof(context, proof, wrongChallenge, derivedId)).toBe(false);

    // cleanup
    freeId(context, id);
    freeId(context, derivedId);
    expect(context.activeIds).toBe(0);
  });

  it('tracks memory usage across ID lifecycle', () => {
    const context = ZeroContext.create();
    const start = context.memoryUsed;
    const data = { keys: ['m'], values: ['n'], count: 1 };
    const id = createId(context, data);
    expect(context.memoryUsed).toBeGreaterThan(start);
    freeId(context, id);
    expect(context.memoryUsed).toBe(start);
  });

  it('CLI command flow generates and verifies proofs', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zero-test-'));
    const dataFile = path.join(tmpDir, 'data.json');
    await fs.writeFile(dataFile, JSON.stringify({ keys: ['x'], values: ['y'], count: 1 }));

    const idFile = path.join(tmpDir, 'id.zid');
    await handleCreateCommand({ input: dataFile, output: idFile, salt: '32', algorithm: 'sha512', format: 'text', verbose: false });

    const challengeFile = path.join(tmpDir, 'challenge.bin');
    await handleChallengeCommand({ output: challengeFile, size: '32' });

    const proofFile = path.join(tmpDir, 'proof.bin');
    await handleProveCommand({ input: idFile, challenge: challengeFile, output: proofFile, format: 'binary', verbose: false });

    await expect(handleVerifyProofCommand({ input: proofFile, challenge: challengeFile, id: idFile })).resolves.not.toThrow();
  });
});
