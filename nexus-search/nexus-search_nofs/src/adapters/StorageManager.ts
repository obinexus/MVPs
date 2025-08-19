import { SerializedState, MetricsResult, DocumentValue } from "@/types";
import { IndexedDocument } from "@/storage/IndexedDocument";
import { PerformanceMonitor, validateDocument, optimizeIndex } from "@/utils";
import { StorageAdapter } from "./StorageAdapter";

/**
 * Comprehensive storage manager that can use different adapters
 */
export class StorageManager {
    private adapter: StorageAdapter;
    private optimizationEnabled: boolean;
    private cache: Map<string, unknown>;
    private readonly performanceMonitor: PerformanceMonitor;
  
    constructor(adapter: StorageAdapter, optimizationEnabled = true) {
      this.adapter = adapter;
      this.optimizationEnabled = optimizationEnabled;
      this.cache = new Map<string, unknown>();
      this.performanceMonitor = new PerformanceMonitor();
    }
  
    async initialize(): Promise<void> {
      return this.performanceMonitor.measure('initialize', async () => {
        await this.adapter.initialize();
      });
    }
  
    async storeDocument(document: IndexedDocument): Promise<void> {
      return this.performanceMonitor.measure('storeDocument', async () => {
        // Validate document before storing
        const isValid = validateDocument(
          { 
            id: document.id, 
            content: document.content as Record<string, DocumentValue>, 
            version: document.version,
            metadata: document.metadata 
          }, 
          ['id', 'content']
        );
        
        if (!isValid) {
          throw new Error(`Invalid document structure: ${document.id}`);
        }
        
        await this.adapter.store(document.id, document);
        this.cache.set(document.id, document);
      });
    }
  
    async retrieveDocument(id: string): Promise<IndexedDocument | null> {
      return this.performanceMonitor.measure('retrieveDocument', async () => {
        // Check cache first
        if (this.cache.has(id)) {
          return this.cache.get(id) as IndexedDocument;
        }
        
        const document = await this.adapter.retrieve(id) as IndexedDocument;
        
        if (document) {
          this.cache.set(id, document);
        }
        
        return document || null;
      });
    }
  
    async storeIndex(indexName: string, data: SerializedState): Promise<void> {
      return this.performanceMonitor.measure('storeIndex', async () => {
        if (this.optimizationEnabled && Array.isArray(data)) {
          // Optimize the index before storing
          const optimized = optimizeIndex(data as unknown as IndexedDocument[]);
          await this.adapter.store(`index-${indexName}`, optimized.data);
        } else {
          await this.adapter.store(`index-${indexName}`, data);
        }
      });
    }
  
    async retrieveIndex(indexName: string): Promise<SerializedState | null> {
      return this.performanceMonitor.measure('retrieveIndex', async () => {
        return (await this.adapter.retrieve(`index-${indexName}`)) as SerializedState;
      });
    }
  
    async clearAll(): Promise<void> {
      return this.performanceMonitor.measure('clearAll', async () => {
        await this.adapter.clear();
        this.cache.clear();
      });
    }
  
    async clearCache(): Promise<void> {
      this.cache.clear();
    }
  
    async close(): Promise<void> {
      await this.adapter.close();
      this.cache.clear();
      this.performanceMonitor.clear();
    }
    
    getMetrics(): MetricsResult {
      return this.performanceMonitor.getMetrics();
    }
    
    setAdapter(adapter: StorageAdapter): void {
      this.adapter = adapter;
    }
    
    setOptimizationEnabled(enabled: boolean): void {
      this.optimizationEnabled = enabled;
    }
  }