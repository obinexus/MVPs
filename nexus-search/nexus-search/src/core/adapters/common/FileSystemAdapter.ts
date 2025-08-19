// src/core/adapters/common/FileSystemAdapter.ts
import { MetricsResult } from "@/types";
import { PerformanceMonitor } from "@/utils/PerformanceMonitor";
import { StorageAdapter } from "@/core/storage/StorageAdapter";

/**
 * Options for configuring FileSystemAdapter
 */
export interface FileSystemOptions {
  basePath?: string;
  encoding?: string;
  createIfMissing?: boolean;
  throttleWrites?: boolean;
  throttleDelay?: number;
}

/**
 * Common interface for file handling operations
 * This is implemented by both browser and node implementations
 */
export interface FileHandler {
  readFile(filePath: string, options?: { encoding?: string }): Promise<string | Uint8Array>;
  writeFile(filePath: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(dirPath: string): Promise<string[]>;
  unlink(filePath: string): Promise<void>;
  stat(filePath: string): Promise<{ size: number; lastModified: number }>;
}

/**
 * Abstract base class for FileSystemAdapter implementations
 * This provides common functionality while delegating platform-specific
 * operations to implementations for browser and Node environments
 */
export abstract class BaseFileSystemAdapter implements StorageAdapter {
  protected basePath: string;
  protected encoding: string;
  protected createIfMissing: boolean;
  protected performanceMonitor: PerformanceMonitor;
  protected throttleWrites: boolean;
  protected throttleDelay: number;
  protected writeQueue: Map<string, Promise<void>>;
  protected initialized = false;

