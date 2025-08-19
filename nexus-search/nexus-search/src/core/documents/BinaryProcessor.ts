import { IndexedDocument, DocumentContent, DocumentMetadata } from '@/core/types';
import { DocumentProcessor } from './DocumentProcessor';
import { PathUtils } from '../utils/PathUtils';
import { MimeTypeDetector } from '../utils/MimeTypeDetector';
import { FileUtils } from '../utils/FileUtils';

export class BinaryProcessor extends DocumentProcessor {
  private readonly maxTextExtraction = 10 * 1024; // 10KB max for text extraction
  
  async process(
    filePath: string,
    content: Buffer | string,
    metadata?: DocumentMetadata
  ): Promise<IndexedDocument> {
    return await this.performanceMonitor.measure('binaryProcess', async () => {
      const buffer = typeof content === 'string' ? Buffer.from(content) : content;
      const docContent = await this.extractContent(buffer);
      
      // Enhanced metadata extraction for binary files
      const enhancedMetadata = await this.extractEnhancedMetadata(filePath, buffer);
      const docMetadata = {
        ...enhancedMetadata,
        ...metadata
      };
      
      const filename = PathUtils.getBasename(filePath, true);
      const extension = PathUtils.getExtension(filePath).toLowerCase();
      
      return {
        id: this.generateDocumentId(filePath),
        fields: {
          title: filename,
          content: docContent,
          path: filePath,
          author: '',
          tags: [extension], // Use file extension as a tag
          version: '1.0',
          extension: extension
        },
        metadata: docMetadata,
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() {
          return {
            id: this.id,
            title: filename,
            author: '',
            tags: [extension],
            version: '1.0',
            metadata: docMetadata,
            versions: [],
            relations: []
          };
        },
        title: filename,
        author: '',
        tags: [extension],
        version: '1.0',
        content: docContent
      };
    });
  }
  
  async extractContent(content: Buffer): Promise<DocumentContent> {
    return this.performanceMonitor.measure('binaryExtraction', async () => {
      // Binary file handling primarily focuses on metadata
      // However, we can try to extract ASCII text if present
      
      const result: DocumentContent = {
        binaryType: 'unknown',
        size: content.length,
        hasPrintableText: false
      };
      
      // Check if file contains printable text
      const sampleSize = Math.min(this.maxTextExtraction, content.length);
      const sample = content.slice(0, sampleSize);
      
      // Consider text if more than 90% is printable ASCII
      const printableChars = sample.filter(b => b >= 32 && b <= 126).length;
      const printableRatio = printableChars / sampleSize;
      
      if (printableRatio > 0.9) {
        result.hasPrintableText = true;
        result.text = sample.toString('utf8');
      }
      
      // Detect common binary file types
      if (content.length >= 4) {
        // Check for common binary file signatures
        if (content[0] === 0x50 && content[1] === 0x4B) {
          result.binaryType = 'archive/zip';
        } else if (content[0] === 0xFF && content[1] === 0xD8 && content[2] === 0xFF) {
          result.binaryType = 'image/jpeg';
        } else if (content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4E && content[3] === 0x47) {
          result.binaryType = 'image/png';
        } else if (content[0] === 0x25 && content[1] === 0x50 && content[2] === 0x44 && content[3] === 0x46) {
          result.binaryType = 'application/pdf';
        }
      }
      
      // Calculate a hash of the content for reference
      result.contentHash = this.calculateHash(content);
      
      return result;
    });
  }
  
  canProcess(filePath: string, mimeType?: string): boolean {
    // Binary processor is a fallback for files that other processors can't handle
    // We determine this by checking if the mime type isn't text-based
    
    if (mimeType) {
      const isTextBased = mimeType.startsWith('text/') || 
                          mimeType === 'application/json' ||
                          mimeType === 'application/xml' ||
                          mimeType === 'application/javascript';
      return !isTextBased;
    }
    
    // If no mime type provided, check extension
    const extension = PathUtils.getExtension(filePath).toLowerCase();
    const textExtensions = ['txt', 'md', 'html', 'htm', 'xml', 'json', 'js', 'css', 'csv'];
    
    return !textExtensions.includes(extension);
  }
  
  /**
   * Extract enhanced metadata for binary files
   */
  private async extractEnhancedMetadata(
    filePath: string,
    content: Buffer
  ): Promise<DocumentMetadata> {
    const mimeType = MimeTypeDetector.detectFromBuffer(content);
    const now = Date.now();
    
    const metadata: DocumentMetadata = {
      fileType: mimeType,
      fileSize: content.length,
      lastModified: now,
      indexed: now,
      contentHash: this.calculateHash(content),
      extension: PathUtils.getExtension(filePath).toLowerCase()
    };
    
    // Additional metadata for specific types
    if (mimeType.startsWith('image/')) {
      // Extract image dimensions if possible
      // This would require image processing libraries in a real implementation
      metadata.documentClass = 'image';
    } else if (mimeType.startsWith('audio/')) {
      metadata.documentClass = 'audio';
    } else if (mimeType.startsWith('video/')) {
      metadata.documentClass = 'video';
    } else if (mimeType.startsWith('application/')) {
      if (mimeType.includes('pdf')) {
        metadata.documentClass = 'document';
      } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
        metadata.documentClass = 'archive';
      } else {
        metadata.documentClass = 'application';
      }
    }
    
    return metadata;
  }
  
  /**
   * Calculate a simple hash for content identification
   */
  private calculateHash(buffer: Buffer): string {
    let hash = 0;
    for (let i = 0; i < buffer.length; i++) {
      hash = ((hash << 5) - hash) + buffer[i];
      hash |= 0; // Convert to 32bit integer
    }
    
    // Convert to hex string
    return hash.toString(16).padStart(8, '0');
  }
}