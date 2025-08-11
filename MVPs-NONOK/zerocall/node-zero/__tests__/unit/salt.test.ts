import { generateSalt, generateDeterministicSalt, verifySalt } from '../../src/crypto/salt';
import { CryptoFlags } from '../../src/types/common';
import { ZeroError } from '../../src/errors/ZeroError';
import { CRYPTO } from '../../src/utils/constants';

describe('Salt Module', () => {
    describe('generateSalt', () => {
        it('should generate salt with default options', () => {
            const salt = generateSalt();
            expect(Buffer.isBuffer(salt)).toBe(true);
            expect(salt.length).toBe(CRYPTO.DEFAULT_SALT_LENGTH);
        });

        it('should generate salt with custom length', () => {
            const customLength = 32;
            const salt = generateSalt({ length: customLength });
            expect(salt.length).toBe(customLength);
        });

        it('should generate different salts on subsequent calls', () => {
            const salt1 = generateSalt();
            const salt2 = generateSalt();
            expect(Buffer.compare(salt1, salt2)).not.toBe(0);
        });

        it('should respect security flags', () => {
            const salt = generateSalt({
                flags: CryptoFlags.HIGH_SECURITY
            });
            expect(Buffer.isBuffer(salt)).toBe(true);
        });

        it('should throw on invalid salt length', () => {
            expect(() => generateSalt({ length: 8 })) // Too short
                .toThrow(ZeroError);
            expect(() => generateSalt({ length: 1024 })) // Too long
                .toThrow(ZeroError);
        });

        it('should accept custom entropy', () => {
            const customEntropy = Buffer.from('custom entropy source', 'utf8');
            const salt = generateSalt({
                customEntropy,
                entropySize: customEntropy.length
            });
            expect(Buffer.isBuffer(salt)).toBe(true);
        });

        it('should throw when customEntropy provided without entropySize', () => {
            const customEntropy = Buffer.from('test', 'utf8');
            expect(() => generateSalt({
                customEntropy,
                entropySize: undefined
            })).toThrow(ZeroError);
        });
    });

    describe('generateDeterministicSalt', () => {
        beforeEach(() => {
            // Temporarily set NODE_ENV to development for testing
            process.env.NODE_ENV = 'development';
        });

        afterEach(() => {
            // Reset NODE_ENV
            process.env.NODE_ENV = 'test';
        });

        it('should generate consistent salt for same input', () => {
            const seed = 'test seed';
            const salt1 = generateDeterministicSalt(seed);
            const salt2 = generateDeterministicSalt(seed);
            expect(Buffer.compare(salt1, salt2)).toBe(0);
        });

        it('should handle different input types', () => {
            const stringInput = 'test';
            const bufferInput = Buffer.from(stringInput);
            const uint8Input = new Uint8Array(bufferInput);

            const salt1 = generateDeterministicSalt(stringInput);
            const salt2 = generateDeterministicSalt(bufferInput);
            const salt3 = generateDeterministicSalt(uint8Input);

            expect(Buffer.compare(salt1, salt2)).toBe(0);
            expect(Buffer.compare(salt2, salt3)).toBe(0);
        });

        it('should throw in production environment', () => {
            process.env.NODE_ENV = 'production';
            expect(() => generateDeterministicSalt('test'))
                .toThrow(ZeroError);
        });

        it('should generate different salts for different inputs', () => {
            const salt1 = generateDeterministicSalt('input1');
            const salt2 = generateDeterministicSalt('input2');
            expect(Buffer.compare(salt1, salt2)).not.toBe(0);
        });

        it('should respect custom length parameter', () => {
            const customLength = 32;
            const salt = generateDeterministicSalt('test', customLength);
            expect(salt.length).toBe(customLength);
        });
        // In your salt.test.ts file
it('should accept custom entropy', () => {
    const customEntropy = Buffer.from('custom entropy source', 'utf8');
    const salt = generateSalt({
        length: 32,
        flags: CryptoFlags.SECURE_MEMORY,
        customEntropy,
        entropySize: customEntropy.length
    });
    expect(Buffer.isBuffer(salt)).toBe(true);
    expect(salt.length).toBe(32);
});
    });

    describe('verifySalt', () => {
        it('should verify valid salts', () => {
            const salt = generateSalt();
            expect(verifySalt(salt)).toBe(true);
        });

        it('should reject null or invalid input', () => {
            expect(verifySalt(null as any)).toBe(false);
            expect(verifySalt(undefined as any)).toBe(false);
            expect(verifySalt({} as any)).toBe(false);
        });

        it('should reject salts that are too short', () => {
            const shortSalt = Buffer.alloc(8); // Too short
            expect(verifySalt(shortSalt)).toBe(false);
        });

        it('should verify salts with custom minimum length', () => {
            const salt = generateSalt({ length: 32 });
            expect(verifySalt(salt, 24)).toBe(true); // Custom min length
        });

        it('should handle different input types', () => {
            const buffer = generateSalt();
            const uint8Array = new Uint8Array(buffer);
            expect(verifySalt(buffer)).toBe(true);
            expect(verifySalt(uint8Array)).toBe(true);
        });

        it('should reject salts with excessive repetition', () => {
            const repeatedSalt = Buffer.alloc(32).fill(0x55); // Repeated pattern
            expect(verifySalt(repeatedSalt)).toBe(false);
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle concurrent salt generation', async () => {
            const promises = Array(10).fill(0).map(() => generateSalt());
            const salts = await Promise.all(promises);
            
            // Check all salts are unique
            const uniqueSalts = new Set(salts.map(s => s.toString('hex')));
            expect(uniqueSalts.size).toBe(salts.length);
        });

        it('should handle repeated rapid calls', () => {
            for (let i = 0; i < 100; i++) {
                const salt = generateSalt();
                expect(Buffer.isBuffer(salt)).toBe(true);
                expect(salt.length).toBe(CRYPTO.DEFAULT_SALT_LENGTH);
            }
        });

        it('should throw on invalid options', () => {
            expect(() => generateSalt({ length: -1 })).toThrow(ZeroError);
            expect(() => generateSalt({ flags: 'invalid' as any })).toThrow(ZeroError);
        });

        it('should handle maximum allowed salt length', () => {
            const salt = generateSalt({ length: CRYPTO.MAX_SALT_LENGTH });
            expect(salt.length).toBe(CRYPTO.MAX_SALT_LENGTH);
        });
    });
});