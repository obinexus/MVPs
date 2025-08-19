// src/core/adapters/browser/BrowserFileSystemAdapter.ts
import { BaseFileSystemAdapter, FileHandler, FileSystemOptions } from "../common/FileSystemAdapter";
import { PerformanceMonitor } from "@/utils/PerformanceMonitor";

/**
 * Browser-specific implementation of the FileHandler interface
 * Uses IndexedDB for persistent storage since browsers don't have direct file system access
 * (except for the Origin Private File System API which has limited support)
 */
class BrowserFileHandler implements FileHandler {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName: string;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private perfMonitor: PerformanceMonitor;

  constructor(dbName = 'nexus-fs-db', storeName = 'files') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.perfMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, 1);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            // Create a store with a path index
            const store = db.createObjectStore(this.storeName, { keyPath: 'path' });
            store.createIndex('dirPath', 'dirPath', { unique: false });
          }
        };
        
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.initialized = true;
          resolve();
        };
        
        request.onerror = (event) => {
          reject(new Error(`Failed to open IndexedDB: ${(event.target as IDBOpenDBRequest).error}`));
        };
      } catch (error) {
        reject(new Error(`IndexedDB initialization error: ${error}`));
      }
    });

    return this.initPromise;
  }

  /**
   * Ensure the database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
  }

  /**
   * Read a file from IndexedDB
   */
  async readFile(filePath: string, options?: { encoding?: string }): Promise<string | Uint8Array> {
    return this.perfMonitor.measure('readFile', async () => {
      await this.ensureInitialized();
      
      return new Promise<string | Uint8Array>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.get(filePath);
          
          request.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            if (!result) {
              reject(new Error(`File not found: ${filePath}`));
              return;
            }
            
            // Return data based on requested encoding
            if (options?.encoding === 'utf8' || options?.encoding === 'utf-8') {
              resolve(result.data);
            } else {
              // Convert string to Uint8Array if binary output is needed
              if (typeof result.data === 'string') {
                const encoder = new TextEncoder();
                resolve(encoder.encode(result.data));
              } else {
                resolve(result.data);
              }
            }
          };
          
          request.onerror = (event) => {
            reject(new Error(`Failed to read file: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`File read operation error: ${error}`));
        }
      });
    });
  }

  /**
   * Write a file to IndexedDB
   */
  async writeFile(filePath: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void> {
    return this.perfMonitor.measure('writeFile', async () => {
      await this.ensureInitialized();
      
      return new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const objectStore = transaction.objectStore(this.storeName);
          
          // Extract directory path for directory listing capability
          const dirPath = filePath.substring(0, filePath.lastIndexOf('/') || 0);
          
          // Ensure data is in the right format
          let fileData: string | Uint8Array = data;
          if (options?.encoding === 'utf8' || options?.encoding === 'utf-8') {
            if (data instanceof Uint8Array) {
              const decoder = new TextDecoder('utf-8');
              fileData = decoder.decode(data);
            }
          }
          
          const request = objectStore.put({
            path: filePath,
            dirPath,
            data: fileData,
            lastModified: Date.now()
          });
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            reject(new Error(`Failed to write file: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`File write operation error: ${error}`));
        }
      });
    });
  }

  /**
   * Check if a file exists in IndexedDB
   */
  async exists(filePath: string): Promise<boolean> {
    return this.perfMonitor.measure('exists', async () => {
      await this.ensureInitialized();
      
      return new Promise<boolean>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.count(filePath);
          
          request.onsuccess = (event) => {
            resolve((event.target as IDBRequest).result > 0);
          };
          
          request.onerror = (event) => {
            reject(new Error(`Failed to check file existence: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`File existence check error: ${error}`));
        }
      });
    });
  }

  /**
   * Create a directory (simulated in IndexedDB)
   */
  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    return this.perfMonitor.measure('mkdir', async () => {
      await this.ensureInitialized();
      
      // In IndexedDB we don't actually need to create directories
      // They're implicitly created when files are added
      // But we'll store an empty marker file to represent the directory
      
      if (options?.recursive) {
        // Create parent directories if recursive
        const parts = dirPath.split('/').filter(Boolean);
        let currentPath = '';
        
        for (const part of parts) {
          currentPath += (currentPath ? '/' : '') + part;
          await this.writeFile(`${currentPath}/.nexus_dir_marker`, '', { encoding: 'utf8' });
        }
      } else {
        await this.writeFile(`${dirPath}/.nexus_dir_marker`, '', { encoding: 'utf8' });
      }
    });
  }

  /**
   * List directory contents (simulated in IndexedDB)
   */
  async readdir(dirPath: string): Promise<string[]> {
    return this.perfMonitor.measure('readdir', async () => {
      await this.ensureInitialized();
      
      return new Promise<string[]>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const objectStore = transaction.objectStore(this.storeName);
          const index = objectStore.index('dirPath');
          
          // Normalize the directory path to ensure consistent matching
          const normalizedDirPath = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
          
          const request = index.getAll(normalizedDirPath);
          
          request.onsuccess = (event) => {
            const files = (event.target as IDBRequest).result;
            
            if (!files || files.length === 0) {
              resolve([]);
              return;
            }
            
            // Extract the file names from the paths
            const fileNames = files.map(file => {
              const path = file.path;
              // Get just the filename by removing the directory path
              const fileName = path.substring(normalizedDirPath.length + 1);
              // Filter out directory markers and files in subdirectories
              if (!fileName.includes('/') && fileName !== '.nexus_dir_marker') {
                return fileName;
              }
              return null;
            }).filter(Boolean) as string[];
            
            resolve(fileNames);
          };
          
          request.onerror = (event) => {
            reject(new Error(`Failed to read directory: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`Directory read operation error: ${error}`));
        }
      });
    });
  }

  /**
   * Delete a file from IndexedDB
   */
  async unlink(filePath: string): Promise<void> {
    return this.perfMonitor.measure('unlink', async () => {
      await this.ensureInitialized();
      
      return new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.delete(filePath);
          
          request.onsuccess = () => resolve();
          request.onerror = (event): void => {
            reject(new Error(`Failed to delete file: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`File delete operation error: ${error}`));
        }
      });
    });
  }

  /**
   * Get file stats from IndexedDB
   */
  async stat(filePath: string): Promise<{ size: number; lastModified: number }> {
    return this.perfMonitor.measure('stat', async () => {
      await this.ensureInitialized();
      
      return new Promise<{ size: number; lastModified: number }>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.get(filePath);
          
          request.onsuccess = (event): void => {
            const result = (event.target as IDBRequest).result;
            if (!result) {
              reject(new Error(`File not found: ${filePath}`));
              return;
            }
            
            // Calculate size based on data type
            let size = 0;
            if (typeof result.data === 'string') {
              size = new Blob([result.data]).size;
            } else if (result.data instanceof Uint8Array) {
              size = result.data.byteLength;
            }
            
            resolve({
              size,
              lastModified: result.lastModified || Date.now()
            });
          };
          
          request.onerror = (event): void => {
            reject(new Error(`Failed to get file stats: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`File stat operation error: ${error}`));
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      this.initPromise = null;
    }
  }
}

/**
 * Enhanced options for browser file system adapter
 */
export interface BrowserFileSystemOptions extends FileSystemOptions {
  dbName?: string;
  storeName?: string;
}

/**
 * Browser-specific implementation of the FileSystemAdapter
 * Uses IndexedDB for persistent storage
 */
export class BrowserFileSystemAdapter extends BaseFileSystemAdapter {
  private fileHandler: BrowserFileHandler;

  constructor(options: BrowserFileSystemOptions = {}) {
    super(options);
    this.fileHandler = new BrowserFileHandler(
      options.dbName || 'nexus-fs-db',
      options.storeName || 'files'
    );
  }

  /**
   * Get the browser-specific file handler
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