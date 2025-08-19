import { validateSearchOptions, validateIndexConfig, validateDocument } from '@/utils/ValidationUtils';
import { SearchOptions, IndexConfig, SearchableDocument } from '@/types';

describe('ValidationUtils', () => {
  describe('validateSearchOptions', () => {
    test('should validate valid search options', () => {
      const options: SearchOptions = {
        fuzzy: true,
        maxResults: 10,
        threshold: 0.5,
        fields: ['title', 'content'],
        boost: { title: 2.0 }
      };
      
      expect(() => validateSearchOptions(options)).not.toThrow();
    });
    
    test('should throw error for invalid maxResults', () => {
      const options: SearchOptions = {
        maxResults: 0
      };
      
      expect(() => validateSearchOptions(options)).toThrow('maxResults must be greater than 0');
    });
    
    test('should throw error for invalid threshold', () => {
      const invalidOptions1: SearchOptions = {
        threshold: -0.1
      };
      
      const invalidOptions2: SearchOptions = {
        threshold: 1.5
      };
      
      expect(() => validateSearchOptions(invalidOptions1)).toThrow('threshold must be between 0 and 1');
      expect(() => validateSearchOptions(invalidOptions2)).toThrow('threshold must be between 0 and 1');
    });
    
    test('should throw error for invalid fields', () => {
      const options: SearchOptions = {
        fields: 'title' as unknown as string[]
      };
      
      expect(() => validateSearchOptions(options)).toThrow('fields must be an array');
    });
    
    test('should accept undefined options', () => {
      const options: SearchOptions = {
        // All optional fields omitted
      };
      
      expect(() => validateSearchOptions(options)).not.toThrow();
    });
  });
  
  describe('validateIndexConfig', () => {
    test('should validate valid index config', () => {
      const config: IndexConfig = {
        name: 'test-index',
        version: 1,
        fields: ['title', 'content', 'tags']
      };
      
      expect(() => validateIndexConfig(config)).not.toThrow();
    });
    
    test('should throw error for missing name', () => {
      const config: IndexConfig = {
        name: '',
        version: 1,
        fields: ['title']
      };
      
      expect(() => validateIndexConfig(config)).toThrow('Index name is required');
    });
    
    test('should throw error for invalid version', () => {
      const config1: IndexConfig = {
        name: 'test',
        version: 0,
        fields: ['title']
      };
      
      const config2: IndexConfig = {
        name: 'test',
        version: 'v1' as unknown as number,
        fields: ['title']
      };
      
      expect(() => validateIndexConfig(config1)).toThrow('Valid version number is required');
      expect(() => validateIndexConfig(config2)).toThrow('Valid version number is required');
    });
    
    test('should throw error for missing fields', () => {
      const config1: IndexConfig = {
        name: 'test',
        version: 1,
        fields: []
      };
      
      const config2: IndexConfig = {
        name: 'test',
        version: 1,
        fields: {} as unknown as string[]
      };
      
      expect(() => validateIndexConfig(config1)).toThrow('At least one field must be specified');
      expect(() => validateIndexConfig(config2)).toThrow('At least one field must be specified');
    });
  });
  
  describe('validateDocument', () => {
    test('should validate document with all required fields', () => {
      const document: SearchableDocument = {
        id: 'doc1',
        version: '1.0',
        content: {
          title: 'Test Document',
          body: 'This is a test document',
          tags: ['test']
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      expect(validateDocument(document, ['title', 'body'])).toBe(true);
    });
    
    test('should return false for document with missing required fields', () => {
      const document: SearchableDocument = {
        id: 'doc1',
        version: '1.0',
        content: {
          title: 'Missing Body Document'
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      expect(validateDocument(document, ['title', 'body'])).toBe(false);
    });
    
    test('should validate document with nested fields', () => {
      const document: SearchableDocument = {
        id: 'doc1',
        version: '1.0',
        content: {
          metadata: {
            author: 'Test Author'
          },
          title: 'Test Document'
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      expect(validateDocument(document, ['metadata.author', 'title'])).toBe(true);
      expect(validateDocument(document, ['metadata.publishDate', 'title'])).toBe(false);
    });
    
    test('should handle edge cases', () => {
      // Empty document
      const emptyDoc: SearchableDocument = {
        id: 'empty',
        version: '1.0',
        content: {},
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      expect(validateDocument(emptyDoc, ['title'])).toBe(false);
      
      // Empty fields array
      expect(validateDocument(emptyDoc, [])).toBe(true);
      
      // Null values in content
      const nullValueDoc: SearchableDocument = {
        id: 'null-values',
        version: '1.0',
        content: {
          title: null as unknown as string,
          body: 'Content'
        },
        metadata: {
          lastModified: Date.now(),
          indexed: Date.now()
        }
      };
      
      expect(validateDocument(nullValueDoc, ['title', 'body'])).toBe(true);
    });
  });
});