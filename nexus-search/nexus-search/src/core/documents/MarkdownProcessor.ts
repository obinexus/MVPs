import { IndexedDocument, DocumentContent, DocumentMetadata } from '@/core/types';
import { DocumentProcessor } from './DocumentProcessor';
import { PathUtils } from '../utils/PathUtils';

export class MarkdownProcessor extends DocumentProcessor {
  private readonly supportedExtensions = ['md', 'markdown', 'mdown', 'mkd'];
  
  async process(
    filePath: string,
    content: Buffer | string,
    metadata?: DocumentMetadata
  ): Promise<IndexedDocument> {
    return await this.performanceMonitor.measure('markdownProcess', async () => {
      const docContent = await this.extractContent(content);
      const docMetadata = {
        ...(await this.extractBasicMetadata(filePath, content)),
        ...metadata,
        contentType: 'text/markdown'
      };
      
      // Extract frontmatter data
      const { frontmatter, markdownContent } = this.extractFrontmatter(
        typeof content === 'string' ? content : content.toString('utf8')
      );
      
      const title = frontmatter.title || PathUtils.getBasename(filePath, false);
      const tags = Array.isArray(frontmatter.tags) 
        ? frontmatter.tags 
        : (typeof frontmatter.tags === 'string' 
            ? frontmatter.tags.split(',').map(t => t.trim())
            : []);
      
      return {
        id: this.generateDocumentId(filePath),
        fields: {
          title: title,
          content: docContent,
          path: filePath,
          author: frontmatter.author || '',
          tags: tags,
          version: frontmatter.version || '1.0',
          description: frontmatter.description || '',
          date: frontmatter.date || '',
          category: frontmatter.category || '',
          ...frontmatter // Include all frontmatter fields
        },
        metadata: {
          ...docMetadata,
          markdownType: frontmatter.type || 'standard',
          language: frontmatter.language || 'en'
        },
        versions: [],
        relations: [],
        document: function() { return this; },
        base: function() {
          return {
            id: this.id,
            title: title,
            author: frontmatter.author || '',
            tags: tags,
            version: frontmatter.version || '1.0',
            metadata: docMetadata,
            versions: [],
            relations: []
          };
        },
        title: title,
        author: frontmatter.author || '',
        tags: tags,
        version: frontmatter.version || '1.0',
        content: docContent
      };
    });
  }
  
  async extractContent(content: Buffer | string): Promise<DocumentContent> {
    return this.performanceMonitor.measure('markdownExtraction', async () => {
      const markdownText = typeof content === 'string' ? content : content.toString('utf8');
      
      // Extract frontmatter and main content
      const { frontmatter, markdownContent } = this.extractFrontmatter(markdownText);
      
      // Extract headings using regex
      const headings: Array<{ level: number; text: string; position: number }> = [];
      const headingRegex = /^(#{1,6})\s+(.+)$/gm;
      let match;
      
      while ((match = headingRegex.exec(markdownContent)) !== null) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          position: match.index
        });
      }
      
      // Extract code blocks
      const codeBlocks: Array<{ language: string; code: string }> = [];
      const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
      
      while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
        codeBlocks.push({
          language: match[1] || 'text',
          code: match[2].trim()
        });
      }
      
      // Extract links
      const links: Array<{ text: string; url: string; title?: string }> = [];
      const linkRegex = /\[([^\]]+)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g;
      
      while ((match = linkRegex.exec(markdownContent)) !== null) {
        links.push({
          text: match[1],
          url: match[2],
          title: match[3]
        });
      }
      
      // Convert markdown to plain text for search indexing
      // Remove code blocks, headers symbols, links (keeping link text)
      const plainText = markdownContent
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/#+\s+/g, '') // Remove heading markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just their text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
        .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      return {
        text: plainText,
        structure: {
          headings,
          links,
          codeBlocks
        },
        frontmatter,
        markdown: markdownContent // Store original markdown content
      };
    });
  }
  
  canProcess(filePath: string, mimeType?: string): boolean {
    const extension = PathUtils.getExtension(filePath).toLowerCase();
    
    if (this.supportedExtensions.includes(extension)) {
      return true;
    }
    
    if (mimeType) {
      return ['text/markdown', 'text/x-markdown'].includes(mimeType);
    }
    
    return false;
  }
  
  private extractFrontmatter(markdownText: string): { 
    frontmatter: Record<string, any>;
    markdownContent: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdownText.match(frontmatterRegex);
    
    if (!match) {
      return {
        frontmatter: {},
        markdownContent: markdownText
      };
    }
    
    const frontmatterStr = match[1];
    const content = match[2];
    
    // Parse YAML-style frontmatter
    const frontmatter: Record<string, any> = {};
    const lines = frontmatterStr.split('\n');
    
    for (const line of lines) {
      const keyValueMatch = line.match(/^\s*([^:]+):\s*(.*)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        
        // Handle array values (comma-separated)
        if (value.includes(',') && (key === 'tags' || key === 'categories')) {
          frontmatter[key.trim()] = value.split(',').map(v => v.trim());
        } else {
          frontmatter[key.trim()] = value.trim();
        }
      }
    }
    
    return {
      frontmatter,
      markdownContent: content
    };
  }
}