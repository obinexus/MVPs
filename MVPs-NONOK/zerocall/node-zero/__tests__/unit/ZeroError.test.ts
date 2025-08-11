import { ZeroError } from '../../src/errors/ZeroError';
import { ZeroErrorCode } from '../../src/types/error';

describe('ZeroError', () => {
    describe('constructor', () => {
        it('should create error with basic properties', () => {
            const error = new ZeroError(
                ZeroErrorCode.INVALID_ARGUMENT,
                'Test error message'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ZeroError);
            expect(error.name).toBe('ZeroError');
            expect(error.message).toBe('Test error message');
            expect(error.code).toBe(ZeroErrorCode.INVALID_ARGUMENT);
            expect(error.stack).toBeDefined();
            expect(error.timestamp).toBeLessThanOrEqual(Date.now());
        });

        it('should include details in message when provided', () => {
            const details = { param: 'test', value: 123 };
            const error = new ZeroError(
                ZeroErrorCode.INVALID_ARGUMENT,
                'Test message',
                details
            );

            expect(error.message).toContain('Test message');
            expect(error.message).toContain('param: test');
            expect(error.message).toContain('value: 123');
            expect(error.details).toEqual(details);
        });

        it('should handle cause properly', () => {
            const cause = new Error('Original error');
            const error = new ZeroError(
                ZeroErrorCode.CRYPTO_FAILURE,
                'Wrapper error',
                undefined,
                cause
            );

            expect(error.message).toContain('Wrapper error');
            expect(error.message).toContain('Caused by: Original error');
            expect(error.cause).toBe(cause);
        });
    });

    describe('toErrorInfo', () => {
        it('should convert error to IZeroErrorInfo format', () => {
            const details = { test: 'value' };
            const cause = new Error('Test cause');
            const error = new ZeroError(
                ZeroErrorCode.INVALID_FORMAT,
                'Test error',
                details,
                cause
            );

            const info = error.toErrorInfo();
            expect(info.code).toBe(ZeroErrorCode.INVALID_FORMAT);
            expect(info.message).toContain('Test error');
            expect(info.details).toEqual(details);
            expect(info.cause).toBe(cause);
        });
    });

    describe('toJSON', () => {
        it('should serialize error to JSON format', () => {
            const error = new ZeroError(
                ZeroErrorCode.NOT_FOUND,
                'Test error'
            );

            const json = error.toJSON();
            expect(json.name).toBe('ZeroError');
            expect(json.code).toBe(ZeroErrorCode.NOT_FOUND);
            expect(json.message).toBe('Test error');
            expect(json.timestamp).toBeDefined();
            expect(json.stack).toBeDefined();
        });

        it('should handle cause in JSON serialization', () => {
            const cause = new Error('Cause error');
            const error = new ZeroError(
                ZeroErrorCode.UNKNOWN,
                'Test error',
                undefined,
                cause
            );

            const json = error.toJSON();
            expect(json.cause).toBeDefined();
            expect(json.cause).toHaveProperty('name', 'Error');
            expect(json.cause).toHaveProperty('message', 'Cause error');
            expect(json.cause).toHaveProperty('stack');
        });
    });

    describe('factory methods', () => {
        describe('invalidArgument', () => {
            it('should create invalid argument error', () => {
                const error = ZeroError.invalidArgument(
                    'Invalid value',
                    'testParam',
                    'string',
                    123
                );

                expect(error.code).toBe(ZeroErrorCode.INVALID_ARGUMENT);
                expect(error.message).toContain('Invalid value');
                expect(error.details).toHaveProperty('paramName', 'testParam');
                expect(error.details).toHaveProperty('expectedType', 'string');
                expect(error.details).toHaveProperty('actualValue', '123');
            });
        });

        describe('notInitialized', () => {
            it('should create not initialized error', () => {
                const error = ZeroError.notInitialized('TestComponent');

                expect(error.code).toBe(ZeroErrorCode.NOT_INITIALIZED);
                expect(error.message).toBe('TestComponent is not initialized');
                expect(error.details).toHaveProperty('component', 'TestComponent');
            });

            it('should handle missing component name', () => {
                const error = ZeroError.notInitialized();

                expect(error.code).toBe(ZeroErrorCode.NOT_INITIALIZED);
                expect(error.message).toBe('Component not initialized');
                expect(error.details).toBeUndefined();
            });
        });

        describe('bufferTooSmall', () => {
            it('should create buffer too small error', () => {
                const error = ZeroError.bufferTooSmall(100, 50);

                expect(error.code).toBe(ZeroErrorCode.BUFFER_TOO_SMALL);
                expect(error.message).toContain('required 100 bytes, got 50 bytes');
                expect(error.details).toEqual({
                    requiredSize: 100,
                    actualSize: 50,
                    deficit: 50
                });
            });
        });

        describe('cryptoFailure', () => {
            it('should create crypto failure error', () => {
                const cause = new Error('Encryption failed');
                const error = ZeroError.cryptoFailure(
                    'AES encryption',
                    { mode: 'CBC' },
                    cause
                );

                expect(error.code).toBe(ZeroErrorCode.CRYPTO_FAILURE);
                expect(error.message).toContain('AES encryption');
                expect(error.details).toEqual({ mode: 'CBC' });
                expect(error.cause).toBe(cause);
            });
        });

        describe('unsupportedAlgorithm', () => {
            it('should create unsupported algorithm error', () => {
                const error = ZeroError.unsupportedAlgorithm(
                    'MD5',
                    ['SHA-256', 'SHA-512']
                );

                expect(error.code).toBe(ZeroErrorCode.UNSUPPORTED_ALGORITHM);
                expect(error.message).toContain('MD5');
                expect(error.details).toEqual({
                    algorithm: 'MD5',
                    supportedAlgorithms: ['SHA-256', 'SHA-512']
                });
            });
        });

        describe('verificationFailed', () => {
            it('should create verification failed error', () => {
                const error = ZeroError.verificationFailed(
                    'Token',
                    'expired signature'
                );

                expect(error.code).toBe(ZeroErrorCode.VERIFICATION_FAILED);
                expect(error.message).toBe('Verification failed for Token: expired signature');
                expect(error.details).toEqual({
                    entity: 'Token',
                    reason: 'expired signature'
                });
            });

            it('should handle missing reason', () => {
                const error = ZeroError.verificationFailed('Token');

                expect(error.message).toBe('Verification failed for Token');
                expect(error.details).toEqual({
                    entity: 'Token',
                    reason: undefined
                });
            });
        });

        describe('invalidFormat', () => {
            it('should create invalid format error', () => {
                const error = ZeroError.invalidFormat(
                    'ISO8601',
                    { value: '2023-13-45' }
                );

                expect(error.code).toBe(ZeroErrorCode.INVALID_FORMAT);
                expect(error.message).toContain('ISO8601');
                expect(error.details).toEqual({ value: '2023-13-45' });
            });
        });
    });

    describe('fromErrorInfo', () => {
        it('should recreate error from error info', () => {
            const originalError = new ZeroError(
                ZeroErrorCode.INVALID_ARGUMENT,
                'Original error',
                { test: 'value' },
                new Error('Cause')
            );

            const info = originalError.toErrorInfo();
            const recreatedError = ZeroError.fromErrorInfo(info);

            expect(recreatedError).toBeInstanceOf(ZeroError);
            expect(recreatedError.code).toBe(originalError.code);
            expect(recreatedError.message).toBe(originalError.message);
            expect(recreatedError.details).toEqual(originalError.details);
            expect(recreatedError.cause).toBe(originalError.cause);
        });
    });
});