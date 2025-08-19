import { 
    IndexNode, 
    DocumentLink, 
    IndexedDocument,
    DocumentMetadata,
    SearchableDocument
} from '@/types';

export class TestFactory {
    static createIndexNode(params: Partial<IndexNode> = {}): IndexNode {
        return {
            id: params.id || '',
            value: params.value || '',
            score: params.score || 0,
            depth: params.depth || 0,
            children: params.children || new Map()
        };
    }

    static createDocumentLink(params: Partial<DocumentLink> = {}): DocumentLink {
        return {
            source: params.source || '',
            target: params.target || '',
            type: params.type || 'reference',
            weight: params.weight || 1,
            url: params.url || '',
            fromId: (fromId: string) => {
                if (fromId === params.source) return params.target || '';
                if (fromId === params.target) return params.source || '';
                throw new Error(`Invalid fromId: ${fromId}`);
            },
            toId: (toId: string) => {
                if (toId === params.target) return params.source || '';
                if (toId === params.source) return params.target || '';
                throw new Error(`Invalid toId: ${toId}`);
            }
        };
    }

    static createMetadata(params: Partial<DocumentMetadata> = {}): DocumentMetadata {
        const now = Date.now();
        return {
            indexed: params.indexed ?? now,
            lastModified: params.lastModified ?? now,
            ...params
        };
    }

    static createSearchableDocument(params: Partial<SearchableDocument> = {}): SearchableDocument {
        return {
            id: params.id || `doc-${Date.now()}`,
            content: params.content || {},
            metadata: this.createMetadata(params.metadata),
            version: params.version || '1.0'
        };
    }

    static createIndexedDocument(params: Partial<IndexedDocument> = {}): IndexedDocument {
        const now = Date.now();
        return {
            id: params.id || `doc-${now}`,
            fields: {
                title: '',
                content: {},
                author: '',
                tags: [],
                version: '1.0',
                ...params.fields
            },
            metadata: this.createMetadata(params.metadata),
            versions: params.versions || [],
            relations: params.relations || [],
            document: function () { return this; },
            base: function () {
                return {
                    id: this.id,
                    title: this.fields.title,
                    author: this.fields.author,
                    tags: this.fields.tags,
                    version: this.fields.version,
                    metadata: this.metadata,
                    versions: this.versions,
                    relations: this.relations
                };
            },
            title: '',
            author: '',
            tags: [],
            version: '1.0'
        };
    }
}s