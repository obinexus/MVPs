// src/core/adapters/node/NodeFileSystemAdapter.ts
import { BaseFileSystemAdapter, FileHandler, FileSystemOptions } from "../common/FileSystemAdapter";
import { PerformanceMonitor } from "@/utils/PerformanceMonitor";

/**
 * Node.js-specific implementation of the FileHandler interface
 * Uses Node.js fs/promises module for file system operations
 */
class NodeFileHandler implements FileHandler {
  private fs: any; // fs/promises module
  private path: any; // path module
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private perfMonitor: PerformanceMonitor;

  constructor() {
    this.perfMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize the Node.js file system modules
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadModules();
    return this.initPromise;
  }

  /**
   * Dynamically load Node.js modules to prevent browser bundling issues
   */
  private async loadModules(): Promise<void> {
    try {
      // Only import in Node.js environment
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Use dynamic import to avoid bundling issues in browsers
        this.fs = await import('fs/promises');
        this.path = await import('path');
        this.initialized = true;
      } else {
        throw new Error('Not running in Node.js environment');
      }
    } catch (error) {
      throw new Error(`Failed to load Node.js modules: ${error}`);
    }
  }

  /**
   * Ensure the Node.js modules are initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.fs || !this.path) {
      throw new Error('Node.js modules not initialized');
    }
  }

  /**
   * Read a file using Node.js fs
   */
  async readFile(filePath: string, options?: { encoding?: string }): Promise<string | Uint8Array> {
    return this.perfMonitor.measure('readFile', async () => {
      await this.ensureInitialized();
      
      try {
        if (options?.encoding) {
          return await this.fs.readFile(filePath, { encoding: options.encoding });
        } else {
          return await this.fs.readFile(filePath);
        }
      } catch (error) {
        throw new Error(`Failed to read file (${filePath}): ${error}`);
      }
    });
  }

  /**
   * Write a file using Node.js fs
   */
  async writeFile(filePath: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void> {
    return this.perfMonitor.measure('writeFile', async () => {
      await this.ensureInitialized();
      
      try {
        // Ensure the directory exists
        const dirname = this.path.dirname(filePath);
        await this.mkdir(dirname, { recursive: true });
        
        if (options?.encoding) {
          await this.fs.writeFile(filePath, data, { encoding: options.encoding });
        } else {
          await this.fs.writeFile(filePath, data);
        }
      } catch (error) {
        throw new Error(`Failed to write file (${filePath}): ${error}`);
      }
    });
  }

  /**
   * Check if a file exists using Node.js fs
   */
  async exists(filePath: string): Promise<boolean> {
    return this.perfMonitor.measure('exists', async () => {
      await this.ensureInitialized();
      
      try {
        await this.fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Create a directory using Node.js fs
   */
  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    return this.perfMonitor.measure('mkdir', async () => {
      await this.ensureInitialized();
      
      try {
        await this.fs.mkdir(dirPath, { recursive: options?.recursive || false });
      } catch (error) {
        // Ignore "already exists" errors when recursive is true
        if (options?.recursive && (error as any).code === 'EEXIST') {
          return;
        }
        throw new Error(`Failed to create directory (${dirPath}): ${error}`);
      }
    });
  }

  /**
   * List directory contents using Node.js fs
   */
  async readdir(dirPath: string): Promise<string[]> {
    return this.perfMonitor.measure('readdir', async () => {
      await this.ensureInitialized();
      
      try {
        return await this.fs.readdir(dirPath);
      } catch (error) {
        throw new Error(`Failed to read directory (${dirPath}): ${error}`);
      }
    });
  }

  /**
   * Delete a file using Node.js fs
   */
  async unlink(filePath: string): Promise<void> {
    return this.perfMonitor.measure('unlink', async () => {
      await this.ensureInitialized();
      
      try {
        await this.fs.unlink(filePath);
      } catch (error) {
        // Ignore "not found" errors
        if ((error as any).code === 'ENOENT') {
          return;
        }
        throw new Error(`Failed to delete file (${filePath}): ${error}`);
      }
    });
  }

  /**
   * Get file stats using Node.js fs
   */
  async stat(filePath: string): Promise<{ size: number; lastModified: number }> {
    return this.perfMonitor.measure('stat', async () => {
      await this.ensureInitialized();
      
      try {
        const stats = await this.fs.stat(filePath);
        return {
          size: stats.size,
          lastModified: stats.mtimeMs
        };
      } catch (error) {
        throw new Error(`Failed to get file stats (${filePath}): ${error}`);
      }
    });
  }

  /**
   * Close - no-op in Node.js fs
   */
  async close(): Promise<void> {
    // No explicit close needed for Node.js fs
    this.initialized = false;
    this.initPromise = null;
  }
}

/**
 * Node.js-specific implementation of the FileSystemAdapter
 * Uses Node.js fs/promises module for file system operations
 */
export class NodeFileSystemAdapter extends BaseFileSystemAdapter {
  private fileHandler: NodeFileHandler;

  constructor(options: FileSystemOptions = {}) {
    super(options);
    this.fileHandler = new NodeFileHandler();
  }

  /**
   * Get the Node.js-specific file handler
   */
  protected getFileHandler(): FileHandler {
    return this.fileHandler;
  }

  /**
   * Override initialize to initialize the file handler
   */
  async initialize(): Promise<void> {
    await this.fileHandler.initialize();
    await super.initialize();
  }

  /**
   * Override close to close the file handler
   */
  async close(): Promise<void> {
    await this.fileHandler.close();
    await super.close();
  }
}