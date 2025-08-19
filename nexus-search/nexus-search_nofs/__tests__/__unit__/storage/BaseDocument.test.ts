import { BaseDocument } from "@/storage";
import { IndexableFields, DocumentMetadata, DocumentVersion, DocumentRelation, DocumentLink, DocumentRank, DocumentContent } from "@/types";

// Mock TextDecoder for fromFileData tests
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn().mockReturnValue('decoded file content')
}));

describe('BaseDocument', () => {
  const testId = 'test-doc-1';
  const testFields: Partial<IndexableFields> = {
    title: 'Test Document',
    content: { text: 'This is test content' },
    author: 'Test Author',
    tags: ['test', 'document'],
    version: '1.0',
    modified: new Date().toISOString()
  };
  const testMetadata: Partial<DocumentMetadata> = {
    indexed: 1612345678000,
    lastModified: 1612345678000,
    status: 'published'
  };
  const testVersions: DocumentVersion[] = [
    {
      version: 1,
      content: { text: 'Old content' },
      modified: new Date('2023-01-01'),
      author: 'Test Author'
    }
  ];
  const testRelations: Array<Partial<DocumentRelation>> = [
    {
      targetId: 'test-doc-2',
      type: 'reference'
    }
  ];
  const testLinks: DocumentLink[] = [
    {
      fromId: (fromId: string) => fromId === 'test-doc-1' ? 'test-doc-2' : '',
      toId: (toId: string) => toId === 'test-doc-2' ? 'test-doc-1' : '',
      weight: 1.5,
      url: 'https://example.com',
      source: 'source',
      target: 'target',
      type: 'reference'
    }
  ];
  const testRanks: DocumentRank[] = [
    {
      id: 'test-doc-1',
      rank: 0.8,
      incomingLinks: 5,
      outgoingLinks: 3,
      content: { popularity: 'high' },
      metadata: { lastModified: Date.now(), lastCalculated: Date.now() }
    }
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with minimal properties', () => {
      const doc = new BaseDocument({});
      
      expect(doc.id).toMatch(/^doc-\d+-[a-z0-9]+$/);
      expect(doc.title).toBe('');
      expect(doc.author).toBe('');
      expect(doc.tags).toEqual([]);
      expect(doc.version).toBe('1.0');
      expect(doc.fields).toBeDefined();
      expect(doc.metadata).toBeDefined();
      expect(doc.versions).toEqual([]);
      expect(doc.relations).toEqual([]);
    });

    it('should initialize with id from fields', () => {
      const doc = new BaseDocument({
        id: testId,
        fields: testFields,
        metadata: testMetadata,
        versions: testVersions,
        relations: testRelations,
        links: testLinks,
        ranks: testRanks
      });
      
      expect(doc.id).toBe(testId);
      expect(doc.title).toBe(testFields.title);
      expect(doc.author).toBe(testFields.author);
      expect(doc.tags).toEqual(testFields.tags);
      expect(doc.version).toBe(testFields.version);
      
      expect(doc.fields.title).toBe(testFields.title);
      expect(doc.fields.content).toEqual(testFields.content);
      
      expect(doc.metadata).toMatchObject(testMetadata);
      expect(doc.versions).toEqual(testVersions);
      expect(doc.relations[0].sourceId).toBe(testId);
      expect(doc.relations[0].targetId).toBe(testRelations[0].targetId);
      
      expect(doc.links).toBeDefined();
      expect(doc.links?.length).toBe(1);
      
      expect(doc.ranks).toBeDefined();
      expect(doc.ranks?.length).toBe(1);
    });

    it('should use direct properties when fields are not provided', () => {
      const doc = new BaseDocument({
        id: testId,
        title: 'Direct Title',
        author: 'Direct Author',
        tags: ['direct', 'tags'],
        version: '2.0'
      });
      
      expect(doc.title).toBe('Direct Title');
      expect(doc.author).toBe('Direct Author');
      expect(doc.tags).toEqual(['direct', 'tags']);
      expect(doc.version).toBe('2.0');
      
      expect(doc.fields.title).toBe('Direct Title');
      expect(doc.fields.author).toBe('Direct Author');
      expect(doc.fields.tags).toEqual(['direct', 'tags']);
      expect(doc.fields.version).toBe('2.0');
    });

    it('should normalize string content to object', () => {
      const doc = new BaseDocument({
        fields: {
          content: 'Plain string content' as unknown as DocumentContent,
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      expect(doc.fields.content).toEqual({ text: 'Plain string content' });
    });

    it('should normalize metadata with timestamps', () => {
      const doc = new BaseDocument({
        metadata: {
          status: 'draft',
          lastModified: 0
        }
      });
      
      expect(doc.metadata?.indexed).toBe(new Date('2023-01-01').getTime());
      expect(doc.metadata?.lastModified).toBe(new Date('2023-01-01').getTime());
      expect(doc.metadata?.status).toBe('draft');
    });

    it('should normalize relations', () => {
      const doc = new BaseDocument({
        id: testId,
        relations: [
          {
            targetId: 'target1', type: 'parent',
            sourceId: ""
          },
          { targetId: 'target2', type: 'CHILD' },
          { targetId: 'target3', type: 'invalid' },
          {
            targetId: 'target4',
            sourceId: "",
            type: "reference"
          } // No type
        ]
      });
      
      expect(doc.relations.length).toBe(4);
      expect(doc.relations[0]).toEqual({
        sourceId: testId,
        targetId: 'target1',
        type: 'parent',
        metadata: undefined
      });
      expect(doc.relations[1].type).toBe('child');
      expect(doc.relations[2].type).toBe('reference'); // Invalid normalized to reference
      expect(doc.relations[3].type).toBe('reference'); // Default is reference
    });

    it('should normalize links', () => {
      const doc = new BaseDocument({
        id: testId,
        links: [
          {
            toId: 'link1',
            fromId: (id: string) => '',
            toId: (id: string) => id,
            weight: 0,
            url: "",
            source: "",
            target: "",
            type: ""
          },
          {
            fromId: (id: string) => 'other',
            toId: (id: string) => 'link2',
            weight: 2,
            url: 'test',
            type: 'custom',
            source: "",
            target: ""
          }
        ]
      });
      
      expect(doc.links?.length).toBe(2);
      // Since fromId and toId are now functions, we need to test differently
      expect(doc.links?.length).toBe(2);
      expect(doc.links?.[0].url).toBe('');
      expect(doc.links?.[0].weight).toBe(1); // Default weight
      expect(doc.links?.[0].source).toBe('');
      expect(doc.links?.[0].target).toBe('');
      expect(doc.links?.[0].type).toBe('default');
      // Test the second link's properties
      expect(doc.links?.[1].weight).toBe(2);
      expect(doc.links?.[1].type).toBe('custom');
      expect(typeof doc.links?.[1].fromId).toBe('function');
      expect(typeof doc.links?.[1].toId).toBe('function');
    });

    it('should normalize ranks', () => {
      const doc = new BaseDocument({
        id: testId,
        ranks: [
          {
            rank: 0.5,
            id: "",
            incomingLinks: 0,
            outgoingLinks: 0,
            content: undefined
          },
          {
            id: 'custom-id', rank: 0.8, incomingLinks: 5, outgoingLinks: 2,
            content: undefined
          }
        ]
      });
      
      expect(doc.ranks?.length).toBe(2);
      expect(doc.ranks?.[0]).toEqual({
        id: testId, // Default to current id
        rank: 0.5,
        incomingLinks: 0,
        outgoingLinks: 0,
        content: {},
        metadata: undefined
      });
      expect(doc.ranks?.[1].id).toBe('custom-id');
      expect(doc.ranks?.[1].incomingLinks).toBe(5);
    });
  });

  describe('fromFileData', () => {
    it('should create document from string file content', () => {
      const doc = BaseDocument.fromFileData(
        'File content as string',
        'text/plain',
        { title: 'Test File' }
      );
      
      expect(doc).toBeInstanceOf(BaseDocument);
      expect(doc.id).toMatch(/^file-\d+-[a-z0-9]+$/);
      expect(doc.fields.title).toBe('Test File');
      expect(doc.fields.content).toEqual({
        text: 'File content as string',
        mimetype: 'text/plain'
      });
      expect(doc.metadata?.fileType).toBe('text/plain');
      expect(doc.metadata?.fileSize).toBe(20); // Length of 'File content as string'
    });

    it('should create document from ArrayBuffer', () => {
      const buffer = new ArrayBuffer(10);
      const doc = BaseDocument.fromFileData(
        buffer,
        'application/octet-stream',
        { author: 'Test Author' }
      );
      
      expect(doc).toBeInstanceOf(BaseDocument);
      expect(doc.fields.author).toBe('Test Author');
      expect(doc.fields.title).toMatch(/^File file-\d+-[a-z0-9]+$/);
      expect(doc.fields.content).toEqual({
        text: 'decoded file content', // From mocked TextDecoder
        mimetype: 'application/octet-stream'
      });
      expect(doc.metadata?.fileSize).toBe(0); // From empty ArrayBuffer
    });

    it('should use default values when metadata is not provided', () => {
      const doc = BaseDocument.fromFileData(
        'content',
        'text/plain'
      );
      
      expect(doc.fields.author).toBe('');
      expect(doc.fields.tags).toEqual([]);
      expect(doc.fields.version).toBe('1.0');
      expect(doc.metadata?.lastModified).toBe(new Date('2023-01-01').getTime());
    });
  });

  describe('fromBlob', () => {
    it('should create document from Blob', async () => {
      // Mock FileReader
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        result: 'Blob content',
        readAsArrayBuffer: jest.fn().mockImplementation(function(this: any) {
          const self = this;
          setTimeout(() => self.onload(), 10);
        })
      };
      
      // @ts-ignore
      global.FileReader = jest.fn().mockImplementation(() => mockFileReader);
      
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const doc = await BaseDocument.fromBlob(blob, { title: 'Blob Test' });
      
      expect(doc).toBeInstanceOf(BaseDocument);
      expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(blob);
      expect(doc.fields.title).toBe('Blob Test');
      expect(doc.fields.content).toHaveProperty('mimetype', 'text/plain');
    });

    it('should reject on FileReader error', async () => {
      // Mock FileReader with error
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsArrayBuffer: jest.fn().mockImplementation(function(this: unknown) {
          const self = this;
          setTimeout(() => self.onerror(), 10);
        })
      };
      
      // @ts-ignore
      global.FileReader = jest.fn().mockImplementation(() => mockFileReader);
      
      const blob = new Blob(['test'], { type: 'text/plain' });
      await expect(BaseDocument.fromBlob(blob)).rejects.toThrow('Failed to read blob');
    });
  });

  describe('base()', () => {
    it('should return base document properties', () => {
      const doc = new BaseDocument({
        id: testId,
        fields: testFields,
        metadata: testMetadata,
        versions: testVersions,
        relations: testRelations
      });
      
      const base = doc.base();
      
      expect(base).toEqual({
        id: testId,
        title: testFields.title,
        author: testFields.author,
        version: testFields.version,
        metadata: doc.metadata,
        versions: testVersions,
        relations: doc.relations,
        tags: testFields.tags
      });
    });
  });

  describe('document()', () => {
    it('should return itself', () => {
      const doc = new BaseDocument({ id: testId });
      expect(doc.document()).toBe(doc);
    });
  });

  describe('clone()', () => {
    it('should create a deep copy', () => {
      const original = new BaseDocument({
        id: testId,
        fields: testFields,
        metadata: testMetadata,
        versions: testVersions,
        relations: testRelations,
        links: testLinks,
        ranks: testRanks
      });
      
      const cloned = original.clone();
      
      // Should not be the same object
      expect(cloned).not.toBe(original);
      
      // But should have same values
      expect(cloned.id).toBe(original.id);
      expect(cloned.fields).toEqual(original.fields);
      expect(cloned.metadata).toEqual(original.metadata);
      expect(cloned.versions).toEqual(original.versions);
      expect(cloned.relations).toEqual(original.relations);
      expect(cloned.links).toEqual(original.links);
      expect(cloned.ranks).toEqual(original.ranks);
      
      // Modifying cloned object should not affect original
      (cloned.fields.title as string) = 'Modified Title';
      expect(original.fields.title).toBe('Test Document');
    });
  });

  describe('toObject()', () => {
    it('should convert to a plain object representation', () => {
      const doc = new BaseDocument({
        id: testId,
        fields: testFields,
        metadata: testMetadata,
        versions: testVersions,
        relations: testRelations
      });
      
      const obj = doc.toObject();
      
      expect(obj.id).toBe(testId);
      expect(obj.fields).toEqual(doc.fields);
      expect(obj.metadata).toEqual(doc.metadata);
      expect(typeof obj.document).toBe('function');
      expect(typeof obj.base).toBe('function');
      
      // Should be a deep copy
      obj.fields.title = 'Changed title';
      expect(doc.fields.title).not.toBe('Changed title');
    });

    it('should update lastModified in metadata', () => {
      const now = new Date('2023-01-01').getTime();
      const oldMetadata = { lastModified: now - 1000 };
      const doc = new BaseDocument({ 
        id: testId,
        metadata: oldMetadata
      });
      
      const obj = doc.toObject();
      expect(obj.metadata?.lastModified).toBe(now);
    });
  });

  describe('update()', () => {
    it('should update fields', () => {
      const doc = new BaseDocument({
        id: testId,
        fields: testFields
      });
      
      const updated = doc.update({
        fields: {
          title: 'Updated Title',
          author: 'Updated Author',
          content: {},
          tags: [],
          version: ""
        }
      });
      
      expect(updated.id).toBe(testId); // ID stays the same
      expect(updated.fields.title).toBe('Updated Title');
      expect(updated.fields.author).toBe('Updated Author');
      expect(updated.fields.content).toEqual(testFields.content); // Unchanged
      expect(updated.fields.modified).not.toBe(testFields.modified); // Should be updated
    });

    it('should create version when content changes', () => {
      const doc = new BaseDocument({
        id: testId,
        fields: testFields,
        versions: []
      });
      
      const updated = doc.update({
        fields: {
          content: { text: 'New content' },
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      expect(updated.versions.length).toBe(1);
      expect(updated.versions[0]).toEqual({
        version: 1, // From original version '1.0'
        content: testFields.content,
        modified: expect.any(Date),
        author: testFields.author
      });
      
      expect(updated.fields.version).toBe('2.0'); // Incremented
    });

    it('should not create version when content is unchanged', () => {
      const doc = new BaseDocument({
        id: testId,
        fields: { ...testFields },
        versions: []
      });
      
      // Same content structure
      const updated = doc.update({
        fields: {
          content: { text: 'This is test content' },
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      expect(updated.versions.length).toBe(0);
      expect(updated.fields.version).toBe('1.0'); // Unchanged
    });

    it('should update metadata', () => {
      const doc = new BaseDocument({
        id: testId,
        metadata: { lastModified: Date.now() - 1000 }
      });
      
      const updated = doc.update({});
      
      expect(updated.metadata?.lastModified).toBe(new Date('2023-01-01').getTime());
    });

    it('should handle updates to links and ranks', () => {
      const doc = new BaseDocument({
        id: testId,
        links: [{ 
          fromId: (id: string) => testId,
          toId: (id: string) => 'old-link',
          weight: 1,
          url: '',
          source: '',
          target: '',
          type: 'default'
        }]
      });
      
      const newLinks = [{ 
        fromId: (id: string) => testId,
        toId: (id: string) => 'new-link',
        weight: 1,
        url: '',
        source: '',
        target: '',
        type: 'default'
      }];
      const newRanks = [{ 
        id: testId, 
        rank: 0.9,
        incomingLinks: 0,
        outgoingLinks: 0,
        content: {},
        metadata: { lastModified: Date.now() }
      }];
      
      const updated = doc.update({
        links: newLinks,
        ranks: newRanks
      });
      
      expect(updated.links).toEqual(newLinks);
      expect(updated.ranks).toEqual(newRanks);
    });

    it('should handle update with content property', () => {
      const doc = new BaseDocument({
        id: testId,
        content: { key1: 'value1' }
      });
      
      const updated = doc.update({
        content: { key2: 'value2' }
      } as Partial<BaseDocument>);
      
      expect(updated.content).toEqual({ key2: 'value2' });
    });
  });

  describe('normalizeContent', () => {
    it('should handle null content', () => {
      const doc = new BaseDocument({
        fields: {
          content: null as unknown as DocumentContent,
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      expect(doc.fields.content).toEqual({ text: '' });
    });

    it('should handle string content', () => {
      const doc = new BaseDocument({
        fields: {
          content: 'Simple string' as unknown as DocumentContent,
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      expect(doc.fields.content).toEqual({ text: 'Simple string' });
    });

    it('should handle primitive content', () => {
      const doc = new BaseDocument({
        fields: {
          content: 42 as unknown as DocumentContent,
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      expect(doc.fields.content).toEqual({ text: '42' });
    });

    it('should handle complex object content', () => {
      const complexContent = {
        text: 'Main text',
        details: {
          section1: 'Content 1',
          section2: 'Content 2',
          metadata: {
            author: 'Nested Author',
            tags: ['tag1', 'tag2'],
            count: 5,
            flag: true,
            nullValue: null
          }
        },
        list: [1, 'two', false, null]
      };
      
      const doc = new BaseDocument({
        fields: {
          content: complexContent as unknown as DocumentContent,
          title: "",
          author: "",
          tags: [],
          version: ""
        }
      });
      
      // Verify structure is preserved
      expect(doc.fields.content).toHaveProperty('text', 'Main text');
      expect(doc.fields.content).toHaveProperty('details.section1', 'Content 1');
      expect(doc.fields.content).toHaveProperty('details.metadata.author', 'Nested Author');
      expect(doc.fields.content).toHaveProperty('details.metadata.tags', ['tag1', 'tag2']);
      expect(doc.fields.content).toHaveProperty('details.metadata.count', 5);
      expect(doc.fields.content).toHaveProperty('details.metadata.flag', true);
      expect(doc.fields.content).toHaveProperty('details.metadata.nullValue', null);
      expect(doc.fields.content).toHaveProperty('list', [1, 'two', false, null]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty or missing values', () => {
      const doc = new BaseDocument({});
      
      expect(doc.fields).toBeDefined();
      expect(doc.metadata).toBeDefined();
      expect(doc.versions).toEqual([]);
      expect(doc.relations).toEqual([]);
      expect(doc.links).toBeUndefined();
      expect(doc.ranks).toBeUndefined();
    });
    
    it('should handle non-array tags from fields', () => {
      const doc = new BaseDocument({
        fields: {
          tags: 'not-an-array' as unknown as string[],
          content: {},
          title: "",
          author: "",
          version: ""
        }
      });
      
      expect(doc.tags).toEqual([]);
    });
    
    it('should handle non-array versions and relations', () => {
      const doc = new BaseDocument({
        versions: 'not-an-array' as unknown as DocumentVersion[],
        relations: 123 as unknown as Array<Partial<DocumentRelation>>
      });
      
      expect(doc.versions).toEqual([]);
      expect(doc.relations).toEqual([]);
    });
    
    it('should handle relations with missing targetId', () => {
      const doc = new BaseDocument({
        id: testId,
        relations: [
          {
            type: 'parent',
            sourceId: "",
            targetId: ""
          } // Missing targetId
        ]
      });
      
      expect(doc.relations[0]).toEqual({
        sourceId: testId,
        targetId: '',
        type: 'parent',
        metadata: undefined
      });
    });
  });
});