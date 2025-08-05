import { ZeroContext } from '../../src/context/ZeroContext';
import { createKey, verifyKey, revokeKey, freeKey, keyToString, keyFromString, isKeyExpired, renewKey } from '../../src/encoding/key';
import { createId } from '../../src/encoding/id';
import { HashAlgorithm } from '../../src/crypto/hash';
import { CryptoFlags } from '../../src/types/common';
import { ZeroError } from '../../src/errors';
import { IZeroId, IZeroKey } from '../../src/types/encoding';

describe('Key Management', () => {
    let context: ZeroContext;
    let testId: IZeroId;

    beforeEach(() => {
        context = ZeroContext.create();
        testId = createId(context, {
            keys: ['test'],
            values: ['value'],
            count: 1
        });
    });

    describe('createKey', () => {
        it('should create a key from valid ID', () => {
            const key = createKey(context, testId);
            expect(key).toBeDefined();
            expect(Buffer.isBuffer(key.hash)).toBeTruthy();
            expect(typeof key.timestamp).toBe('number');
            expect(typeof key.expirationTime).toBe('number');
        });

        it('should throw on invalid inputs', () => {
            expect(() => createKey(null as any, testId)).toThrow(ZeroError);
            expect(() => createKey(context, null as any)).toThrow(ZeroError);
        });

        it('should respect custom options', () => {
            const key = createKey(context, testId, {
                hashAlgorithm: HashAlgorithm.SHA512,
                flags: CryptoFlags.SECURE_MEMORY,
                expirationTime: 60000 // 1 minute
            });
            expect(key.hash.length).toBe(64); // SHA512 length
            expect(key.expirationTime).toBe(key.timestamp + 60000);
        });
    });

    describe('verifyKey', () => {
        let validKey: IZeroKey;

        beforeEach(() => {
            validKey = createKey(context, testId);
        });

        it('should verify valid key', () => {
            expect(verifyKey(context, validKey, testId)).toBeTruthy();
        });

        it('should fail verification with wrong ID', () => {
            const wrongId = createId(context, {
                keys: ['wrong'],
                values: ['data'],
                count: 1
            });
            expect(verifyKey(context, validKey, wrongId)).toBeFalsy();
        });

        it('should fail verification of expired key', () => {
            const expiredKey = {
                ...validKey,
                expirationTime: Date.now() - 1000 // Expired 1 second ago
            };
            expect(verifyKey(context, expiredKey, testId)).toBeFalsy();
        });
    });

    describe('key string conversion', () => {
        let key: IZeroKey;

        beforeEach(() => {
            key = createKey(context, testId);
        });

        it('should convert key to string and back', () => {
            const str = keyToString(context, key);
            const parsed = keyFromString(context, str);
            
            expect(parsed.hash.equals(key.hash)).toBeTruthy();
            expect(parsed.timestamp).toBe(key.timestamp);
            expect(parsed.expirationTime).toBe(key.expirationTime);
        });

        it('should throw on invalid string format', () => {
            expect(() => keyFromString(context, 'invalid')).toThrow(ZeroError);
            expect(() => keyFromString(context, 'a.b.c')).toThrow(ZeroError);
        });
    });

    describe('key expiration', () => {
        it('should check expiration correctly', () => {
            const key = createKey(context, testId);
            expect(isKeyExpired(key)).toBeFalsy();

            const expiredKey = {
                ...key,
                expirationTime: Date.now() - 1000
            };
            expect(isKeyExpired(expiredKey)).toBeTruthy();
        });

        it('should renew keys properly', () => {
            const key = createKey(context, testId);
            const extension = 60000; // 1 minute
            
            const renewedKey = renewKey(key, extension);
            expect(renewedKey.expirationTime).toBe(key.expirationTime! + extension);
        });

        it('should not renew expired keys', () => {
            const expiredKey = {
                ...createKey(context, testId),
                expirationTime: Date.now() - 1000
            };
            expect(() => renewKey(expiredKey)).toThrow(ZeroError);
        });
    });

    describe('key revocation', () => {
        it('should create valid revocation record', () => {
            const key = createKey(context, testId);
            const reason = 'Security breach';
            
            const record = revokeKey(context, key, reason);
            expect(Buffer.isBuffer(record.keyHash)).toBeTruthy();
            expect(record.keyHash.equals(key.hash)).toBeTruthy();
            expect(typeof record.timestamp).toBe('number');
            expect(record.reason).toBe(reason);
        });
    });

    describe('resource cleanup', () => {
        it('should free key resources', () => {
            const key = createKey(context, testId);
            expect(() => freeKey(key)).not.toThrow();
        });

        it('should handle null/invalid keys gracefully', () => {
            expect(() => freeKey(null as any)).not.toThrow();
            expect(() => freeKey({} as any)).not.toThrow();
        });
    });
});