  constructor(options: FileSystemOptions = {}) {
    this.basePath = options.basePath || './data';
    this.encoding = options.encoding || 'utf8';
    this.createIfMissing = options.createIfMissing !== false;
    this.throttleWrites = options.throttleWrites || false;
    this.throttleDelay = options.throttleDelay || 100;
    this.writeQueue = new Map();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize the adapter - must be called before any operations
   */
  async initialize(): Promise<void> {
    return this.performanceMonitor.measure('initialize', async () => {
      if (this.initialized) return;
      
      try {
        if (this.createIfMissing) {
          await this.ensureDirectory(this.basePath);
        }
        
        this.initialized = true;
      } catch (error) {
        throw new Error(`Failed to initialize file system storage: ${error}`);
      }
    });
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  protected async ensureDirectory(dirPath: string): Promise<void> {
    const handler = this.getFileHandler();
    
    try {
      const exists = await handler.exists(dirPath);
      if (!exists) {
        await handler.mkdir(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to ensure directory exists: ${error}`);
    }
  }

  /**
   * Store an index
   */
  async storeIndex(name: string, data: unknown): Promise<void> {
    return this.performanceMonitor.measure('storeIndex', async () => {
      await this.ensureInitialized();
      
      try {
        const filePath = this.getFilePath(`index-${name}.json`);
        const jsonData = JSON.stringify(data, null, 2);
        
        if (this.throttleWrites) {
          await this.throttledWrite(filePath, jsonData);
        } else {
          await this.getFileHandler().writeFile(filePath, jsonData, { encoding: this.encoding });
        }
      } catch (error) {
        throw new Error(`Failed to store index: ${error}`);
      }
    });
  }

  /**
   * Retrieve an index
   */
  async getIndex(name: string): Promise<unknown | null> {
    return this.performanceMonitor.measure('getIndex', async () => {
      await this.ensureInitialized();
      
      try {
        const filePath = this.getFilePath(`index-${name}.json`);
        const exists = await this.getFileHandler().exists(filePath);
        
        if (!exists) {
          return null;
        }
        
        const jsonData = await this.getFileHandler().readFile(filePath, { encoding: this.encoding });
        return JSON.parse(typeof jsonData === 'string' ? jsonData : new TextDecoder().decode(jsonData));
      } catch (error) {
        if ((error as Error).message.includes('ENOENT')) {
          return null;
        }
        throw new Error(`Failed to retrieve index: ${error}`);
      }
    });
  }

  /**
   * Update metadata for an index
   */
  async updateMetadata(name: string, config: unknown): Promise<void> {
    return this.performanceMonitor.measure('updateMetadata', async () => {
      await this.ensureInitialized();
      
      try {
        const filePath = this.getFilePath(`meta-${name}.json`);
        const jsonData = JSON.stringify(config, null, 2);
        
        if (this.throttleWrites) {
          await this.throttledWrite(filePath, jsonData);
        } else {
          await this.getFileHandler().writeFile(filePath, jsonData, { encoding: this.encoding });
        }
      } catch (error) {
        throw new Error(`Failed to update metadata: ${error}`);
      }
    });
  }

  /**
   * Retrieve metadata for an index
   */
  async getMetadata(name: string): Promise<unknown | null> {
    return this.performanceMonitor.measure('getMetadata', async () => {
      await this.ensureInitialized();
      
      try {
        const filePath = this.getFilePath(`meta-${name}.json`);
        const exists = await this.getFileHandler().exists(filePath);
        
        if (!exists) {
          return null;
        }
        
        const jsonData = await this.getFileHandler().readFile(filePath, { encoding: this.encoding });
        return JSON.parse(typeof jsonData === 'string' ? jsonData : new TextDecoder().decode(jsonData));
      } catch (error) {
        if ((error as Error).message.includes('ENOENT')) {
          return null;
        }
        throw new Error(`Failed to retrieve metadata: ${error}`);
      }
    });
  }

  /**
   * Remove an index and its metadata
   */
  async removeIndex(name: string): Promise<void> {
    return this.performanceMonitor.measure('removeIndex', async () => {
      await this.ensureInitialized();
      
      try {
        const indexPath = this.getFilePath(`index-${name}.json`);
        const metaPath = this.getFilePath(`meta-${name}.json`);
        const handler = this.getFileHandler();
        
        const indexExists = await handler.exists(indexPath);
        const metaExists = await handler.exists(metaPath);
        
        const promises: Promise<void>[] = [];
        
        if (indexExists) {
          promises.push(handler.unlink(indexPath));
        }
        
        if (metaExists) {
          promises.push(handler.unlink(metaPath));
        }
        
        await Promise.all(promises);
      } catch (error) {
        throw new Error(`Failed to remove index: ${error}`);
      }
    });
  }

  /**
   * Clear all indices
   */
  async clearIndices(): Promise<void> {
    return this.performanceMonitor.measure('clearIndices', async () => {
      await this.ensureInitialized();
      
      try {
        const files = await this.getFileHandler().readdir(this.basePath);
        
        const jsonFiles = files.filter(file => 
          file.endsWith('.json') && 
          (file.startsWith('index-') || file.startsWith('meta-'))
        );
        
        const promises = jsonFiles.map(file => 
          this.getFileHandler().unlink(this.getFilePath(file))
        );
        
        await Promise.all(promises);
      } catch (error) {
        throw new Error(`Failed to clear indices: ${error}`);
      }
    });
  }

  /**
   * Check if an index exists
   */
  async hasIndex(name: string): Promise<boolean> {
    return this.performanceMonitor.measure('hasIndex', async () => {
      await this.ensureInitialized();
      
      try {
        const filePath = this.getFilePath(`index-${name}.json`);
        return await this.getFileHandler().exists(filePath);
      } catch (error) {
        throw new Error(`Failed to check index existence: ${error}`);
      }
    });
  }

  /**
   * List all available indices
   */
  async listIndices(): Promise<string[]> {
    return this.performanceMonitor.measure('listIndices', async () => {
      await this.ensureInitialized();
      
      try {
        const files = await this.getFileHandler().readdir(this.basePath);
        
        return files
          .filter(file => file.startsWith('index-') && file.endsWith('.json'))
          .map(file => file.replace(/^index-/, '').replace(/\.json$/, ''));
      } catch (error) {
        throw new Error(`Failed to list indices: ${error}`);
      }
    });
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.writeQueue.clear();
    this.performanceMonitor.clear();
  }

  /**
   * Get metrics for the adapter
   */
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get the full file path for a filename
   */
  protected getFilePath(filename: string): string {
    // Simple path joining that works in both browser and Node
    return `${this.basePath.replace(/\/+$/, '')}/${filename}`;
  }

  /**
   * Ensure the adapter is initialized
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Write with throttling to prevent file system contention
   */
  protected async throttledWrite(filePath: string, data: string): Promise<void> {
    let writePromise = this.writeQueue.get(filePath);
    
    if (writePromise) {
      // Wait for previous write to complete
      await writePromise;
    }
    
    // Create a new write promise
    writePromise = new Promise<void>((resolve, reject) => {
      // Add a small delay to throttle writes
      setTimeout(() => {
        this.getFileHandler().writeFile(filePath, data, { encoding: this.encoding })
          .then(resolve)
          .catch(reject)
          .finally(() => {
            // Remove from queue when done
            this.writeQueue.delete(filePath);
          });
      }, this.throttleDelay);
    });
    
    // Store in queue
    this.writeQueue.set(filePath, writePromise);
    
    return writePromise;
  }

  /**
   * Get the file handler implementation - must be provided by subclasses
   */
  protected abstract getFileHandler(): FileHandler;
}