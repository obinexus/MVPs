// jest.setup.js
// ESM compatible test setup

// Mock for the Node.js crypto module
const mockCrypto = {
  randomBytes: jest.fn((size) => {
    const buffer = Buffer.alloc(size);
    // Fill with predictable pattern for testing
    for (let i = 0; i < size; i++) {
      buffer[i] = i % 256;
    }
    return buffer;
  }),
  createHash: jest.fn((algorithm) => {
    const mockHashInstance = {
      update: jest.fn(() => mockHashInstance),
      digest: jest.fn((encoding) => {
        if (encoding) {
          return '0123456789abcdef0123456789abcdef';
        }
        return Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
      })
    };
    return mockHashInstance;
  }),
  createHmac: jest.fn((algorithm, key) => {
    const mockHmacInstance = {
      update: jest.fn(() => mockHmacInstance),
      digest: jest.fn((encoding) => {
        if (encoding) {
          return '0123456789abcdef0123456789abcdef';
        }
        return Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
      })
    };
    return mockHmacInstance;
  }),
  pbkdf2Sync: jest.fn((password, salt, iterations, keylen, digest) => {
    return Buffer.alloc(keylen).fill(0xAA);
  }),
  scryptSync: jest.fn((password, salt, keylen, options) => {
    return Buffer.alloc(keylen).fill(0xBB);
  })
};

// Set up global mocks
global.crypto = {
  getRandomValues: (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = i % 256;
    }
    return buffer;
  }
};

// Setup Jest mocks for modules
jest.mock('crypto', () => mockCrypto);

// Set environment variables
process.env.NODE_ENV = 'test';