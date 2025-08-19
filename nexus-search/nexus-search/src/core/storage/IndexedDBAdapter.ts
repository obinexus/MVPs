// src/core/storage/IndexedDBAdapter.ts
import { openDB, IDBPDatabase } from 'idb';
import { IndexConfig, SerializedIndex } from "@/types";
import { StorageAdapter } from "./StorageAdapter";

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase | null = null;
  private readonly dbName: string;
  private readonly dbVersion: number;
  private initPromise: Promise<void> | null = null;

  constructor(dbName: string = 'nexus-search-db', dbVersion: number = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.db = null;
  }

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeDB();
    return this.initPromise;
  }

  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('searchIndices')) {
            const indexStore = db.createObjectStore('searchIndices', { keyPath: 'id' });
            indexStore.createIndex('timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('metadata')) {
            const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
            metaStore.createIndex('lastUpdated', 'lastUpdated');
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error(`IndexedDB initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Implement all required methods from StorageAdapter interface
  async storeIndex(name: string, data: SerializedIndex): Promise<void> {
    await this.ensureConnection();
    
    try {
      await this.db!.put('searchIndices', {
        id: name,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      throw new Error(`Failed to store index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getIndex(name: string): Promise<SerializedIndex | null> {
    await this.ensureConnection();
    
    try {
      const entry = await this.db!.get('searchIndices', name);
      return entry?.data as SerializedIndex || null;
    } catch (error) {
      throw new Error(`Failed to retrieve index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMetadata(name: string, config: IndexConfig): Promise<void> {
    await this.ensureConnection();
    
    try {
      await this.db!.put('metadata', {
        id: name,
        config,
        lastUpdated: Date.now()
      });
    } catch (error) {
      throw new Error(`Failed to update metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMetadata(name: string): Promise<IndexConfig | null> {
    await this.ensureConnection();
    
    try {
      const entry = await this.db!.get('metadata', name);
      return entry?.config || null;
    } catch (error) {
      throw new Error(`Failed to retrieve metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removeIndex(name: string): Promise<void> {
    await this.ensureConnection();
    
    try {
      await this.db!.delete('searchIndices', name);
      await this.db!.delete('metadata', name);
    } catch (error) {
      throw new Error(`Failed to remove index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearIndices(): Promise<void> {
    await this.ensureConnection();
    
    try {
      await this.db!.clear('searchIndices');
      await this.db!.clear('metadata');
    } catch (error) {
      throw new Error(`Failed to clear indices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasIndex(name: string): Promise<boolean> {
    await this.ensureConnection();
    
    try {
      const key = await this.db!.getKey('searchIndices', name);
      return key !== undefined;
    } catch (error) {
      throw new Error(`Failed to check index existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listIndices(): Promise<string[]> {
    await this.ensureConnection();
    
    try {
      const keys = await this.db!.getAllKeys('searchIndices');
      return keys as string[];
    } catch (error) {
      throw new Error(`Failed to list indices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('IndexedDB connection not available');
    }
  }
}