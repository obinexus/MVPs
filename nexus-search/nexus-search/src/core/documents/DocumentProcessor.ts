import { IndexedDocument, DocumentContent, DocumentMetadata } from '@/core/types';
import { MimeTypeDetector } from '../utils/MimeTypeDetector';
import { ValidationUtils } from '../utils/ValidationUtils';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export abstract class DocumentProcessor {
  protected readonly performanceMonitor: PerformanceMonitor;
  protected readonly mimeDetector: MimeTypeDetector;
  protected readonly validator: ValidationUtils;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.mimeDetector = new MimeTypeDetector();
    this.validator = new ValidationUtils('warn');
  }

  /**
   * Process a document and convert it to an indexed document
   * @param filePath Path to the document
   * @param content Raw content of the document
   * @param metadata Optional metadata
   */
  abstract process(
    filePath: string,
    content: Buffer | string,
    metadata?: DocumentMetadata
  ): Promise<IndexedDocument>;

  /**
   * Extract text content from the document
   * @param content Raw document content
   */
  abstract extractContent(content: Buffer | string): Promise<DocumentContent>;

  /**
   * Check if this processor can handle the given file type
   * @param filePath Path to the document
   * @param mimeType Optional mime type
   */
  abstract canProcess(filePath: string, mimeType?: string): boolean;

  /**
   * Generate a unique document ID
   * @param filePath Path to the document
   */
  protected generateDocumentId(filePath: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `doc-${timestamp}-${randomStr}`;
  }

  /**
   * Extract basic metadata from file path and content
   */
  protected async extractBasicMetadata(
    filePath: string,
    content: Buffer | string
  ): Promise<DocumentMetadata> {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    const mimeType = this.mimeDetector.detectType(filePath, buffer);
    
    return {
      fileType: mimeType,
      fileSize: buffer.length,
      lastModified: Date.now(),
      indexed: Date.now(),
    };
  }
}