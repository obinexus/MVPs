import { IndexedDocument, DocumentContent, DocumentMetadata } from '@/core/types';
import { DocumentProcessor } from './DocumentProcessor';
import { FileUtils } from '../utils/FileUtils';
import { PathUtils } from '../utils/PathUtils';

export class PlainTextProcessor extends DocumentProcessor {
  private readonly supportedExtensions = ['txt', 'text', 'log', 'csv', 'tsv'];

  async process(
    filePath: string,
    content: Buffer | string,
    metadata?: DocumentMetadata
  ): Promise<IndexedDocument> {
    return await this.performanceMonitor.measure('plainTextProcess', async () => {
      const docContent = await this.extractContent(content);
      const docMetadata = {
        ...(await this.extractBasicMetadata(filePath, content)),
        ...metadata
      };

      const filename = PathUtils.getBasename(filePath, false);
      
      return {
        id: this.generateDocumentId(filePath),
        fields: {
          title: filename,
          content: docContent,
          path: filePath,
          author: '',
          tags: [],
          version: '1.0'
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
            tags: [],
            version: '1.0',
            metadata: docMetadata,
            versions: [],
            relations: []
          };
        },
        title: filename,
        author: '',
        tags: [],
        version: '1.0',
        content: docContent
      };
    });
  }

  async extractContent(content: Buffer | string): Promise<DocumentContent> {
    return this.performanceMonitor.measure('plainTextExtraction', async () => {
      const textContent = typeof content === 'string' 
        ? content 
        : content.toString('utf8');
      
      return { 
        text: textContent,
        lines: textContent.split('\n').length,
        words: textContent.split(/\s+/).filter(Boolean).length
      };
    });
  }

  canProcess(filePath: string, mimeType?: string): boolean {
    const extension = PathUtils.getExtension(filePath).toLowerCase();
    
    if (this.supportedExtensions.includes(extension)) {
      return true;
    }
    
    if (mimeType) {
      return mimeType === 'text/plain';
    }
    
    return false;
  }
}