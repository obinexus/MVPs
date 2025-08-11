import { ZeroError } from '../../src/errors/ZeroError';
import { ZeroContext } from '../../src/context/ZeroContext';
import { IZeroData, IZeroId, IZeroKey } from '../../src/types/encoding';
import { CryptoFlags } from '../../src/types/common';
import {
  createId, 
  verifyId,
  deriveId,
  idToString,
  idFromString,
  createProof,
  verifyProof,
  generateChallenge,
  encodeId,
  freeId
} from '../../src/encoding/id';
import { HashAlgorithm } from '../../src/crypto/hash';

describe('ID Management', () => {
  let context: ZeroContext;
  let testData: IZeroData;

  beforeEach(() => {
    // Use the factory method instead of 'new' since constructor is private
    context = ZeroContext.create();
    testData = {
      keys: ['test', 'sample'],
      values: ['value1', 'value2'],
      count: 2
    };
  });

  describe('createId', () => {
    it('should create an ID from valid data', () => {
      const id = createId(context, testData);
      expect(id).toBeDefined();
      expect(id.version).toBe(context.config.version);
      expect(Buffer.isBuffer(id.hash)).toBeTruthy();
      expect(Buffer.isBuffer(id.salt)).toBeTruthy();
    });

    it('should throw on invalid data', () => {
      expect(() => createId(context, null as unknown as IZeroData))
        .toThrow(ZeroError);
      expect(() => createId(context, {} as IZeroData))
        .toThrow(ZeroError);
    });

    it('should respect custom options', () => {
      const id = createId(context, testData, {
        hashAlgorithm: HashAlgorithm.SHA256,
        saltLength: 32,
        flags: CryptoFlags.SECURE_MEMORY
      });
      expect(id.hash.length).toBe(32); // SHA256 length
      expect(id.salt.length).toBe(32);
    });
  });

  describe('verifyId', () => {
    let id: IZeroId;
    let key: IZeroKey;

    beforeEach(() => {
      const result = encodeId(context, testData);
      id = result.id;
      key = result.key;
    });

    it('should verify valid ID against original data', () => {
      expect(verifyId(context, id, key, testData)).toBeTruthy();
    });

    it('should fail verification with modified data', () => {
      const modifiedData = {
        keys: ['test', 'sample'],
        values: ['modified', 'value2'],
        count: 2
      };
      expect(verifyId(context, id, key, modifiedData)).toBeFalsy();
    });

    it('should fail verification with invalid key', () => {
      // Create a properly structured invalid key rather than casting a Buffer
      const invalidKey: IZeroKey = {
        hash: Buffer.from('invalid'),
        timestamp: Date.now()
      };
      expect(verifyId(context, id, invalidKey, testData)).toBeFalsy();
    });
  });

  describe('deriveId', () => {
    let baseId: IZeroId;

    beforeEach(() => {
      baseId = createId(context, testData);
    });

    it('should derive new ID from base ID', () => {
      const derivedId = deriveId(context, baseId, 'auth');
      expect(derivedId).toBeDefined();
      expect(derivedId.version).toBe(baseId.version);
      expect(Buffer.isBuffer(derivedId.hash)).toBeTruthy();
      expect(Buffer.isBuffer(derivedId.salt)).toBeTruthy();
    });

    it('should derive different IDs for different purposes', () => {
      const authId = deriveId(context, baseId, 'auth');
      const paymentId = deriveId(context, baseId, 'payment');
      expect(Buffer.compare(authId.hash, paymentId.hash)).not.toBe(0);
    });

    it('should throw on invalid base ID', () => {
      expect(() => deriveId(context, null as unknown as IZeroId, 'auth'))
        .toThrow(ZeroError);
    });
  });

  describe('ID string conversion', () => {
    let id: IZeroId;

    beforeEach(() => {
      id = createId(context, testData);
    });

    it('should convert ID to string and back', () => {
      const str = idToString(context, id);
      const parsed = idFromString(context, str);
      
      expect(parsed.version).toBe(id.version);
      expect(Buffer.compare(parsed.hash, id.hash)).toBe(0);
      expect(Buffer.compare(parsed.salt, id.salt)).toBe(0);
    });

    it('should throw on invalid string format', () => {
      expect(() => idFromString(context, 'invalid'))
        .toThrow(ZeroError);
    });
  });

  describe('Zero-knowledge proofs', () => {
    let id: IZeroId;
    let challenge: Buffer;

    beforeEach(() => {
      id = createId(context, testData);
      challenge = generateChallenge(context);
    });

    it('should create and verify valid proof', () => {
      const proof = createProof(context, id, challenge);
      expect(verifyProof(context, proof, challenge, id)).toBeTruthy();
    });

    it('should fail verification with wrong challenge', () => {
      const proof = createProof(context, id, challenge);
      const wrongChallenge = generateChallenge(context);
      expect(verifyProof(context, proof, wrongChallenge, id)).toBeFalsy();
    });

    it('should generate unique challenges', () => {
      const challenge1 = generateChallenge(context);
      const challenge2 = generateChallenge(context);
      expect(Buffer.compare(challenge1, challenge2)).not.toBe(0);
    });
  });

  describe('Resource cleanup', () => {
    it('should free ID resources', () => {
      const id = createId(context, testData);
      const initialCount = context.activeIds;
      
      freeId(context, id);
      
      expect(context.activeIds).toBe(initialCount - 1);
      // Verify buffers are zeroed
      expect(id.hash.every(byte => byte === 0)).toBeTruthy();
      expect(id.salt.every(byte => byte === 0)).toBeTruthy();
    });

    it('should handle null/invalid IDs gracefully', () => {
      expect(() => freeId(context, null as unknown as IZeroId))
        .not.toThrow();
    });
  });
});