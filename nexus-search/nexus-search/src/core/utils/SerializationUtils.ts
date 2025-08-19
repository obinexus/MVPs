import { TrieNode, IndexedDocument } from '@/core/types';

export class SerializationUtils {
  private static readonly SERIALIZATION_VERSION = 1;
  
  constructor(private compressionEnabled: boolean = false) {}
  
  /**
   * Memory-optimized trie serialization
   */
  static serializeTrie(node: TrieNode): unknown {
    return this.serializeNode(node);
  }
  
  /**
   * Helper method to serialize a single node
   */
  private static serializeNode(node: TrieNode): unknown {
    const serializedNode = {
      version: this.SERIALIZATION_VERSION,
      p: node.prefixCount,                      // prefixCount (shortened key)
      e: node.isEndOfWord ? 1 : 0,              // isEndOfWord as binary
      d: Array.from(node.documentRefs),         // documentRefs
      w: Number(node.getWeight().toFixed(3)),   // weight truncated to 3 decimals
      c: {}                                     // children (shortened key)
    };
    
    // Only include non-empty collections
    if (node.documentRefs.size === 0) {
      delete serializedNode.d;
    }
    
    // Only include non-zero values
    if (node.prefixCount === 0) {
      delete serializedNode.p;
    }
    
    if (node.getWeight() === 0) {
      delete serializedNode.w;
    }
    
    // Serialize children
    node.children.forEach((child, char) => {
      serializedNode.c[char] = this.serializeNode(child);
    });
    
    // Remove empty children object
    if (Object.keys(serializedNode.c).length === 0) {
      delete serializedNode.c;
    }
    
    return serializedNode;
  }
  
  /**
   * Type-safe deserialization of trie
   */
  static deserializeTrie(data: unknown): TrieNode {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid trie data format');
    }
    
    return this.deserializeNode(data);
  }
  
  /**
   * Helper method to deserialize a single node
   */
  private static deserializeNode(data: any): TrieNode {
    const node = new TrieNode();
    
    // Handle version compatibility
    const isLegacyFormat = !data.hasOwnProperty('version');
    
    if (isLegacyFormat) {
      // Legacy format support
      node.prefixCount = data.prefixCount || 0;
      node.isEndOfWord = data.isEndOfWord || false;
      node.documentRefs = new Set(data.documentRefs || []);
      
      // Handle weight restoration
      if (typeof data.weight === 'number' && data.weight > 0) {
        const times = Math.ceil(data.weight);
        for (let i = 0; i < times; i++) {
          node.incrementWeight(i === times - 1 ? data.weight % 1 || 1 : 1);
        }
      }
      
      // Handle children
      if (data.children && typeof data.children === 'object') {
        for (const char in data.children) {
          if (Object.prototype.hasOwnProperty.call(data.children, char)) {
            node.children.set(char, this.deserializeNode(data.children[char]));
          }
        }
      }
    } else {
      // New compact format
      node.prefixCount = data.p || 0;
      node.isEndOfWord = data.e === 1;
      
      if (data.d) {
        node.documentRefs = new Set(data.d);
      }
      
      if (typeof data.w === 'number' && data.w > 0) {
        node.incrementWeight(data.w);
      }
      
      // Handle children
      if (data.c && typeof data.c === 'object') {
        for (const char in data.c) {
          if (Object.prototype.hasOwnProperty.call(data.c, char)) {
            node.children.set(char, this.deserializeNode(data.c[char]));
          }
        }
      }
    }
    
    return node;
  }
  
  /**
   * Memory-efficient document serialization
   */
  static serializeDocuments(documents: Map<string, IndexedDocument>): unknown {
    const serializedDocuments = [];
    
    for (const [id, document] of documents.entries()) {
      serializedDocuments.push({
        id,
        fields: this.serializeFields(document.fields),
        md: document.metadata ? {
          im: document.metadata.indexed,
          lm: document.metadata.lastModified,
          ...this.serializeMetadata(document.metadata)
        } : undefined,
        v: document.versions ? document.versions.map(this.serializeVersion) : undefined
      });
    }
    
    return serializedDocuments;
  }
  
  /**
   * Helper for field serialization
   */
  private static serializeFields(fields: Record<string, any>): unknown {
    const serialized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      // Don't serialize undefined or functions
      if (value === undefined || typeof value === 'function') continue;
      
      // Handle special cases
      if (key === 'content' && typeof value === 'object') {
        serialized.ct = value;
      } else {
        serialized[key] = value;
      }
    }
    
    return serialized;
  }
  
  /**
   * Helper for metadata serialization
   */
  private static serializeMetadata(metadata: Record<string, any>): unknown {
    const result: Record<string, any> = {};
    
    // Only include non-standard metadata fields
    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'indexed' && key !== 'lastModified' && value !== undefined) {
        result[key] = value;
      }
    }
    
    return Object.keys(result).length ? result : undefined;
  }
  
  /**
   * Version serialization
   */
  private static serializeVersion(version: any): unknown {
    return {
      v: version.version,
      c: version.content,
      m: version.modified instanceof Date ? version.modified.getTime() : version.modified,
      a: version.author
    };
  }
  
  /**
   * Instance method to serialize with compression option
   */
  serializeWithCompression(data: any): string {
    const serialized = JSON.stringify(data);
    
    if (!this.compressionEnabled) {
      return serialized;
    }
    
    // Implement compression logic here if needed
    // This would typically use a compression library
    return serialized;
  }
}