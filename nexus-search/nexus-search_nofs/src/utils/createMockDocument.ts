import { DocumentBase, DocumentContent, DocumentMetadata, DocumentRelation, DocumentVersion, IndexedDocument } from '@/types';

/**
 * Creates a mock IndexedDocument for testing purposes
 * @param id Document ID
 * @param customContent Optional custom content
 * @param customMetadata Optional custom metadata
 */
export const createMockDocument = (
  id: string,
  customContent?: DocumentContent,
  customMetadata?: DocumentMetadata
): IndexedDocument => {
  const defaultContent: DocumentContent = {
    text: `Content for ${id}`
  };
  
  const content = customContent || defaultContent;
  
  const now = Date.now();
  const metadata: DocumentMetadata = {
    indexed: now,
    lastModified: now,
    ...(customMetadata || {})
  };
  
  return {
    id,
    fields: {
      title: `Test ${id}`,
      content: content,
      author: 'Test Author',
      tags: ['test'],
      version: '1.0'
    },
    metadata,
    versions: [],
    relations: [],
    content, // Important: include the content property directly
    title: `Test ${id}`,
    author: 'Test Author',
    tags: ['test'],
    version: '1.0',
    document: function(): IndexedDocument { return this; },
    base: function(): DocumentBase { 
      return {
        id: this.id,
        title: this.title,
        author: this.author,
        version: this.version,
        metadata: this.metadata,
        versions: this.versions,
        relations: this.relations,
        tags: this.tags
      };
    }
  };
};

/**
 * Creates multiple mock documents
 * @param count Number of documents to create
 * @param prefix ID prefix
 */
export const createMockDocuments = (count: number, prefix = 'doc'): IndexedDocument[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockDocument(`${prefix}${i + 1}`)
  );
};

export function createIndexedDocument(
  id: string,
  fields: {
    title: string;
    content: DocumentContent;
    author: string;
    tags: string[];
    version: string;
  },
  metadata?: DocumentMetadata,
  versions: DocumentVersion[] = [],
  relations: DocumentRelation[] = []
): IndexedDocument {
  return {
    id,
    fields: {
      title: fields.title,
      content: fields.content,
      author: fields.author,
      tags: fields.tags,
      version: fields.version
    },
    content: fields.content,
    metadata: metadata || {
      indexed: Date.now(),
      lastModified: Date.now()
    },
    versions,
    relations,
    title: fields.title,
    author: fields.author,
    tags: fields.tags,
    version: fields.version,
    document: function(): IndexedDocument { return this; },
    base: function(): DocumentBase { 
      return {
        id: this.id,
        title: this.title,
        author: this.author,
        tags: this.tags,
        version: this.version,
        metadata: this.metadata,
        versions: this.versions,
        relations: this.relations
      };
    }
  };
}

export function createTestDocument(id: string, title: string, contentText: string): IndexedDocument {
  return createIndexedDocument(
    id,
    {
      title,
      content: { text: contentText },
      author: "Test Author",
      tags: ["test"],
      version: "1.0"
    },
    {
      lastModified: Date.now(),
      indexed: Date.now()
    }
  );
}