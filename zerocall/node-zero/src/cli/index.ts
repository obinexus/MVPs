/**
 * CLI main export module
 * 
 * This file serves as the main entry point for the CLI functionality,
 * exporting the main CLI class and functions.
 */

export { createCLI, main, program } from './cli.js';
export {
  registerCreateCommand,
  registerDeriveCommand,
  registerChallengeCommand,
  registerProveCommand,
  registerVerifyCommand,
  registerVerifyProofCommand,
  registerInfoCommand,
  registerStegoCommand,
  registerCreateTokenCommand,
  registerRevokeTokenCommand,
  registerRotateTokenCommand,
  registerListTokensCommand,
  registerRemoveZidCommand,
  registerExportZidCommand
} from './commands/index.js';

