// src/core/adapters/browser/BlobHandler.ts
import { PerformanceMonitor } from "@/utils/PerformanceMonitor";
import { MetricsResult, DocumentContent, DocumentMetadata, SearchableDocument } from "@/types";

/**
 * Options for configuring the BlobHandler
 */
export interface BlobHandlerOptions {
  /**
   * Default chunk size for reading large files (in bytes)
   */
  chunkSize?: number;
  
  /**
   * Default encoding for text operations
   */
  defaultEncoding?: string;
  
  /**
   * Whether to collect detailed metrics
   */
  detailedMetrics?: boolean;
}

/**
 * Blob processing result with metadata
 */
export interface BlobProcessingResult {
  /**
   * The processed content as string
   */
  content: string;
  
  /**
   * Metadata extracted from the blob
   */
  metadata: {
    /**
     * MIME type
     */
    type: string;
    
    /**
     * File size in bytes
     */
    size: number;
    
    /**
     * Last modified timestamp (if available)
     */
    lastModified?: number;
    
    /**
     * Original filename (if available)
     */
    name?: string;
    
    /**
     * Content encoding
     */
    encoding?: string;
    
    /**
     * Additional properties
     */
    [key: string]: unknown;
  };
}

/**
 * BlobHandler provides utilities for working with Blob objects and Files in browser environments
 * It includes methods for reading, processing, and converting blobs to searchable documents
 */
export class BlobHandler {
  private performanceMonitor: PerformanceMonitor;
  private chunkSize: number;
  private defaultEncoding: string;
  private detailedMetrics: boolean;

  /**
   * Create a new BlobHandler
   * @param options Configuration options
   */
  constructor(options: BlobHandlerOptions = {}) {
    this.performanceMonitor = new PerformanceMonitor();
    this.chunkSize = options.chunkSize || 1024 * 1024; // Default 1MB chunks
    this.defaultEncoding = options.defaultEncoding || 'utf-8';
    this.detailedMetrics = options.detailedMetrics || false;
  }

