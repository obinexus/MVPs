import { SearchOptions } from "./search";

// ----------------
// Base Types
// ----------------

export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type DocumentValue = PrimitiveValue | ArrayValue | Record<string, unknown>;

export interface DocumentContent {
    [key: string]: DocumentValue | DocumentContent | undefined;
    text?: DocumentValue | DocumentContent;
}

// ----------------
// Metadata Types
// ----------------
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

export interface NexusDocumentMetadata extends DocumentMetadata {
    indexed: number;
    lastModified: number;
    checksum?: string;
    permissions?: string[];
    workflow?: DocumentWorkflow;
}

// ----------------
// Field Types
// ----------------

export interface BaseFields {
    title: string;
    content: DocumentContent;
    author: string;
    tags: string[];
    version: string;
    modified?: string;
    [key: string]: DocumentValue | undefined;
}

export interface IndexableFields extends BaseFields {
    content: DocumentContent;
}

export interface NexusFields extends IndexableFields {
    type: string;
    category?: string;
    created: string;
    status: DocumentStatus;
    locale?: string;
}

// ----------------
// Document Types
// ----------------

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

export interface SearchableDocument {
    id: string;
    version: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}

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

// ----------------
// Relationship Types
// ----------------

export interface DocumentLink {
    fromId: string | ((fromId: string) => string);
    toId: string | ((toId: string) => string);
    weight: number;
    url: string;
    source: string;
    target: string;
    type: string;
}

export interface DocumentRelation {
    sourceId: string;
    targetId: string;
    type: RelationType;
    metadata?: Record<string, unknown>;
}

export interface DocumentVersion {
    version: number;
    content: DocumentContent;
    modified: Date;
    author: string;
    changelog?: string;
}

// ----------------
// Supporting Types
// ----------------

export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
    content: Record<string, unknown>;
    metadata?: DocumentMetadata;
}

export interface DocumentWorkflow {
    status: string;
    assignee?: string;
    dueDate?: string;
}

// ----------------
// Configuration Types
// ----------------

export interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
}

export interface DocumentConfig {
    fields?: string[];
    storage?: StorageConfig;
    versioning?: VersioningConfig;
    validation?: ValidationConfig;
}

export interface StorageConfig {
    type: 'memory' | 'indexeddb';
    options?: Record<string, unknown>;
}

export interface VersioningConfig {
    enabled: boolean;
    maxVersions?: number;
}

export interface ValidationConfig {
    required?: string[];
    customValidators?: Record<string, (value: unknown) => boolean>;
}

export interface IndexOptions {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
}

// ----------------
// Operation Types
// ----------------

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

export interface AdvancedSearchOptions extends SearchOptions {
    filters?: SearchFilters;
    sort?: SortConfig;
}

// ----------------
// Enums and Constants
// ----------------

export type DocumentStatus = 'draft' | 'published' | 'archived';
export type RelationType = 'reference' | 'parent' | 'child' | 'related';

// ----------------
// Helper Types
// ----------------

interface SearchFilters {
    status?: DocumentStatus[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    categories?: string[];
    types?: string[];
    authors?: string[];
}

interface SortConfig {
    field: keyof NexusFields;
    order: 'asc' | 'desc';
}

export interface NexusDocument extends IndexedDocument {
    fields: NexusFields;
    metadata?: NexusDocumentMetadata;
    links?: DocumentLink[];
    ranks?: DocumentRank[];
    document(): NexusDocument;
}

export interface NexusDocumentInput extends Partial<NexusDocument> {
    id?: string;
    content?: DocumentContent;
}

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

