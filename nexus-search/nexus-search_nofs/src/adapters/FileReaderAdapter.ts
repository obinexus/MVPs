import { MetricsResult } from '@/types';
import { PerformanceMonitor } from '@/utils';
import { StorageAdapter } from './StorageAdapter';

/**
 * File system storage adapter implementation for Node.js environments
 */
export class FileSystemAdapter implements StorageAdapter {
  private basePath: string;
  private fs: any; // File system module
  private performanceMonitor: PerformanceMonitor;
  private initialized = false;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.performanceMonitor = new PerformanceMonitor();
    
    // Dynamic import for fs in Node.js environments
    try {
      // This is for environments where dynamic imports are supported
      this.loadFsModule();
    } catch (error) {
      console.warn('File system module not available:', error);
    }
  }

  private async loadFsModule(): Promise<void> {
    try {
      // Try to load the fs/promises module dynamically
      // Note: This only works in Node.js environments
      this.fs = await import('fs/promises');
    } catch (error) {
      throw new Error(`Failed to load file system module: ${error}`);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      if (!this.fs) {
        await this.loadFsModule();
      }
      
      // Ensure the base directory exists
      await this.fs.mkdir(this.basePath, { recursive: true });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize file system storage: ${error}`);
    }
  }

  async store(key: string, data: unknown): Promise<void> {
    return this.performanceMonitor.measure('store', async () => {
      if (!this.fs) {
        throw new Error('File system module not available');
      }
      
      try {
        const filePath = this.getFilePath(key);
        const jsonData = JSON.stringify(data, null, 2);
        await this.fs.writeFile(filePath, jsonData, 'utf8');
      } catch (error) {
        throw new Error(`Failed to store data to file system: ${error}`);
      }
    });
  }

  async retrieve(key: string): Promise<unknown> {
    return this.performanceMonitor.measure('retrieve', async () => {
      if (!this.fs) {
        throw new Error('File system module not available');
      }
      
      try {
        const filePath = this.getFilePath(key);
        const fileExists = await this.fileExists(filePath);
        
        if (!fileExists) {
          return null;
        }
        
        const jsonData = await this.fs.readFile(filePath, 'utf8');
        return JSON.parse(jsonData);
      } catch (error) {
        throw new Error(`Failed to retrieve data from file system: ${error}`);
      }
    });
  }

  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      if (!this.fs) {
        throw new Error('File system module not available');
      }
      
      try {
        // Read all files in the directory and delete them
        const files = await this.fs.readdir(this.basePath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            await this.fs.unlink(`${this.basePath}/${file}`);
          }
        }
      } catch (error) {
        throw new Error(`Failed to clear files: ${error}`);
      }
    });
  }

  async close(): Promise<void> {
    // No specific close operation needed for file system
    this.performanceMonitor.clear();
  }
  
  private getFilePath(key: string): string {
    const sanitizedKey = key.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${this.basePath}/${sanitizedKey}.json`;
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}
