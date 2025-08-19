import { DocumentContent, DocumentMetadata, DocumentRelation, DocumentVersion, IndexedDocument } from '@/types';
/**
 * Creates a mock IndexedDocument for testing purposes
 * @param id Document ID
 * @param customContent Optional custom content
 * @param customMetadata Optional custom metadata
 */
export declare const createMockDocument: (id: string, customContent?: DocumentContent, customMetadata?: DocumentMetadata) => IndexedDocument;
/**
 * Creates multiple mock documents
 * @param count Number of documents to create
 * @param prefix ID prefix
 */
export declare const createMockDocuments: (count: number, prefix?: string) => IndexedDocument[];
export declare function createIndexedDocument(id: string, fields: {
    title: string;
    content: DocumentContent;
    author: string;
    tags: string[];
    version: string;
}, metadata?: DocumentMetadata, versions?: DocumentVersion[], relations?: DocumentRelation[]): IndexedDocument;
export declare function createTestDocument(id: string, title: string, contentText: string): IndexedDocument;
