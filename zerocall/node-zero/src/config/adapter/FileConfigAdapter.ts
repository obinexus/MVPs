/**
 * File-based configuration adapter for the Zero library
 * 
 * Handles file operations for configuration:
 * - Loading configuration from file
 * - Saving configuration to file
 * - Checking if configuration file exists
 * - Creating default configuration file
 */
import fs from 'fs/promises';
import path from 'path';
import { ZeroError, ZeroErrorCode } from '../../errors';

/**
 * File-based configuration adapter
 */
export class FileConfigAdapter {
  /**
   * File path for configuration
   */
  private readonly _filePath: string;
  
  /**
   * Creates a new FileConfigAdapter instance
   * 
   * @param filePath - Path to configuration file
   */
  constructor(filePath: string) {
    this._filePath = filePath;
  }
  
  /**
   * Gets the file path
   */
  public get filePath(): string {
    return this._filePath;
  }
  
  /**
   * Loads configuration from file
   * 
   * @returns File content as string
   * @throws ZeroError if file cannot be read
   */
  public async load(): Promise<string> {
    try {
      return await fs.readFile(this._filePath, 'utf8');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to read configuration file: ${this._filePath}`,
        { filePath: this._filePath },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Saves configuration to file
   * 
   * @param content - Content to save
   * @returns True if save was successful
   * @throws ZeroError if file cannot be written
   */
  public async save(content: string): Promise<boolean> {
    try {
      // Ensure directory exists
      await this.createDirectory();
      
      // Write file
      await fs.writeFile(this._filePath, content, 'utf8');
      
      return true;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to write configuration file: ${this._filePath}`,
        { filePath: this._filePath },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Checks if configuration file exists
   * 
   * @returns True if file exists
   */
  public async exists(): Promise<boolean> {
    try {
      await fs.access(this._filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Creates default configuration file
   * 
   * @param defaultContent - Default content to write
   * @returns True if creation was successful
   * @throws ZeroError if file cannot be created
   */
  public async create(defaultContent: string = '{}'): Promise<boolean> {
    try {
      // Ensure directory exists
      await this.createDirectory();
      
      // Create file if it doesn't exist
      const exists = await this.exists();
      if (!exists) {
        await fs.writeFile(this._filePath, defaultContent, 'utf8');
      }
      
      return true;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to create configuration file: ${this._filePath}`,
        { filePath: this._filePath },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Creates directory for configuration file if it doesn't exist
   * 
   * @throws ZeroError if directory cannot be created
   */
  private async createDirectory(): Promise<void> {
    try {
      const directory = path.dirname(this._filePath);
      
      // Create directory recursively
      await fs.mkdir(directory, { recursive: true });
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.IO_ERROR,
        `Failed to create directory for configuration file: ${this._filePath}`,
        { directory: path.dirname(this._filePath) },
        err instanceof Error ? err : undefined
      );
    }
  }
}