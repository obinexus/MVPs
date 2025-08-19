export class PathUtils {
    private readonly rootDir: string;
    
    constructor(rootDir: string = '') {
      this.rootDir = rootDir;
    }
    
    /**
     * Static method to join path segments
     */
    static join(...paths: string[]): string {
      // Remove empty segments
      const segments = paths.filter(Boolean);
      
      if (segments.length === 0) {
        return '';
      }
      
      // Handle Windows vs Unix paths
      const isAbsolute = segments[0].startsWith('/') || /^[A-Z]:[\\\/]/.test(segments[0]);
      
      // Normalize separators and join
      const normalized = segments.map(segment => 
        segment.replace(/[\\\/]+/g, '/')
              .replace(/^\//, '')
              .replace(/\/$/, '')
      ).filter(Boolean);
      
      return (isAbsolute ? '/' : '') + normalized.join('/');
    }
    
    /**
     * Get file extension
     */
    static getExtension(path: string): string {
      const filename = path.split(/[\\\/]/).pop() || '';
      return filename.includes('.') ? filename.split('.').pop() || '' : '';
    }
    
    /**
     * Get filename without extension
     */
    static getBasename(path: string, includeExtension: boolean = true): string {
      const filename = path.split(/[\\\/]/).pop() || '';
      
      if (includeExtension) {
        return filename;
      }
      
      const lastDotIndex = filename.lastIndexOf('.');
      return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
    }
    
    /**
     * Get directory name
     */
    static getDirname(path: string): string {
      const lastSeparatorIndex = Math.max(
        path.lastIndexOf('/'),
        path.lastIndexOf('\\')
      );
      
      return lastSeparatorIndex !== -1 ? path.substring(0, lastSeparatorIndex) : '';
    }
    
    /**
     * Normalize path separators
     */
    static normalizePath(path: string): string {
      return path.replace(/[\\\/]+/g, '/');
    }
    
    /**
     * Check if path is absolute
     */
    static isAbsolute(path: string): boolean {
      return path.startsWith('/') || /^[A-Z]:[\\\/]/.test(path);
    }
    
    /**
     * Get relative path
     */
    static relative(from: string, to: string): string {
      const fromParts = this.normalizePath(from).split('/').filter(Boolean);
      const toParts = this.normalizePath(to).split('/').filter(Boolean);
      
      let commonParts = 0;
      while (commonParts < fromParts.length && 
             commonParts < toParts.length && 
             fromParts[commonParts] === toParts[commonParts]) {
        commonParts++;
      }
      
      const upCount = fromParts.length - commonParts;
      const upPath = Array(upCount).fill('..').join('/');
      const downPath = toParts.slice(commonParts).join('/');
      
      if (!upPath && !downPath) {
        return '.';
      }
      
      if (!upPath) {
        return downPath;
      }
      
      if (!downPath) {
        return upPath;
      }
      
      return upPath + '/' + downPath;
    }
    
    /**
     * Instance method to resolve path relative to root directory
     */
    resolve(...paths: string[]): string {
      if (paths.length === 0) {
        return this.rootDir;
      }
      
      // If first path is absolute, ignore rootDir
      if (PathUtils.isAbsolute(paths[0])) {
        return PathUtils.join(...paths);
      }
      
      return PathUtils.join(this.rootDir, ...paths);
    }
  }