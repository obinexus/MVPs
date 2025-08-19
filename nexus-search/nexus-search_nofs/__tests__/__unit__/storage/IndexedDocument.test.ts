import { IndexedDocument } from "@/storage";
import { BaseFields, DocumentMetadata, DocumentVersion, DocumentRelation, DocumentContent, IndexedDocumentData } from "@/types";

describe('IndexedDocument', () => {
  // Test data setup
  const testId = 'test-doc-1';
  const testFields: BaseFields = {
    title: 'Test Document',
    content: { text: 'This is test content' },
    author: 'Test Author',
    tags: ['test', 'document'],
    version: '1.0'
  };
  const testMetadata: DocumentMetadata = {
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
  const testRelations: DocumentRelation[] = [
    {
      sourceId: 'test-doc-1',
      targetId: 'test-doc-2',
      type: 'reference'
    }
  ];

  describe('constructor', () => {
    it('should initialize with required properties', () => {
      const doc = new IndexedDocument(testId, testFields);
      
      expect(doc.id).toBe(testId);
      expect(doc.fields).toEqual(expect.objectContaining(testFields));
      expect(doc.metadata).toBeDefined();
      expect(doc.versions).toEqual([]);
      expect(doc.relations).toEqual([]);
      expect(doc.content).toEqual(testFields.content);
    });

    it('should initialize with all properties', () => {
      const doc = new IndexedDocument(
        testId,
        testFields,
        testMetadata,
        testVersions,
        testRelations
      );
      
      expect(doc.id).toBe(testId);
      expect(doc.fields).toEqual(expect.objectContaining(testFields));
      expect(doc.metadata).toEqual(expect.objectContaining(testMetadata));
      expect(doc.versions).toEqual(testVersions);
      expect(doc.relations).toEqual(testRelations);
      expect(doc.content).toEqual(testFields.content);
    });

    it('should normalize fields with missing values', () => {
      // Create a minimal fields object with just the required content
      const minimalFields: BaseFields = {
        title: '',
        content: { text: 'Content only' },
        author: '',
        tags: [],
        version: '1.0'
      };

      const doc = new IndexedDocument('minimal-doc', minimalFields);
      
      expect(doc.fields.title).toBe('');
      expect(doc.fields.author).toBe('');
      expect(doc.fields.tags).toEqual([]);
      expect(doc.fields.version).toBe('1.0');
      expect(doc.fields.content).toEqual({ text: 'Content only' });
    });

    it('should normalize string content to object', () => {
      const fieldsWithStringContent: BaseFields = {
        ...testFields,
        content: 'String content' as unknown as DocumentContent
      };

      const doc = new IndexedDocument('string-content-doc', fieldsWithStringContent);
      
      expect(doc.content).toEqual({ text: 'String content' });
    });

    it('should normalize metadata with timestamps', () => {
      const partialMetadata: DocumentMetadata = {
        status: 'draft' as unknown,
        lastModified: Date.now()
      };

      const doc = new IndexedDocument('metadata-doc', testFields, partialMetadata);
      
      expect(doc.metadata).toMatchObject({
        status: 'draft',
        indexed: expect.any(Number),
        lastModified: expect.any(Number)
      });
    });
  });

  describe('document()', () => {
    it('should return itself', () => {
      const doc = new IndexedDocument(testId, testFields);
      
      expect(doc.document()).toBe(doc);
    });
  });

  describe('base()', () => {
    it('should return base document properties', () => {
      const doc = new IndexedDocument(
        testId,
        testFields,
        testMetadata,
        testVersions,
        testRelations
      );
      
      const base = doc.base();
      
      expect(base).toEqual({
        id: testId,
        title: testFields.title,
        author: testFields.author,
        tags: testFields.tags,
        version: testFields.version,
        versions: testVersions,
        relations: testRelations
      });
    });
  });

  describe('clone()', () => {
    it('should create a deep copy', () => {
      const original = new IndexedDocument(
        testId,
        testFields,
        testMetadata,
        testVersions,
        testRelations
      );
      
      const cloned = original.clone();
      
      // Should not be the same object
      expect(cloned).not.toBe(original);
      
      // But should have same values
      expect(cloned.id).toBe(original.id);
      expect(cloned.fields).toEqual(original.fields);
      expect(cloned.metadata).toEqual(original.metadata);
      expect(cloned.versions).toEqual(original.versions);
      expect(cloned.relations).toEqual(original.relations);
      
      // Modifying cloned object should not affect original
      cloned.fields.title = 'Modified Title';
      expect(original.fields.title).toBe('Test Document');
    });
  });

  describe('update()', () => {
    it('should update fields', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      const updates: Partial<IndexedDocumentData> = {
        fields: {
          title: 'Updated Title',
          content: { text: 'Updated content' },
          author: 'Updated Author',
          tags: ['updated'],
          version: '1.0'
        }
      };
      
      const updated = doc.update(updates);
      
      expect(updated.fields.title).toBe('Updated Title');
      expect(updated.fields.content).toEqual({ text: 'Updated content' });
      
      // Original fields should not be affected
      expect(doc.fields.title).toBe('Test Document');
    });

    it('should update metadata', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      const updatedMetadata: DocumentMetadata = {
        status: 'archived' as unknown,
        lastModified: Date.now()
      };
      
      const updates: Partial<IndexedDocumentData> = {
        metadata: updatedMetadata
      };
      
      const updated = doc.update(updates);
      
      expect(updated.metadata?.status).toBe('archived');
      expect(updated.metadata?.lastModified).not.toBe(testMetadata.lastModified);
      
      // Original metadata should not be affected
      expect(doc.metadata?.status).toBe('published');
    });

    it('should update versions and relations', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      const newVersions: DocumentVersion[] = [
        {
          version: 1,
          content: { text: 'New version content' },
          modified: new Date(),
          author: 'New Author'
        }
      ];
      const newRelations: DocumentRelation[] = [
        {
          sourceId: testId,
          targetId: 'new-target',
          type: 'parent'
        }
      ];
      
      const updates: Partial<IndexedDocumentData> = {
        versions: newVersions,
        relations: newRelations
      };
      
      const updated = doc.update(updates);
      
      expect(updated.versions).toEqual(newVersions);
      expect(updated.relations).toEqual(newRelations);
    });

    it('should ignore null field values', () => {
      const doc = new IndexedDocument(testId, testFields);
      const updates: Partial<IndexedDocumentData> = {
        fields: {
          title: 'New Title',
          author: 'New Author',
          tags: ['new'],
          version: '1.0',
          content: { text: 'New content' }
        }
      };
      
      const updated = doc.update(updates);
      
      expect(updated.fields.title).toBe('New Title');
      expect(updated.fields.author).toBe('New Author');
    });
  });

  describe('getField and setField', () => {
    it('should get field value', () => {
      const doc = new IndexedDocument(testId, testFields);
      
      expect(doc.getField('title')).toBe('Test Document');
      expect(doc.getField('author')).toBe('Test Author');
      expect(doc.getField('tags')).toEqual(['test', 'document']);
      expect(doc.getField('content')).toEqual({ text: 'This is test content' });
    });

    it('should set field value and update metadata', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      const originalModified = doc.metadata?.lastModified;
      
      // Wait to ensure timestamp difference
      jest.advanceTimersByTime(1000);
      
      doc.setField('title', 'New Title');
      
      expect(doc.fields.title).toBe('New Title');
      expect(doc.metadata?.lastModified).toBeGreaterThan(originalModified!);
    });

    it('should update content when setting content field', () => {
      const doc = new IndexedDocument(testId, testFields);
      const newContent = { text: 'New content', details: 'Additional info' } as DocumentContent;
      
      doc.setField('content', newContent);
      
      expect(doc.fields.content).toEqual(newContent);
      expect(doc.content).toEqual(newContent); // content property should be updated too
    });
  });

  describe('addVersion', () => {
    it('should add a new version and increment version number', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      
      doc.addVersion({
        content: { text: 'New version content' },
        modified: new Date('2023-02-01'),
        author: 'New Author'
      });
      
      expect(doc.versions.length).toBe(1);
      expect(doc.versions[0]).toEqual({
        version: 1,
        content: { text: 'New version content' },
        modified: expect.any(Date),
        author: 'New Author'
      });
      expect(doc.fields.version).toBe('1');
    });

    it('should increment version properly when previous versions exist', () => {
      const doc = new IndexedDocument(
        testId,
        testFields,
        testMetadata,
        testVersions
      );
      
      doc.addVersion({
        content: { text: 'Newer content' },
        modified: new Date('2023-03-01'),
        author: 'Another Author'
      });
      
      expect(doc.versions.length).toBe(2);
      expect(doc.versions[1].version).toBe(2);
      expect(doc.fields.version).toBe('2');
    });

    it('should update lastModified timestamp', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      const originalModified = doc.metadata?.lastModified;
      
      jest.advanceTimersByTime(1000);
      
      doc.addVersion({
        content: { text: 'New content' },
        modified: new Date(),
        author: 'Author'
      });
      
      expect(doc.metadata?.lastModified).toBeGreaterThan(originalModified!);
    });
  });

  describe('addRelation', () => {
    it('should add a relation', () => {
      const doc = new IndexedDocument(testId, testFields);
      const relation: DocumentRelation = {
        sourceId: testId,
        targetId: 'target-doc',
        type: 'related'
      };
      
      doc.addRelation(relation);
      
      expect(doc.relations.length).toBe(1);
      expect(doc.relations[0]).toEqual(relation);
    });

    it('should update lastModified timestamp', () => {
      const doc = new IndexedDocument(testId, testFields, testMetadata);
      const originalModified = doc.metadata?.lastModified;
      
      jest.advanceTimersByTime(1000);
      
      doc.addRelation({
        sourceId: testId,
        targetId: 'target-doc',
        type: 'child'
      });
      
      expect(doc.metadata?.lastModified).toBeGreaterThan(originalModified!);
    });
  });

  describe('toObject', () => {
    it('should convert to plain object representation', () => {
      const doc = new IndexedDocument(
        testId,
        testFields,
        testMetadata,
        testVersions,
        testRelations
      );
      
      const obj = doc.toObject();
      
      expect(obj).toEqual({
        id: testId,
        fields: testFields,
        metadata: testMetadata,
        versions: testVersions,
        relations: testRelations,
        title: testFields.title,
        author: testFields.author,
        tags: testFields.tags,
        version: testFields.version
      });
      
      // Should be a deep copy, not reference
      expect(obj.fields).not.toBe(doc.fields);
      expect(obj.metadata).not.toBe(doc.metadata);
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON string', () => {
      const doc = new IndexedDocument(testId, testFields);
      const jsonString = doc.toJSON();
      
      expect(typeof jsonString).toBe('string');
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.id).toBe(testId);
      expect(parsed.fields.title).toBe(testFields.title);
    });
  });

  describe('toString', () => {
    it('should return string representation with ID', () => {
      const doc = new IndexedDocument(testId, testFields);
      
      expect(doc.toString()).toBe(`IndexedDocument(${testId})`);
    });
  });

  describe('static create', () => {
    it('should create document from IndexedDocumentData', () => {
      const data: IndexedDocumentData = {
        id: 'static-create-doc',
        fields: {
          title: 'Static Created Doc',
          content: { text: 'Content from static create' },
          author: 'Static Creator',
          tags: ['static', 'create'],
          version: '2.0'
        },
        metadata: {
          indexed: Date.now(),
          lastModified: Date.now()
        },
        versions: [],
        relations: [],
        title: 'Static Created Doc',
        author: 'Static Creator',
        tags: ['static', 'create'],
        version: '2.0'
      };
      
      const doc = IndexedDocument.create(data);
      
      expect(doc).toBeInstanceOf(IndexedDocument);
      expect(doc.id).toBe(data.id);
      expect(doc.fields).toEqual(data.fields);
      expect(doc.metadata).toEqual(data.metadata);
    });
  });

  describe('static fromObject', () => {
    it('should create document from partial object', () => {
      const obj = {
        id: 'from-object-doc',
        fields: {
          title: 'From Object Doc',
          content: { text: 'Content from object' },
          author: 'Object Creator',
          tags: ['from', 'object'],
          version: '3.0'
        },
        metadata: {
          status: 'draft' as unknown,
          lastModified: Date.now()
        }
      };
      
      const doc = IndexedDocument.fromObject(obj);
      
      expect(doc).toBeInstanceOf(IndexedDocument);
      expect(doc.id).toBe(obj.id);
      expect(doc.fields).toEqual(obj.fields);
      expect(doc.metadata).toMatchObject({
        status: 'draft',
        lastModified: expect.any(Number)
      });
      expect(doc.versions).toEqual([]);
      expect(doc.relations).toEqual([]);
    });
  });

  describe('static fromRawData', () => {
    it('should create document from string content', () => {
      const doc = IndexedDocument.fromRawData('raw-doc', 'Raw content string');
      
      expect(doc).toBeInstanceOf(IndexedDocument);
      expect(doc.id).toBe('raw-doc');
      expect(doc.content).toEqual({ text: 'Raw content string' });
      expect(doc.fields.content).toEqual({ text: 'Raw content string' });
    });

    it('should create document from content object', () => {
      const content: DocumentContent = {
        text: 'Main text',
        metadata: { 
          format: 'markdown',
          sections: [
            { title: 'Section 1' },
            { title: 'Section 2' }
          ]
        }
      };
      
      const doc = IndexedDocument.fromRawData('raw-doc-obj', content);
      
      expect(doc).toBeInstanceOf(IndexedDocument);
      expect(doc.content).toEqual(content);
      expect(doc.fields.content).toEqual(content);
    });

    it('should use provided metadata', () => {
      const metadata: DocumentMetadata = {
        indexed: 1613456789000,
        lastModified: 1613456789000,
        category: 'article'
      };
      
      const doc = IndexedDocument.fromRawData('raw-with-metadata', 'Content', metadata);
      
      expect(doc.metadata).toEqual(metadata);
    });

    it('should initialize with default fields', () => {
      const doc = IndexedDocument.fromRawData('raw-defaults', 'Content');
      
      expect(doc.fields).toMatchObject({
        title: '',
        author: '',
        tags: [],
        version: '1.0'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty fields object', () => {
      const emptyFields: BaseFields = {
        title: '',
        content: {},
        author: '',
        tags: [],
        version: '1.0'
      };
      
      const doc = new IndexedDocument('empty-fields', emptyFields);
      
      expect(doc.fields).toMatchObject({
        title: '',
        author: '',
        tags: [],
        version: '1.0',
        content: {}
      });
      expect(doc.content).toEqual({});
    });

    it('should handle null content', () => {
      const fieldsWithNullContent: BaseFields = {
        ...testFields,
        content: null as unknown as DocumentContent
      };
      
      const doc = new IndexedDocument('null-content', fieldsWithNullContent);
      
      expect(doc.content).toEqual({});
    });

    it('should handle undefined metadata', () => {
      const doc = new IndexedDocument(testId, testFields, undefined);
      
      expect(doc.metadata).toBeDefined();
      expect(doc.metadata?.indexed).toBeGreaterThan(0);
      expect(doc.metadata?.lastModified).toBeGreaterThan(0);
    });

    it('should handle non-array tags', () => {
      const fieldsWithBadTags: BaseFields = {
        ...testFields,
        tags: 'not-an-array' as unknown as string[]
      };
      
      const doc = new IndexedDocument('bad-tags', fieldsWithBadTags);
      
      expect(doc.fields.tags).toEqual([]);
    });
  });
  
  describe('blob handling integration', () => {
    it('should work with BaseDocument file data input', async () => {
      // Simulate data that would come from BaseDocument.fromFileData
      const fileDocumentData = {
        id: 'file-12345',
        fields: {
          title: 'Test File',
          content: { 
            text: 'File content data',
            mimetype: 'text/plain'
          },
          author: 'File Creator',
          tags: ['file', 'test'],
          version: '1.0',
          modified: new Date().toISOString()
        },
        metadata: {
          lastModified: Date.now(),
          fileType: 'text/plain',
          fileSize: 123
        }
      };
      
      const indexedDoc = new IndexedDocument(
        fileDocumentData.id,
        fileDocumentData.fields,
        fileDocumentData.metadata
      );
      
      // Verify document was created properly from file data
      expect(indexedDoc.id).toBe('file-12345');
      expect(indexedDoc.content).toHaveProperty('text', 'File content data');
      expect(indexedDoc.content).toHaveProperty('mimetype', 'text/plain');
      expect(indexedDoc.metadata).toHaveProperty('fileType');
      expect(indexedDoc.metadata).toHaveProperty('fileSize');
    });
    
    it('should normalize complex file content structure', () => {
      // Simulate complex file content that might come from parsed files
      const complexContent = {
        text: 'Document text',
        metadata: {
          filename: 'test.docx',
          pages: 5,
          author: 'Document Author',
          created: '2023-01-01'
        },
        sections: [
          { heading: 'Section 1', paragraphs: ['Para 1', 'Para 2'] },
          { heading: 'Section 2', paragraphs: ['Para 3', 'Para 4'] }
        ],
        tables: [
          { rows: 3, columns: 4, data: [[1,2],[3,4]] }
        ]
      };
      
      const doc = IndexedDocument.fromRawData('complex-doc', complexContent);
      
      // Verify content normalization worked for complex structure
      expect(doc.content).toHaveProperty('text');
      expect(doc.content).toHaveProperty('metadata');
      expect(doc.content).toHaveProperty('sections');
      expect(doc.content).toHaveProperty('tables');
    });
  });

  // Setup mocks for time-related tests
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});