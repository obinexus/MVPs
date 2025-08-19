import { IndexedDocument, DocumentContent, DocumentMetadata } from '@/core/types';
import { DocumentProcessor } from './DocumentProcessor';
import { PathUtils } from '../utils/PathUtils';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export class HTMLProcessor extends DocumentProcessor {
  private readonly supportedExtensions = ['html', 'htm', 'xhtml'];
  
  async process(
    filePath: string,
    content: Buffer | string,
    metadata?: DocumentMetadata
  ): Promise<IndexedDocument> {
    return await this.performanceMonitor.measure('htmlProcess', async () => {
      const docContent = await this.extractContent(content);
      const docMetadata = {
        ...(await this.extractBasicMetadata(filePath, content)),
        ...metadata,
        contentType: 'text/html'
      };
      
      const metaTags = this.extractMetaTags(content.toString());
      const title = metaTags.title || PathUtils.getBasename(filePath, false);
      const keywords = metaTags.keywords ? metaTags.keywords.split(',').map(k => k.trim()) : [];
      
      return {
        id: this.generateDocumentId(filePath),
        fields: {
          title: title,
          content: docContent,
          path: filePath,
          author: metaTags.author || '',
          tags: keywords,
          version: '1.0',
          description: metaTags.description || ''
        },
        metadata: {
          ...docMetadata,
          charset: metaTags.charset || 'utf-8',
          language: metaTags.lang || 'en'
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() {
          return {
            id: this.id,
            title: title,
            author: metaTags.author || '',
            tags: keywords,
            version: '1.0',
            metadata: docMetadata,
            versions: [],
            relations: []
          };
        },
        title: title,
        author: metaTags.author || '',
        tags: keywords,
        version: '1.0',
        content: docContent
      };
    });
  }
  
  async extractContent(content: Buffer | string): Promise<DocumentContent> {
    return this.performanceMonitor.measure('htmlExtraction', async () => {
      const htmlContent = typeof content === 'string' ? content : content.toString('utf8');
      
      // Create a DOM parser to extract text and structure (browser environment)
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Remove scripts and styles
        const scripts = doc.getElementsByTagName('script');
        const styles = doc.getElementsByTagName('style');
        Array.from(scripts).concat(Array.from(styles)).forEach(el => el.remove());
        
        // Extract headings
        const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .map(h => ({
            level: parseInt(h.tagName.substring(1)),
            text: h.textContent?.trim() || ''
          }));
        
        // Extract links
        const links = Array.from(doc.getElementsByTagName('a'))
          .map(a => ({
            text: a.textContent?.trim() || '',
            href: a.getAttribute('href') || '',
            title: a.getAttribute('title') || ''
          }));
        
        // Extract main text content
        let mainText = doc.body.textContent || '';
        mainText = mainText.replace(/\s+/g, ' ').trim();
        
        return {
          text: mainText,
          structure: {
            headings,
            links,
            images: Array.from(doc.getElementsByTagName('img')).length,
            tables: Array.from(doc.getElementsByTagName('table')).length
          },
          html: htmlContent // Store original HTML for reference
        };
      } 
      // Node.js environment fallback
      else {
        // Simple regex-based extraction
        // Remove HTML tags, scripts, and styles
        const cleanedText = htmlContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        // Extract title
        const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        return {
          text: cleanedText,
          title: title,
          html: htmlContent
        };
      }
    });
  }
  
  canProcess(filePath: string, mimeType?: string): boolean {
    const extension = PathUtils.getExtension(filePath).toLowerCase();
    
    if (this.supportedExtensions.includes(extension)) {
      return true;
    }
    
    if (mimeType) {
      return ['text/html', 'application/xhtml+xml'].includes(mimeType);
    }
    
    return false;
  }
  
  private extractMetaTags(htmlContent: string): Record<string, string> {
    const metaTags: Record<string, string> = {};
    
    // Extract title
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      metaTags.title = titleMatch[1].trim();
    }
    
    // Extract meta tags
    const metaRegex = /<meta\s+([^>]*)>/gi;
    let metaMatch;
    
    while ((metaMatch = metaRegex.exec(htmlContent)) !== null) {
      const metaContent = metaMatch[1];
      
      // Get name/property and content
      const nameMatch = metaContent.match(/name\s*=\s*["']([^"']*)["']/i);
      const propertyMatch = metaContent.match(/property\s*=\s*["']([^"']*)["']/i);
      const contentMatch = metaContent.match(/content\s*=\s*["']([^"']*)["']/i);
      const charsetMatch = metaContent.match(/charset\s*=\s*["']([^"']*)["']/i);
      
      const name = nameMatch ? nameMatch[1].toLowerCase() : 
                 propertyMatch ? propertyMatch[1].toLowerCase() : '';
      const content = contentMatch ? contentMatch[1] : '';
      
      if (name && content) {
        metaTags[name] = content;
      }
      
      if (charsetMatch) {
        metaTags.charset = charsetMatch[1];
      }
    }
    
    // Extract language
    const htmlLangMatch = htmlContent.match(/<html[^>]*lang\s*=\s*["']([^"']*)["'][^>]*>/i);
    if (htmlLangMatch) {
      metaTags.lang = htmlLangMatch[1];
    }
    
    return metaTags;
  }
}