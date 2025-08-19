import { MetricsResult } from "@/types";
import { PerformanceMonitor } from "@/utils";
import { FileSystemAdapter } from "./FileReaderAdapter";

/**
 * Storage method interfaces
 */
export interface StorageAdapter {
  initialize(): Promise<void>;
  store(key: string, data: unknown): Promise<void>;
  retrieve(key: string): Promise<unknown>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Memory-based storage adapter implementation
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, unknown>;
  private performanceMonitor: PerformanceMonitor;
  private initialized = false;

  constructor() {
    this.storage = new Map<string, unknown>();
    this.performanceMonitor = new PerformanceMonitor();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize memory storage: ${error}`);
    }
  }

  async store(key: string, data: unknown): Promise<void> {
    return this.performanceMonitor.measure('store', async () => {
      this.storage.set(key, data);
    });
  }

  async retrieve(key: string): Promise<unknown> {
    return this.performanceMonitor.measure('retrieve', async () => {
      return this.storage.get(key);
    });
  }

  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      this.storage.clear();
    });
  }

  async close(): Promise<void> {
    this.storage.clear();
    this.performanceMonitor.clear();
  }
  
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}

/**
 * IndexedDB storage adapter implementation
 */
export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;
  private performanceMonitor: PerformanceMonitor;
  private initialized = false;




  constructor(dbName: string, storeName = 'documents', version = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.performanceMonitor = new PerformanceMonitor();
  }

  async initialize(): Promise<void> {
    if (this.initialized && this.db) return;
    
    return new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
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
  }

  async store(key: string, data: unknown): Promise<void> {
    return this.performanceMonitor.measure('store', async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      return new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.put({
            id: key,
            data,
            timestamp: Date.now()
          });
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            reject(new Error(`Failed to store data: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`Store operation error: ${error}`));
        }
      });
    });
  }

  async retrieve(key: string): Promise<unknown> {
    return this.performanceMonitor.measure('retrieve', async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      return new Promise<unknown>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.get(key);
          
          request.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            resolve(result ? result.data : null);
          };
          
          request.onerror = (event) => {
            reject(new Error(`Failed to retrieve data: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`Retrieve operation error: ${error}`));
        }
      });
    });
  }

  async clear(): Promise<void> {
    return this.performanceMonitor.measure('clear', async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      return new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const objectStore = transaction.objectStore(this.storeName);
          
          const request = objectStore.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            reject(new Error(`Failed to clear data: ${(event.target as IDBRequest).error}`));
          };
        } catch (error) {
          reject(new Error(`Clear operation error: ${error}`));
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
    this.performanceMonitor.clear();
  }
  
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}


/**
 * Factory to create the appropriate storage adapter based on environment
 */
export class StorageAdapterFactory {
  static createAdapter(type: 'memory' | 'indexeddb' | 'filesystem', options: Record<string, unknown> = {}): StorageAdapter {
    switch (type) {
      case 'memory':
        return new MemoryStorageAdapter();
      
      case 'indexeddb':
        return new IndexedDBAdapter(
          options.dbName as string || 'nexus-search',
          options.storeName as string || 'documents',
          options.version as number || 1
        );
      
      case 'filesystem':
        return new FileSystemAdapter(options.basePath as string || './data');
      
      default:
        return new MemoryStorageAdapter();
    }
  }
  
  static createManager(_type: 'memory' | 'indexeddb' | 'filesystem', _options: Record<string, unknown> = {}): StorageManager {
    return new StorageManager();
  }
}