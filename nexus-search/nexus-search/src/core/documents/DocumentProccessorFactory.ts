import { DocumentProcessor } from './documents/DocumentProcessor';
import { PlainTextProcessor } from './documents/PlainTextProcessor';
import { HTMLProcessor } from './documents/HTMLProcessor';
import { MarkdownProcessor } from './documents/MarkdownProcessor';
import { BinaryProcessor } from './documents/BinaryProcessor';

export class DocumentProcessorFactory {
  private processors: DocumentProcessor[] = [];
  
  constructor() {
    // Register document processors in priority order
    this.processors.push(new HTMLProcessor());
    this.processors.push(new MarkdownProcessor());
    this.processors.push(new PlainTextProcessor());
    this.processors.push(new BinaryProcessor()); // Fallback processor
  }
  
  /**
   * Get the appropriate processor for a file
   */
  getProcessorForFile(filePath: string, mimeType?: string): DocumentProcessor {
    for (const processor of this.processors) {
      if (processor.canProcess(filePath, mimeType)) {
        return processor;
      }
    }
    
    // Default to binary processor if no other processor matches
    return this.processors[this.processors.length - 1];
  }
  
  /**
   * Process a document with the appropriate processor
   */
  async processDocument(
    filePath: string, 
    content: Buffer | string, 
    metadata?: any
  ): Promise<IndexedDocument> {
    const processor = this.getProcessorForFile(filePath);
    return await processor.process(filePath, content, metadata);
  }
}