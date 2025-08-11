import { HashContext, HashAlgorithm, hash, hmac, verifyHash, createHashContext } from '../../src/crypto/hash';
import { CryptoFlags } from '../../src/types/common';
import { ZeroError } from '../../src/errors/ZeroError';

describe('Hash Module', () => {
    describe('HashContext', () => {
        it('should create context with default settings', () => {
            const ctx = new HashContext(HashAlgorithm.SHA256);
            expect(ctx.algorithm).toBe(HashAlgorithm.SHA256);
            expect(ctx.hashSize).toBe(32);
            expect(ctx.flags).toBe(CryptoFlags.SECURE_MEMORY);
        });

        it('should throw on unsupported algorithm', () => {
            expect(() => new HashContext('invalid' as HashAlgorithm)).toThrow(ZeroError);
        });

        it('should allow incremental updates', () => {
            const ctx = new HashContext(HashAlgorithm.SHA256);
            expect(() => {
                ctx.update('part1');
                ctx.update('part2');
            }).not.toThrow();
        });

        it('should prevent updates after finalization', () => {
            const ctx = new HashContext(HashAlgorithm.SHA256);
            ctx.update('data');
            ctx.digest();
            expect(() => ctx.update('more')).toThrow(ZeroError);
        });

        it('should produce consistent digests', () => {
            const ctx1 = new HashContext(HashAlgorithm.SHA256);
            const ctx2 = new HashContext(HashAlgorithm.SHA256);
            
            ctx1.update('test');
            ctx2.update('test');
            
            const digest1 = ctx1.digest('hex');
            const digest2 = ctx2.digest('hex');
            
            expect(digest1).toBe(digest2);
        });

        it('should support secure digest output', () => {
            const ctx = new HashContext(HashAlgorithm.SHA256);
            ctx.update('test');
            const secureDigest = ctx.digestSecure();
            expect(Buffer.isBuffer(secureDigest)).toBe(true);
            expect(secureDigest.length).toBe(32);
        });
    });

    describe('hash function', () => {
        it('should hash data with different algorithms', () => {
            const testData = 'test data';
            const algorithms = [
                { alg: HashAlgorithm.SHA256, size: 32 },
                { alg: HashAlgorithm.SHA384, size: 48 },
                { alg: HashAlgorithm.SHA512, size: 64 },
            ];

            for (const { alg, size } of algorithms) {
                const result = hash(alg, testData);
                expect(Buffer.isBuffer(result)).toBe(true);
                expect(result.length).toBe(size);
            }
        });

        it('should produce consistent hashes', () => {
            const data = 'test data';
            const hash1 = hash(HashAlgorithm.SHA256, data);
            const hash2 = hash(HashAlgorithm.SHA256, data);
            expect(Buffer.compare(hash1, hash2)).toBe(0);
        });

        it('should handle different input types', () => {
            const stringData = 'test';
            const bufferData = Buffer.from(stringData);
            const uint8Data = new Uint8Array(bufferData);

            const stringHash = hash(HashAlgorithm.SHA256, stringData);
            const bufferHash = hash(HashAlgorithm.SHA256, bufferData);
            const uint8Hash = hash(HashAlgorithm.SHA256, uint8Data);

            expect(Buffer.compare(stringHash, bufferHash)).toBe(0);
            expect(Buffer.compare(bufferHash, uint8Hash)).toBe(0);
        });
    });

    describe('HMAC function', () => {
        it('should generate valid HMACs', () => {
            const key = 'secret key';
            const data = 'test data';
            const result = hmac(HashAlgorithm.SHA256, key, data);
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(result.length).toBe(32);
        });

        it('should be consistent with same inputs', () => {
            const key = 'secret key';
            const data = 'test data';
            const hmac1 = hmac(HashAlgorithm.SHA256, key, data);
            const hmac2 = hmac(HashAlgorithm.SHA256, key, data);
            expect(Buffer.compare(hmac1, hmac2)).toBe(0);
        });

        it('should differ with different keys', () => {
            const data = 'test data';
            const hmac1 = hmac(HashAlgorithm.SHA256, 'key1', data);
            const hmac2 = hmac(HashAlgorithm.SHA256, 'key2', data);
            expect(Buffer.compare(hmac1, hmac2)).not.toBe(0);
        });
    });

    describe('verifyHash function', () => {
        it('should verify matching hashes', () => {
            const data = 'test data';
            const hash1 = hash(HashAlgorithm.SHA256, data);
            const hash2 = hash(HashAlgorithm.SHA256, data);
            expect(verifyHash(hash1, hash2)).toBe(true);
        });

        it('should reject non-matching hashes', () => {
            const hash1 = hash(HashAlgorithm.SHA256, 'data1');
            const hash2 = hash(HashAlgorithm.SHA256, 'data2');
            expect(verifyHash(hash1, hash2)).toBe(false);
        });

        it('should throw on invalid inputs', () => {
            const validHash = hash(HashAlgorithm.SHA256, 'test');
            expect(() => verifyHash(null as any, validHash)).toThrow(ZeroError);
            expect(() => verifyHash(validHash, null as any)).toThrow(ZeroError);
        });
    });

    describe('createHashContext function', () => {
        it('should create valid hash context', () => {
            const ctx = createHashContext(HashAlgorithm.SHA256);
            expect(ctx).toBeInstanceOf(HashContext);
            expect(ctx.algorithm).toBe(HashAlgorithm.SHA256);
        });

        it('should respect custom flags', () => {
            const flags = CryptoFlags.HIGH_PERFORMANCE;
            const ctx = createHashContext(HashAlgorithm.SHA256, flags);
            expect(ctx.flags).toBe(flags);
        });

        it('should throw on invalid algorithm', () => {
            expect(() => createHashContext('invalid' as HashAlgorithm)).toThrow(ZeroError);
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle empty input', () => {
            expect(() => hash(HashAlgorithm.SHA256, '')).not.toThrow();
            expect(() => hash(HashAlgorithm.SHA256, Buffer.alloc(0))).not.toThrow();
        });

        it('should handle large input', () => {
            const largeData = Buffer.alloc(1024 * 1024).fill('x');
            expect(() => hash(HashAlgorithm.SHA256, largeData)).not.toThrow();
        });

        it('should handle UTF-8 special characters', () => {
            const specialChars = '🔥👍🌟';
            expect(() => hash(HashAlgorithm.SHA256, specialChars)).not.toThrow();
        });
    });
});