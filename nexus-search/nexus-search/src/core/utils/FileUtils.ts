export class FileUtils {
    private readonly maxFileSize: number;
    
    constructor(maxFileSize: number = 100 * 1024 * 1024) { // 100MB default
      this.maxFileSize = maxFileSize;
    }
    
    /**
     * Static method to read a file asynchronously
     */
    static async readFile(
      path: string,
      options?: { encoding?: string }
    ): Promise<Buffer | string> {
      try {
        // Browser environment
        if (typeof window !== 'undefined' && window.fs) {
          return await window.fs.readFile(path, options);
        }
        
        // Node.js environment
        const fs = await import('fs/promises');
        return await fs.readFile(path, options);
      } catch (error) {
        throw new Error(`Failed to read file ${path}: ${error}`);
      }
    }
    
    /**
     * Read text file with proper encoding detection
     */
    static async readTextFile(path: string): Promise<string> {
      const buffer = await this.readFile(path);
      
      // Try to detect encoding
      const encoding = this.detectEncoding(buffer as Buffer);
      
      // Read again with correct encoding
      return (await this.readFile(path, { encoding })) as string;
    }
    
    /**
     * Detect file encoding
     */
    private static detectEncoding(buffer: Buffer): string {
      // Simple BOM detection
      if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'utf8';
      }
      if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf16be';
      }
      if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf16le';
      }
      
      // Default to UTF-8
      return 'utf8';
    }
    
    /**
     * Instance method to read file with size validation
     */
    async readFileWithSizeCheck(path: string): Promise<Buffer> {
      const fs = await import('fs/promises');
      const stats = await fs.stat(path);
      
      if (stats.size > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
      }
      
      return await fs.readFile(path);
    }
    
    /**
     * Write content to file
     */
    static async writeFile(
      path: string,
      content: string | Buffer,
      options?: { encoding?: string }
    ): Promise<void> {
      try {
        // Browser environment
        if (typeof window !== 'undefined' && window.fs) {
          await window.fs.writeFile(path, content, options);
          return;
        }
        
        // Node.js environment
        const fs = await import('fs/promises');
        await fs.writeFile(path, content, options);
      } catch (error) {
        throw new Error(`Failed to write to file ${path}: ${error}`);
      }
    }
    
    /**
     * Check if file exists
     */
    static async fileExists(path: string): Promise<boolean> {
      try {
        // Browser environment
        if (typeof window !== 'undefined' && window.fs) {
          await window.fs.stat(path);
          return true;
        }
        
        // Node.js environment
        const fs = await import('fs/promises');
        await fs.access(path);
        return true;
      } catch (error) {
        return false;
      }
    }
  }