  /**
   * Read a blob as text
   * @param blob The blob to read
   * @param encoding Optional encoding (defaults to UTF-8)
   * @returns Promise resolving to the text content
   */
  async readBlobAsText(blob: Blob, encoding?: string): Promise<string> {
    return this.performanceMonitor.measure('readBlobAsText', async () => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          resolve(reader.result as string);
        };
        
        reader.onerror = () => {
          reject(new Error(`Failed to read blob as text: ${reader.error?.message}`));
        };
        
        reader.readAsText(blob, encoding || this.defaultEncoding);
      });
    });
  }

  /**
   * Read a blob as an ArrayBuffer
   * @param blob The blob to read
   * @returns Promise resolving to the ArrayBuffer
   */
  async readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return this.performanceMonitor.measure('readBlobAsArrayBuffer', async () => {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          resolve(reader.result as ArrayBuffer);
        };
        
        reader.onerror = () => {
          reject(new Error(`Failed to read blob as array buffer: ${reader.error?.message}`));
        };
        
        reader.readAsArrayBuffer(blob);
      });
    });
  }

  /**
   * Read a blob as a data URL
   * @param blob The blob to read
   * @returns Promise resolving to the data URL
   */
  async readBlobAsDataURL(blob: Blob): Promise<string> {
    return this.performanceMonitor.measure('readBlobAsDataURL', async () => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          resolve(reader.result as string);
        };
        
        reader.onerror = () => {
          reject(new Error(`Failed to read blob as data URL: ${reader.error?.message}`));
        };
        
        reader.readAsDataURL(blob);
      });
    });
  }

  /**
   * Process a blob to extract content and metadata based on its type
   * @param blob The blob to process
   * @param options Processing options
   * @returns Promise resolving to processing result
   */
  async processBlob(
    blob: Blob,
    options: {
      encoding?: string;
      extractMetadata?: boolean;
      parseJSON?: boolean;
      detectEncoding?: boolean;
    } = {}
  ): Promise<BlobProcessingResult> {
    return this.performanceMonitor.measure('processBlob', async () => {
      const encoding = options.encoding || this.defaultEncoding;
      const mimeType = blob.type || 'application/octet-stream';
      
      // Initialize metadata
      const metadata: BlobProcessingResult['metadata'] = {
        type: mimeType,
        size: blob.size,
        encoding
      };
      
      // Add filename and last modified date if it's a File
      if (blob instanceof File) {
        metadata.name = blob.name;
        metadata.lastModified = blob.lastModified;
      }
      
      // Extract content based on MIME type
      let content = '';
      
      if (mimeType.startsWith('text/') || 
          mimeType === 'application/json' || 
          mimeType === 'application/xml' ||
          mimeType === 'application/javascript') {
        // Handle text-based MIME types
        content = await this.readBlobAsText(blob, encoding);
        
        // Parse JSON if requested and it's a JSON file
        if (options.parseJSON && mimeType === 'application/json') {
          try {
            const jsonData = JSON.parse(content);
            metadata.jsonStructure = Object.keys(jsonData);
            
            // Handle case when content is an array
            if (Array.isArray(jsonData)) {
              metadata.isArray = true;
              metadata.arrayLength = jsonData.length;
              
              if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
                metadata.itemKeys = Object.keys(jsonData[0]);
              }
            }
          } catch (error) {
            metadata.jsonParseError = (error as Error).message;
          }
        }
      } else if (mimeType.startsWith('image/')) {
        // For images, we store a reference in metadata and the data URL in content
        metadata.isImage = true;
        metadata.dimensions = await this.getImageDimensions(blob);
        content = await this.readBlobAsDataURL(blob);
      } else {
        // For binary files, we use a simple text representation
        content = `Binary file: ${metadata.name || 'unnamed'} (${blob.size} bytes, type: ${mimeType})`;
        metadata.isBinary = true;
      }

      return { content, metadata };
    });
  }

  /**
   * Create a searchable document from a blob
   * @param blob The blob to process
   * @param id Document ID
   * @param customMetadata Additional metadata to include
   * @returns Promise resolving to a searchable document
   */
  async createDocumentFromBlob(
    blob: Blob,
    id: string,
    customMetadata: Record<string, unknown> = {}
  ): Promise<SearchableDocument> {
    return this.performanceMonitor.measure('createDocumentFromBlob', async () => {
      try {
        // Process the blob to extract content and metadata
        const { content, metadata } = await this.processBlob(blob, {
          extractMetadata: true,
          parseJSON: blob.type === 'application/json'
        });

        // Create document content
        const documentContent: DocumentContent = { text: content };
        
        // If it's a file with a name, use it as title
        const title = blob instanceof File ? blob.name : (customMetadata.title as string || id);
        
        // Combine metadata
        const combinedMetadata: DocumentMetadata = {
          lastModified: blob instanceof File ? blob.lastModified : Date.now(),
          fileType: blob.type,
          fileSize: blob.size,
          ...metadata,
          ...customMetadata
        };
        
        // Create searchable document
        const searchableDocument: SearchableDocument = {
          id,
          version: String(customMetadata.version || '1.0'),
          content: {
            content: documentContent,
            title,
            type: blob.type,
            size: blob.size
          },
          metadata: combinedMetadata
        };
        
        return searchableDocument;
      } catch (error) {
        throw new Error(`Failed to create document from blob: ${error}`);
      }
    });
  }

  /**
   * Create a Blob from a string or Uint8Array
   * @param data Data to convert to blob
   * @param options Blob creation options
   * @returns The created Blob
   */
  createBlob(
    data: string | Uint8Array,
    options?: {
      type?: string;
      endings?: 'transparent' | 'native';
    }
  ): Blob {
    return new Blob([data], options);
  }

  /**
   * Create a File from a string or Uint8Array
   * @param data Data to convert to file
   * @param name Filename
   * @param options File creation options
   * @returns The created File
   */
  createFile(
    data: string | Uint8Array,
    name: string,
    options?: {
      type?: string;
      lastModified?: number;
      endings?: 'transparent' | 'native';
    }
  ): File {
    return new File(
      [data],
      name,
      {
        type: options?.type || 'application/octet-stream',
        lastModified: options?.lastModified || Date.now(),
        endings: options?.endings
      }
    );
  }

  /**
   * Convert a blob to a different format
   * @param blob The blob to convert
   * @param options Conversion options
   * @returns Promise resolving to the converted blob
   */
  async convertBlob(
    blob: Blob,
    options: {
      toType?: string;
      encoding?: string;
    }
  ): Promise<Blob> {
    return this.performanceMonitor.measure('convertBlob', async () => {
      const encoding = options.encoding || this.defaultEncoding;
      
      // If no conversion needed, return the original blob
      if (!options.toType || options.toType === blob.type) {
        return blob;
      }
      
      // Read blob content
      let content: string | ArrayBuffer;
      if (options.toType.startsWith('text/') || 
          options.toType === 'application/json' || 
          options.toType === 'application/xml') {
        // For text-based output, read as text
        content = await this.readBlobAsText(blob, encoding);
      } else {
        // For binary output, read as array buffer
        content = await this.readBlobAsArrayBuffer(blob);
      }
      
      // Create new blob with the specified type
      return new Blob([content], { type: options.toType });
    });
  }

  /**
   * Get dimensions of an image blob
   * @param blob The image blob
   * @returns Promise resolving to image dimensions or undefined if not an image
   */
  private async getImageDimensions(blob: Blob): Promise<{ width: number; height: number } | undefined> {
    if (!blob.type.startsWith('image/')) {
      return undefined;
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        resolve(undefined);
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    });
  }

  /**
   * Split a large blob into smaller chunks
   * @param blob The blob to split
   * @param chunkSize Size of each chunk in bytes
   * @returns Array of blob chunks
   */
  splitBlob(blob: Blob, chunkSize?: number): Blob[] {
    const size = chunkSize || this.chunkSize;
    const chunks: Blob[] = [];
    
    // No need to split if the blob is smaller than the chunk size
    if (blob.size <= size) {
      return [blob];
    }
    
    // Split the blob into chunks
    let offset = 0;
    while (offset < blob.size) {
      const end = Math.min(offset + size, blob.size);
      chunks.push(blob.slice(offset, end, blob.type));
      offset = end;
    }
    
    return chunks;
  }

  /**
   * Download a blob as a file
   * @param blob The blob to download
   * @param filename Suggested filename
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): MetricsResult {
    return this.performanceMonitor.getMetrics();
  }
}