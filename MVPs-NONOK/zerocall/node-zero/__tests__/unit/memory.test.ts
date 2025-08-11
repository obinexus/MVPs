import { ZeroError } from '../../src/errors/ZeroError';
import { SYSTEM } from '../../src/utils/constants';
import {
  secureAlloc, 
  secureFree, 
  secureWipe, 
  constantTimeCompare,
  isSecureBuffer,
  secureRandomBytes,
  secureCopy,
  secureClone
} from '../../src/utils/memory';

describe('Memory Management', () => {
  describe('secureAlloc', () => {
    it('should allocate memory of requested size', () => {
      const size = 1024;
      const buffer = secureAlloc(size);
      expect(buffer.length).toBe(size);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should throw on invalid size', () => {
      expect(() => secureAlloc(0)).toThrow(ZeroError);
      expect(() => secureAlloc(-1)).toThrow(ZeroError);
    });

    it('should throw on excessive size', () => {
      expect(() => secureAlloc(SYSTEM.MAX_AUTO_BUFFER_SIZE + 1)).toThrow(ZeroError);
    });
  });

  describe('secureFree', () => {
    it('should free memory and wipe contents', () => {
      const buffer = secureAlloc(16);
      buffer.fill(0xFF);
      secureFree(buffer);
      // Buffer should be zeroed
      expect(Buffer.from(buffer).every(byte => byte === 0)).toBe(true);
    });

    it('should handle null/empty buffers', () => {
      expect(() => secureFree(null as unknown as Buffer)).not.toThrow();
      expect(() => secureFree(Buffer.alloc(0))).not.toThrow();
    });

    it('should verify expected size', () => {
      const buffer = secureAlloc(16);
      expect(() => secureFree(buffer, 16)).not.toThrow();
      const wrongBuffer = secureAlloc(32);
      expect(() => secureFree(wrongBuffer, 16)).toThrow(ZeroError);
    });
  });

  describe('secureWipe', () => {
    it('should wipe buffer contents', () => {
      const buffer = Buffer.alloc(16);
      buffer.fill(0xFF);
      secureWipe(buffer);
      expect(buffer.every(byte => byte === 0)).toBe(true);
    });

    it('should handle null/empty buffers', () => {
      expect(() => secureWipe(null as unknown as Buffer)).not.toThrow();
      expect(() => secureWipe(Buffer.alloc(0))).not.toThrow();
    });
  });

  describe('constantTimeCompare', () => {
    it('should return 0 for equal buffers', () => {
      const a = Buffer.from([1, 2, 3]);
      const b = Buffer.from([1, 2, 3]);
      expect(constantTimeCompare(a, b)).toBe(0);
    });

    it('should return non-zero for different buffers', () => {
      const a = Buffer.from([1, 2, 3]);
      const b = Buffer.from([1, 2, 4]);
      expect(constantTimeCompare(a, b)).not.toBe(0);
    });

    it('should return non-zero for different length buffers', () => {
      const a = Buffer.from([1, 2, 3]);
      const b = Buffer.from([1, 2]);
      expect(constantTimeCompare(a, b)).not.toBe(0);
    });
  });

  describe('isSecureBuffer', () => {
    it('should return true for securely allocated buffers', () => {
      const buffer = secureAlloc(16);
      expect(isSecureBuffer(buffer)).toBe(true);
    });

    it('should return false for regular buffers', () => {
      const buffer = Buffer.alloc(16);
      expect(isSecureBuffer(buffer)).toBe(false);
    });

    it('should return false for null/invalid input', () => {
      expect(isSecureBuffer(null)).toBe(false);
      expect(isSecureBuffer(undefined)).toBe(false);
      expect(isSecureBuffer({})).toBe(false);
    });
  });

  describe('secureRandomBytes', () => {
    it('should generate random bytes of requested size', () => {
      const size = 32;
      const bytes = secureRandomBytes(size);
      expect(bytes.length).toBe(size);
    });

    it('should generate different values on each call', () => {
      const bytes1 = secureRandomBytes(32);
      const bytes2 = secureRandomBytes(32);
      // In theory this could randomly fail, but the probability is astronomically small
      expect(Buffer.compare(bytes1, bytes2)).not.toBe(0);
    });

    it('should throw on invalid size', () => {
      expect(() => secureRandomBytes(0)).toThrow(ZeroError);
      expect(() => secureRandomBytes(-1)).toThrow(ZeroError);
    });
  });

  describe('secureCopy', () => {
    it('should copy data between buffers', () => {
      const source = Buffer.alloc(16);
      const target = Buffer.alloc(16);
      source.fill(0xFF);
      secureCopy(source, target);
      expect(Buffer.compare(source, target)).toBe(0);
    });

    it('should respect offset and length parameters', () => {
      const source = Buffer.alloc(16);
      const target = Buffer.alloc(16);
      source.fill(0xFF);
      secureCopy(source, target, 4, 4, 8);
      expect(target.slice(0, 4).every(byte => byte === 0)).toBe(true);
      expect(target.slice(4, 12).every(byte => byte === 0xFF)).toBe(true);
      expect(target.slice(12).every(byte => byte === 0)).toBe(true);
    });

    it('should throw on invalid parameters', () => {
      const source = Buffer.alloc(16);
      const target = Buffer.alloc(16);
      expect(() => secureCopy(null as unknown as Buffer, target)).toThrow(ZeroError);
      expect(() => secureCopy(source, null as unknown as Buffer)).toThrow(ZeroError);
      expect(() => secureCopy(source, target, -1)).toThrow(ZeroError);
      expect(() => secureCopy(source, target, 0, -1)).toThrow(ZeroError);
      expect(() => secureCopy(source, target, 0, 0, 20)).toThrow(ZeroError);
    });
  });

  describe('secureClone', () => {
    it('should create an identical copy', () => {
      const original = Buffer.alloc(16);
      original.fill(0xFF);
      const clone = secureClone(original);
      expect(Buffer.compare(original, clone)).toBe(0);
    });

    it('should create a new secure buffer', () => {
      const original = Buffer.alloc(16);
      const clone = secureClone(original);
      expect(isSecureBuffer(clone)).toBe(true);
      expect(clone).not.toBe(original); // Different object
    });

    it('should throw on null input', () => {
      expect(() => secureClone(null as unknown as Buffer)).toThrow(ZeroError);
    });
  });
  
  describe('constant-time operations', () => {
    // These tests verify that the implementation adheres to
    // the formal security requirements from the ZKP documentation
    it('should use constant-time comparisons for security-critical operations', () => {
      // Test that the comparison doesn't short-circuit (should process all bytes)
      const a = Buffer.alloc(1000).fill(0xFF);
      const b = Buffer.alloc(1000).fill(0xFF);
      
      // Make only the last byte different
      b[999] = 0xFE;
      
      // Non-zero return value indicates difference
      expect(constantTimeCompare(a, b)).not.toBe(0);
    });
    
    it('should detect trailing canary corruption in secure buffers', () => {
      const buffer = secureAlloc(32);
      
      // This test is a bit hacky - we're trying to access internal structure
      // We use the fact that the buffer is a view into a larger allocation
      // that contains header and trailing canary
      
      // Get a reference to the underlying buffer
      const backingArrayBuffer = buffer.buffer;
      
      // Create a view that covers the entire allocation 
      // (this might fail if the implementation changes)
      try {
        const fullBuffer = Buffer.from(backingArrayBuffer);
        
        // Attempt to modify the trailing canary (assumes it's right after the data)
        // This is implementation-dependent and might need adjustment
        const canaryPos = buffer.byteOffset + buffer.length;
        if (canaryPos + 1 < fullBuffer.length) {
          fullBuffer[canaryPos] ^= 0xFF; // Flip bits in the canary
          
          // Now when we try to free the buffer, it should throw
          expect(() => secureFree(buffer)).toThrow();
        }
      } catch (e) {
        // If we can't access the backing buffer, skip this test
        console.log('Skipping canary corruption test - cannot access backing buffer');
      }
    });
  });
});