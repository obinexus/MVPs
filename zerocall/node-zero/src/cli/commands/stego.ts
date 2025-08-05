import { ZeroContext } from "@/context/ZeroContext.js";
import { encodeIntoBase64Image, decodeFromBase64Image } from "@/crypto/auth/base64.js";
import { CryptoFlags } from "@/types/common.js";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { ZeroError } from "@/errors";
import { ZeroErrorCode } from "@/types";


/**
 * Options for steganography encode command
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
 * Options for steganography decode command
 */
export interface StegoDecodeCommandOptions {
  input: string;
  output: string;
  password?: string;
  verbose?: boolean;
}

/**
 * Registers the 'stego' command with Commander
 * 
 * @param program - Commander program instance
 * @returns The Commander program with command registered
 */
export function registerStegoCommand(program: Command): Command {
  const stegoCmd = program
    .command('stego')
    .description('Secure steganography operations for hiding and extracting data');
  
  stegoCmd
    .command('encode')
    .description('Hide sensitive data within a base64-encoded image')
    .requiredOption('-i, --input <file>', 'Input cover image file')
    .requiredOption('-d, --data <file>', 'Sensitive data file to hide')
    .requiredOption('-o, --output <file>', 'Output steganographically encoded image')
    .option('-p, --password <password>', 'Encryption password for additional security')
    .option('-b, --bits <number>', 'Bits per pixel for data embedding (1-3, default: 1)', '1')
    .option('-s, --spread <factor>', 'Spread factor for data distribution (default: 8)', '8')
    .option('-f, --format <format>', 'Output image format (base64, default: base64)', 'base64')
    .option('-v, --verbose', 'Display detailed encoding information')
    .action(async (options: StegoEncodeCommandOptions) => {
      try {
        await handleStegoEncodeCommand(options);
      } catch (error) {
        handleStegoError(error);
      }
    });
  
  stegoCmd
    .command('decode')
    .description('Extract and decrypt hidden data from a steganographic image')
    .requiredOption('-i, --input <file>', 'Input steganographically encoded image')
    .requiredOption('-o, --output <file>', 'Output file for extracted data')
    .option('-p, --password <password>', 'Decryption password', '')
    .option('-v, --verbose', 'Display detailed decoding information')
    .action(async (options: StegoDecodeCommandOptions) => {
      try {
        await handleStegoDecodeCommand(options);
      } catch (error) {
        handleStegoError(error);
      }
    });
  
  return program;
}

/**
 * Handles the 'stego encode' command execution
 * 
 * @param options - Command options
 */
export async function handleStegoEncodeCommand(options: StegoEncodeCommandOptions): Promise<void> {
  const spinner = ora('Encoding sensitive data into image...').start();
  const context = ZeroContext.create();
  
  try {
    // Validate and parse input parameters
    const bitsPerPixel = validateBitsPerPixel(options.bits);
    const spreadFactor = validateSpreadFactor(options.spread);
    
    // Read cover image and secret data
    const imageData = await fs.readFile(options.input);
    const secretData = await fs.readFile(options.data);
    
    // Encode data with optional encryption
    const encodedImage = encodeIntoBase64Image(
      imageData, 
      secretData, 
      {
        password: options.password,
        bitsPerPixel,
        spreadFactor,
        flags: CryptoFlags.SECURE_MEMORY,
        algorithm: context.config.algorithm
      }
    );
    
    // Ensure output directory exists
    const directory = path.dirname(options.output);
    await fs.mkdir(directory, { recursive: true });
    
    // Write encoded image
    await fs.writeFile(options.output, encodedImage);
    
    spinner.succeed(`Sensitive data successfully encoded: ${chalk.green(options.output)}`);
    
    // Verbose output
    if (options.verbose) {
      displayEncodingDetails(options, imageData, secretData, encodedImage, bitsPerPixel, spreadFactor);
    }
  } catch (error) {
    spinner.fail('Failed to encode data into image');
    handleStegoError(error);
  }
}

