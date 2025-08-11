import * as types from './types/index.js';

/**
 * Comprehensive parser module for Zero library
 * Provides tokenization, parsing, and result handling for various file formats
 */

// Export all parser functionality
export { types };

// src/parser/index.ts

// Export parser types
export * from './types/result.js';
export * from './types/token.js';

// Export parser implementation
export { ZeroParser, OutputData } from './parser.js';


// Export CLI command options
export {
  ChallengeCommandOptions,
  SignCommandOptions,
  VerifyCommandOptions,
  VerifyProofCommandOptions,
  ProveCommandOptions,
  InfoCommandOptions,
  DeriveCommandOptions,
  CreateCommandOptions
} from './tokenizer.js';