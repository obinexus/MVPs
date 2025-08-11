// src/cli/types/options.ts

/**
 * Common CLI command options
 */
export interface CommonOptions {
  verbose?: boolean;
}

/**
* Output format options
*/
export enum OutputFormat {
  TEXT = 'text',
  JSON = 'json',
  BINARY = 'binary',
  BASE64 = 'base64'
}

/**
* Options for the steganography encode command
*/
export interface StegoEncodeCommandOptions {
  input: string;
  data: string;
  output: string;
  password?: string;
  bits?: string;
  spread?: string;
  format?: string;
  verbose?: boolean;
}

/**
* Options for the steganography decode command
*/
export interface StegoDecodeCommandOptions {
  input: string;
  output: string;
  password?: string;
  verbose?: boolean;
}