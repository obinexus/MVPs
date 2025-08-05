import fs from 'fs/promises';
import { ZeroContext } from '../../context/ZeroContext.js';
import { IZeroId, IZeroKey, IZeroData } from '../../types/encoding.js';
import { ZeroError, ZeroErrorCode } from '../../errors/index.js';
import chalk from 'chalk';

/**
 * Reads input data from a file
 * 
 * @param filePath - Path to the input file (JSON)
 * @returns Data structure for ID creation
 * @throws ZeroError if file cannot be read or parsed
 */
export async function readInputData(filePath: string): Promise<IZeroData> {
  try {
    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse as JSON
    const jsonData = JSON.parse(content);
    
    // Check if keys and values are present
    if (!jsonData) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Input file does not contain valid data',
        { filePath }
      );
    }
    
    // Convert JSON object to IZeroData
    const keys: string[] = [];
    const values: string[] = [];
    
    // Handle different input formats
    if (Array.isArray(jsonData)) {
      // Array of objects: extract all keys and values
      for (const item of jsonData) {
        for (const [key, value] of Object.entries(item)) {
          keys.push(key);
          values.push(String(value));
        }
      }
    } else if (typeof jsonData === 'object') {
      // Simple object: extract keys and values
      for (const [key, value] of Object.entries(jsonData)) {
        keys.push(key);
        values.push(String(value));
      }
    } else {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Input file must contain a JSON object or array',
        { filePath, dataType: typeof jsonData }
      );
    }
    
    // Ensure we have data
    if (keys.length === 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Input file does not contain any properties',
        { filePath }
      );
    }
    
    return {
      keys,
      values,
      count: keys.length
    };
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    if (err instanceof SyntaxError) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        `Invalid JSON in file: ${filePath}`,
        { filePath },
        err
      );
    }
    
    throw new ZeroError(
      ZeroErrorCode.IO_ERROR,
      `Failed to read input data file: ${filePath}`,
      { filePath },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Displays ID and key information in a user-friendly format
 * 
 * @param id - ID to display
 * @param key - Key to display (optional)
 * @param context - Zero context
 */
export function displayIdAndKey(id: IZeroId, key?: IZeroKey, context?: ZeroContext): void {
  console.log(chalk.bold('\nID Information:'));
  console.log(`  ${chalk.cyan('Version:')}  ${id.version}`);
  console.log(`  ${chalk.cyan('Hash:')}     ${id.hash.toString('hex')}`);
  console.log(`  ${chalk.cyan('Salt:')}     ${id.salt.toString('hex')}`);
  
  if (key) {
    console.log(chalk.bold('\nKey Information:'));
    console.log(`  ${chalk.cyan('Hash:')}      ${key.hash.toString('hex')}`);
    console.log(`  ${chalk.cyan('Timestamp:')} ${key.timestamp} (${new Date(key.timestamp).toISOString()})`);
    
    if (key.expirationTime) {
      console.log(`  ${chalk.cyan('Expires:')}   ${key.expirationTime} (${new Date(key.expirationTime).toISOString()})`);
      
      // Check if key is expired
      const isExpired = key.expirationTime < Date.now();
      if (isExpired) {
        console.log(`  ${chalk.red('Status:')}    EXPIRED`);
      } else {
        console.log(`  ${chalk.green('Status:')}    VALID`);
      }
    } else {
      console.log(`  ${chalk.green('Status:')}    VALID (no expiration)`);
    }
  }
  
  console.log(''); // Empty line for better readability
}

/**
 * Displays ID information in a user-friendly format
 * 
 * @param id - ID to display
 * @param context - Zero context
 */
export function displayId(id: IZeroId, context?: ZeroContext): void {
  console.log(chalk.bold('\nID Information:'));
  console.log(`  ${chalk.cyan('Version:')}  ${id.version}`);
  console.log(`  ${chalk.cyan('Hash:')}     ${id.hash.toString('hex')}`);
  console.log(`  ${chalk.cyan('Salt:')}     ${id.salt.toString('hex')}`);
  console.log(''); // Empty line for better readability
}

/**
 * Displays proof verification result
 * 
 * @param isValid - Whether the proof is valid
 * @param id - Associated ID
 * @param challenge - Challenge used for verification
 */
export function displayProofResult(isValid: boolean, id?: IZeroId, challenge?: Buffer): void {
  if (isValid) {
    console.log(chalk.bold.green('\n✓ Proof verification successful'));
  } else {
    console.log(chalk.bold.red('\n✗ Proof verification failed'));
  }
  
  if (id) {
    console.log(chalk.bold('\nID Information:'));
    console.log(`  ${chalk.cyan('Version:')}  ${id.version}`);
    console.log(`  ${chalk.cyan('Hash:')}     ${id.hash.toString('hex').substring(0, 32)}...`);
  }
  
  if (challenge) {
    console.log(chalk.bold('\nChallenge:'));
    console.log(`  ${chalk.cyan('Size:')}     ${challenge.length} bytes`);
    console.log(`  ${chalk.cyan('Value:')}    ${challenge.toString('hex').substring(0, 32)}...`);
  }
  
  console.log(''); // Empty line for better readability
}

/**
 * Formats a file size for display
 * 
 * @param sizeInBytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
