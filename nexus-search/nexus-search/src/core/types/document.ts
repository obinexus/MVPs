// src/types/document.ts
// Document-related type definitions for NexusSearch

/**
 * Basic value types that can be stored in documents
 */
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type DocumentValue = PrimitiveValue | ArrayValue | Record<string, unknown>;

/**
 * Document content structure
 */
export interface DocumentContent {
  [key: string]: DocumentValue | DocumentContent | undefined;
  text?: DocumentValue | DocumentContent;
}

/**
 * Metadata for documents
 */
export interface DocumentMetadata {
  author?: string;
  tags?: string[];
  version?: string;
  lastModified: number;
  indexed?: number;
  fileType?: string;
  fileSize?: number;
  status?: string;
  [key: string]: unknown;
}

/**
 * Extended metadata for Nexus documents
 */
export interface NexusDocumentMetadata extends DocumentMetadata {
  indexed: number;
  lastModified: number;
  checksum?: string;
  permissions?: string[];
  workflow?: DocumentWorkflow;
}

/**
 * Base fields required for all documents
 */
export interface BaseFields {
  title: string;
  content: DocumentContent;
  author: string;
  tags: string[];
  version: string;
  modified?: string;
  [key: string]: DocumentValue | undefined;
}

/**
 * Fields that can be indexed
 */
export interface IndexableFields extends BaseFields {
  content: DocumentContent;
}

/**
 * Fields for Nexus documents with extended properties
 */
export interface NexusFields extends IndexableFields {
  type: string;
  category?: string;
  created: string;
  status: DocumentStatus;
  locale?: string;
}

/**
 * Base document interface
 */
export interface DocumentBase {
  id: string;
  title: string;
  author: string;
  tags: string[];
  version: string;
  metadata?: DocumentMetadata;
  versions: DocumentVersion[];
  relations: DocumentRelation[];
}

/**
 * Indexed document with all required properties
 */
export interface IndexedDocument {
  id: string;
  title: string;
  author: string;
  tags: string[];
  version: string;
  fields: IndexableFields;
  content: DocumentContent;
  metadata?: DocumentMetadata;
  links?: DocumentLink[];
  ranks?: DocumentRank[];
  versions: DocumentVersion[];
  relations: DocumentRelation[];
  
  // Methods
  document(): IndexedDocument;
  base(): DocumentBase;
}

/**
 * Document prepared for search indexing
 */
export interface SearchableDocument {
  id: string;
  version: string;
  content: Record<string, DocumentValue>;
  metadata?: DocumentMetadata;
}

/**
 * Serializable document data
 */
export interface IndexedDocumentData {
  id: string;
  title: string;
  author: string;
  tags: string[];
  version: string;
  fields: BaseFields;
  metadata?: DocumentMetadata;
  versions: Array<DocumentVersion>;
  relations: Array<DocumentRelation>;
}

/**
 * Link between documents
 */
export interface DocumentLink {
  fromId: string | ((fromId: string) => string);
  toId: string | ((toId: string) => string);
  weight: number;
  url: string;
  source: string;
  target: string;
  type: string;
}

/**
 * Relationship between documents
 */
export interface DocumentRelation {
  sourceId: string;
  targetId: string;
  type: RelationType;
  metadata?: Record<string, unknown>;
}

/**
 * Document version information
 */
export interface DocumentVersion {
  version: number;
  content: DocumentContent;
  modified: Date;
  author: string;
  changelog?: string;
}

/**
 * Document ranking information
 */
export interface DocumentRank {
  id: string;
  rank: number;
  incomingLinks: number;
  outgoingLinks: number;
  content: Record<string, unknown>;
  metadata?: DocumentMetadata;
}

/**
 * Document workflow information
 */
export interface DocumentWorkflow {
  status: string;
  assignee?: string;
  dueDate?: string;
}

/**
 * Document configuration
 */
export interface DocumentConfig {
  fields?: string[];
  storage?: StorageConfig;
  versioning?: VersioningConfig;
  validation?: ValidationConfig;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: 'memory' | 'indexeddb';
  options?: Record<string, unknown>;
}

/**
 * Versioning configuration
 */
export interface VersioningConfig {
  enabled: boolean;
  maxVersions?: number;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  required?: string[];
  customValidators?: Record<string, (value: unknown) => boolean>;
}

/**
 * Options for creating documents
 */
export interface CreateDocumentOptions {
  title: string;
  content: DocumentContent;
  type: string;
  tags?: string[];
  category?: string;
  author: string;
  status?: DocumentStatus;
  locale?: string;
  metadata?: Partial<NexusDocumentMetadata>;
}

/**
 * Document status enum
 */
export type DocumentStatus = 'draft' | 'published' | 'archived';

/**
 * Relation type enum
 */
export type RelationType = 'reference' | 'parent' | 'child' | 'related';

/**
 * Nexus document with extended functionality
 */
export interface NexusDocument extends IndexedDocument {
  fields: NexusFields;
  metadata?: NexusDocumentMetadata;
  links?: DocumentLink[];
  ranks?: DocumentRank[];
  document(): NexusDocument;
}

/**
 * Input for creating Nexus documents
 */
export interface NexusDocumentInput extends Partial<NexusDocument> {
  id?: string;
  content?: DocumentContent;
}

/**
 * Normalized document structure
 */
export interface NormalizedDocument {
  id: string;
  fields: {
    title: string;
    content: string | DocumentContent;
    author: string;
    tags: string[];
    version: string;
  };
  metadata: {
    indexed: number;
    lastModified: number;
    [key: string]: unknown;
  };
}

/**
 * Plugin configuration for NexusDocument
 */
export interface NexusDocumentPluginConfig {
  name?: string;
  version?: number;
  fields?: string[];
  storage?: {
    type: 'memory' | 'indexeddb';
    options?: Record<string, unknown>;
  };
  versioning?: {
    enabled?: boolean;
    maxVersions?: number;
  };
  validation?: {
    required?: string[];
    customValidators?: Record<string, (value: unknown) => boolean>;
  };
}