/**
 * Handles the 'stego decode' command execution
 * 
 * @param options - Command options
 */
export async function handleStegoDecodeCommand(options: StegoDecodeCommandOptions): Promise<void> {
  const spinner = ora('Decoding hidden data from image...').start();
  
  try {
    // Read encoded image
    const encodedImage = await fs.readFile(options.input, 'utf8');
    
    // Decode and potentially decrypt data
    const decodedData = decodeFromBase64Image(
      encodedImage,
      options.password
    );
    
    // Ensure output directory exists
    const directory = path.dirname(options.output);
    await fs.mkdir(directory, { recursive: true });
    
    // Write decoded data
    await fs.writeFile(options.output, decodedData);
    
    spinner.succeed(`Hidden data successfully extracted: ${chalk.green(options.output)}`);
    
    // Verbose output
    if (options.verbose) {
      displayDecodingDetails(options, decodedData);
    }
  } catch (error) {
    spinner.fail('Failed to decode data from image');
    handleStegoError(error);
  }
}

/**
 * Validates bits per pixel parameter
 * 
 * @param bitsStr - Bits per pixel as a string
 * @returns Validated bits per pixel
 */
function validateBitsPerPixel(bitsStr?: string): number {
  const bits = parseInt(bitsStr || '1', 10);
  
  if (isNaN(bits) || bits < 1 || bits > 3) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Bits per pixel must be an integer between 1 and 3',
      { providedBits: bitsStr }
    );
  }
  
  return bits;
}

/**
 * Validates spread factor parameter
 * 
 * @param spreadStr - Spread factor as a string
 * @returns Validated spread factor
 */
function validateSpreadFactor(spreadStr?: string): number {
  const spread = parseInt(spreadStr || '8', 10);
  
  if (isNaN(spread) || spread < 1 || spread > 64) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Spread factor must be an integer between 1 and 64',
      { providedSpread: spreadStr }
    );
  }
  
  return spread;
}

/**
 * Displays detailed encoding information
 */
function displayEncodingDetails(
  options: StegoEncodeCommandOptions, 
  imageData: Buffer, 
  secretData: Buffer, 
  encodedImage: string, 
  bitsPerPixel: number,
  spreadFactor: number
): void {
  const encodedSize = Buffer.from(encodedImage, 'base64').length;
  
  console.log(chalk.bold('\nSteganography Encoding Details:'));
  console.log(`  ${chalk.cyan('Cover Image:')}     ${options.input} (${imageData.length} bytes)`);
  console.log(`  ${chalk.cyan('Secret Data:')}     ${options.data} (${secretData.length} bytes)`);
  console.log(`  ${chalk.cyan('Output Image:')}    ${options.output} (${encodedSize} bytes)`);
  console.log(`  ${chalk.cyan('Bits Per Pixel:')}  ${bitsPerPixel}`);
  console.log(`  ${chalk.cyan('Spread Factor:')}   ${spreadFactor}`);
  console.log(`  ${chalk.cyan('Encryption:')}      ${options.password ? 'Enabled' : 'Disabled'}`);
  console.log('');
}

/**
 * Displays detailed decoding information
 */
function displayDecodingDetails(
  options: StegoDecodeCommandOptions,
  decodedData: Buffer
): void {
  console.log(chalk.bold('\nSteganography Decoding Details:'));
  console.log(`  ${chalk.cyan('Input Image:')}     ${options.input}`);
  console.log(`  ${chalk.cyan('Extracted Data:')}  ${options.output} (${decodedData.length} bytes)`);
  console.log(`  ${chalk.cyan('Decryption:')}      ${options.password ? 'Enabled' : 'Disabled'}`);
  console.log('');
}

/**
 * Handles errors from steganography commands
 * 
 * @param error - Error object
 */
function handleStegoError(error: unknown): void {
  if (error instanceof ZeroError) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.details) {
      console.error(chalk.yellow('Details:'), error.details);
    }
  } else {
    console.error(chalk.red(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`));
  }
  process.exit(1);
}