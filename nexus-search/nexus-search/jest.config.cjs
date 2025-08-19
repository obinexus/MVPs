module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@algorithms/(.*)$': '<rootDir>/src/core/algorithms/$1',
    '^@search/(.*)$': '<rootDir>/src/core/search/$1',
    '^@storage/(.*)$': '<rootDir>/src/core/storage/$1',
    '^@utils/(.*)$': '<rootDir>/src/core/utils/$1',
    '^@documents/(.*)$': '<rootDir>/src/core/documents/$1',
    '^@types/(.*)$': '<rootDir>/src/core/types/$1',
    '^@telemetry/(.*)$': '<rootDir>/src/core/telemetry/$1',
    '^@adapters/(.*)$': '<rootDir>/src/core/adapters/$1',
    '^@web/(.*)$': '<rootDir>/src/core/web/$1',
    '^@cli/(.*)$': '<rootDir>/src/cli/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react',
        moduleResolution: 'node',
        allowJs: true,
        esModuleInterop: true
      }
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  },
  testTimeout: 10000,
  verbose: true
}