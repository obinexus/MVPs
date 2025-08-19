export class MimeTypeDetector {
    private static readonly DEFAULT_TYPE = 'application/octet-stream';
    private readonly customMimeTypes: Map<string, string>;
    
    constructor(customTypes?: Record<string, string>) {
      this.customMimeTypes = new Map(Object.entries(customTypes || {}));
    }
    
    /**
     * Static detection by file extension
     */
    static detectFromExtension(filename: string): string {
      const extension = filename.toLowerCase().split('.').pop() || '';
      
      const mimeTypes: Record<string, string> = {
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'xml': 'application/xml',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'csv': 'text/csv'
      };
      
      return mimeTypes[extension] || this.DEFAULT_TYPE;
    }
    
    /**
     * Detect from file content (magic numbers)
     */
    static detectFromBuffer(buffer: Buffer): string {
      if (buffer.length < 4) {
        return this.DEFAULT_TYPE;
      }
      
      // Check for magic numbers
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
      }
      
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image/png';
      }
      
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return 'image/gif';
      }
      
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return 'application/pdf';
      }
      
      // Check for text-based formats
      const potentialText = buffer.slice(0, 100).toString('utf8');
      
      if (potentialText.startsWith('<!DOCTYPE html>') || potentialText.startsWith('<html')) {
        return 'text/html';
      }
      
      if (potentialText.startsWith('{') && potentialText.includes(':')) {
        return 'application/json';
      }
      
      if (potentialText.startsWith('<?xml')) {
        return 'application/xml';
      }
      
      if (/^[\x20-\x7E\r\n\t]*$/.test(potentialText)) {
        return 'text/plain';
      }
      
      return this.DEFAULT_TYPE;
    }
    
    /**
     * Instance method with custom type support
     */
    detectType(filename: string, buffer?: Buffer): string {
      // Check custom types first
      const extension = filename.toLowerCase().split('.').pop() || '';
      if (this.customMimeTypes.has(extension)) {
        return this.customMimeTypes.get(extension) || MimeTypeDetector.DEFAULT_TYPE;
      }
      
      // Try content-based detection if buffer is provided
      if (buffer) {
        return MimeTypeDetector.detectFromBuffer(buffer);
      }
      
      // Fall back to extension-based detection
      return MimeTypeDetector.detectFromExtension(filename);
    }
    
    /**
     * Add custom mime type
     */
    addCustomType(extension: string, mimeType: string): void {
      this.customMimeTypes.set(extension.toLowerCase(), mimeType);
    }
  }