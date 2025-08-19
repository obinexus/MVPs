import { SearchableDocument, DocumentContent, MetricsResult } from "@/types";
import { PerformanceMonitor } from "@/utils";

/**
 * Blob reader adapter for handling file uploads in browser environments
 */
export class BlobReaderAdapter {
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
  }

  async readBlob(blob: Blob): Promise<string> {
    return this.performanceMonitor.measure('readBlob', async () => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          resolve(reader.result as string);
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read blob'));
        };
        
        reader.readAsText(blob);
      });
    });
  }

  async createDocumentFromBlob(
    blob: Blob, 
    id: string, 
    metadata: Record<string, unknown> = {}
  ): Promise<SearchableDocument> {
    return this.performanceMonitor.measure('createDocumentFromBlob', async () => {
      try {
        const content = await this.readBlob(blob);
        const documentContent: DocumentContent = { text: content };
        
        // Create searchable document
        const searchableDocument: SearchableDocument = {
          id,
          version: String(metadata.version || '1.0'),
          content: {
            content: documentContent,
            title: String(metadata.title || (blob instanceof File ? blob.name : '') || id),
            type: blob.type,
            size: blob.size
          },
          metadata: {
            lastModified: blob instanceof File ? blob.lastModified : Date.now(),
            ...metadata
          }
        };
        
        return searchableDocument;
      } catch (error) {
        throw new Error(`Failed to create document from blob: ${error}`);
      }
    });
  }
  
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}