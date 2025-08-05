// src/cli/handlers/FileHandler.ts

import fs from 'fs/promises';
import path from 'path';
import { ZeroError, ZeroErrorCode } from '../../errors/index.js';
import { IZeroId, IZeroKey } from '../../types/encoding.js';
import { FileFormat, OutputData, ZeroParser } from '../../parser/index.js';

/**
 * File handler for CLI operations
 * Manages file I/O for ZID files, keys, and proofs
 */
export class FileHandler {
  /**
   * Parser instance for file operations
   */
  private static parser = new ZeroParser();
  
  /**
   * Reads an ID from a file
   * 
   * @param filePath - Path to the ID file
   * @returns Parsed ID object
   * @throws ZeroError if file cannot be read or parsed
   */
  public static async readId(filePath: string): Promise<IZeroId> {
    try {
      // Read file content
      const content = await fs.readFile(filePath);
      
      // Parse file and validate ID existence
      const result = this.parser.parseZidFile(content);
      
      if (!result || !result.id) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Failed to parse ID file or file does not contain an ID',
          { filePath }
        );
      }
      
      return result.id;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read ID file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Reads a key from a file
   * 
   * @param filePath - Path to the key file
   * @returns Parsed key object
   * @throws ZeroError if file cannot be read or parsed
   */
  public static async readKey(filePath: string): Promise<IZeroKey> {
    try {
      // Read file content
      const content = await fs.readFile(filePath);
      
      // Try to parse as ZID file first (might contain both ID and key)
      const result = this.parser.parseZidFile(content);
      
      if (!result) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Failed to parse key file',
          { filePath }
        );
      }
      
      // Check if file contains a key
      if (!result.key) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'File does not contain a key',
          { filePath }
        );
      }
      
      return result.key;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read key file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Reads both ID and key from a file
   * 
   * @param filePath - Path to the file
   * @returns Object containing ID and possibly key
   * @throws ZeroError if file cannot be read or parsed
   */
  public static async readIdAndKey(filePath: string): Promise<OutputData> {
    try {
      // Read file content
      const content = await fs.readFile(filePath);
      
      // Auto-detect format and parse
      const result = this.parser.parseZidFile(content);
      
      if (!result) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Failed to parse file',
          { filePath }
        );
      }
      
      return result;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Reads a proof from a file
   * 
   * @param filePath - Path to the proof file
   * @returns Proof data as buffer
   * @throws ZeroError if file cannot be read
   */
  public static async readProof(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read proof file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Reads a challenge from a file
   * 
   * @param filePath - Path to the challenge file
   * @returns Challenge data as buffer
   * @throws ZeroError if file cannot be read
   */
  public static async readChallenge(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read challenge file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Reads JSON data from a file
   * 
   * @param filePath - Path to the JSON file
   * @returns Parsed JSON object
   * @throws ZeroError if file cannot be read or parsed
   */
  public static async readJson<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (err) {
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
        `Failed to read JSON file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Writes ID and key to files
   * 
   * @param outputPath - Base path for output files
   * @param data - ID and key data to write
   * @param format - Output format
   * @throws ZeroError if files cannot be written
   */
  public static async writeOutput(
    outputPath: string,
    data: OutputData,
    format: FileFormat = FileFormat.TEXT
  ): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      if (!data || !data.id) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Output data must contain a valid ID',
          { data }
        );
      }

      // Prepare ID content
      const idData: OutputData = { id: data.id };
      const idContent = this.parser.serializeData(idData, format);
      const isBinary = format === FileFormat.BINARY || Buffer.isBuffer(idContent);
      
      // Write ID file
      await fs.writeFile(outputPath, idContent, isBinary ? undefined : 'utf8');

      // Write key file separately if key exists
      if (data.key) {
        const keyPath = `${outputPath}.key`;
        const keyData: OutputData = { id: data.id, key: data.key };
        const keyContent = this.parser.serializeData(keyData, format);
        await fs.writeFile(keyPath, keyContent, isBinary ? undefined : 'utf8');
      }
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to write output to: ${outputPath}`,
        { outputPath, format },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Writes a proof to a file
   * 
   * @param outputPath - Path for output file
   * @param proof - Proof data to write
   * @throws ZeroError if file cannot be written
   */
  public static async writeProof(outputPath: string, proof: Buffer): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write proof file
      await fs.writeFile(outputPath, proof);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to write proof to: ${outputPath}`,
        { outputPath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Writes a challenge to a file
   * 
   * @param outputPath - Path for output file
   * @param challenge - Challenge data to write
   * @throws ZeroError if file cannot be written
   */
  public static async writeChallenge(outputPath: string, challenge: Buffer): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write challenge file
      await fs.writeFile(outputPath, challenge);
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to write challenge to: ${outputPath}`,
        { outputPath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Writes JSON data to a file
   * 
   * @param outputPath - Path for output file
   * @param data - Data to write as JSON
   * @param pretty - Whether to pretty-print the JSON
   * @throws ZeroError if file cannot be written
   */
  public static async writeJson<T>(
    outputPath: string,
    data: T,
    pretty: boolean = true
  ): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Serialize to JSON
      const json = JSON.stringify(data, null, pretty ? 2 : 0);
      
      // Write JSON file
      await fs.writeFile(outputPath, json, 'utf8');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to write JSON to: ${outputPath}`,
        { outputPath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Writes plain text to a file
   */
  public static async writeText(outputPath: string, text: string): Promise<void> {
    try {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(outputPath, text, 'utf8');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to write text to: ${outputPath}`,
        { outputPath },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Reads plain text from a file
   */
  public static async readText(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read file: ${filePath}`,
        { filePath },
        err instanceof Error ? err : undefined
      );
    }
  }
}