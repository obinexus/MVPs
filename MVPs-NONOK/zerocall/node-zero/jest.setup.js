// jest.setup.js
// Add any global test setup here

// Import Jest's extended expect functions
import '@testing-library/jest-dom';

// Mocking crypto for consistent test behavior
jest.mock('crypto', () => {
  const originalModule = jest.requireActual('crypto');
  
  return {
    ...originalModule,
    // Provide deterministic randomBytes for testing
    randomBytes: jest.fn((size) => {
      const buffer = Buffer.alloc(size);
      // Fill with predictable pattern for testing
      for (let i = 0; i < size; i++) {
        buffer[i] = i % 256;
      }
      return buffer;
    }),
  };
});

// Set up global environment variables needed for tests
process.env.NODE_ENV = 'test';