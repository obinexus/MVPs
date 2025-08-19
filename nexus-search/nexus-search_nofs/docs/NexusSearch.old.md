```mermaid
classDiagram
    %% Core Components
    class SearchEngine {
        -indexManager: IndexManager
        -queryProcessor: QueryProcessor
        -storage: SearchStorage
        -cache: CacheManager
        -trie: TrieSearch
        -documents: Map~string, IndexedDocument~
        +initialize()
        +search(query, options)
        +addDocument(document)
        +removeDocument(documentId)
        +updateDocument(document)
        +performRegexSearch(query, options)
    }
    
    class QueryProcessor {
        -STOP_WORDS: Set~string~
        -WORD_ENDINGS: Object
        +process(query): string
        -tokenize(text): QueryToken[]
        -normalizeWordEndings(word): string
    }
    
    class DocumentLink {
        +source: string
        +target: string
        +type: string
        +weight: number
        +url: string
        +fromId(fromId): string
        +toId(toId): string
        +isBidirectional(): boolean
    }
    
    %% Trie Data Structure
    class TrieNode {
        +children: Map~string, TrieNode~
        +isEndOfWord: boolean
        +documentRefs: Set~string~
        +weight: number
        +frequency: number
        +lastAccessed: number
        +prefixCount: number
        +depth: number
        +addChild(char): TrieNode
        +getChild(char): TrieNode
        +incrementWeight(value)
        +decrementWeight(value)
        +getScore(): number
    }
    
    class TrieSearch {
        -root: TrieNode
        -documents: Map~string, IndexedDocument~
        -maxWordLength: number
        +insert(word, id)
        +addDocument(document)
        +search(query, options): SearchResult[]
        +fuzzySearch(word, maxDistance): SearchResult[]
        +getSuggestions(prefix, maxResults): string[]
        +removeDocument(documentId)
        +serializeState(): Object
        +deserializeState(state)
    }
    
    %% Storage & Index Management
    class IndexedDocument {
        +id: string
        +fields: BaseFields
        +metadata: DocumentMetadata
        +versions: DocumentVersion[]
        +relations: DocumentRelation[]
        +content: DocumentContent
        +document(): IndexedDocument
        +base(): DocumentBase
        +update(updates): IndexedDocument
    }
    
    class BaseDocument {
        +id: string
        +fields: IndexableFields
        +metadata: DocumentMetadata
        +versions: DocumentVersion[]
        +relations: DocumentRelation[]
        +content: DocumentContent
        +document(): IndexedDocument
        +base(): DocumentBase
        +update(updates): IndexedDocument
    }
    
    class SearchStorage {
        -db: IDBPDatabase
        -memoryStorage: Map~string, unknown~
        -storageType: string
        +initialize()
        +storeIndex(name, data)
        +getIndex(name)
        +clearIndices()
        +close()
    }
    
    class IndexManager {
        -indexMapper: IndexMapper
        -config: IndexConfig
        -documents: Map~string, IndexedDocument~
        +addDocument(document)
        +updateDocument(document)
        +removeDocument(documentId)
        +search(query, options): SearchResult[]
        +exportIndex(): SerializedIndex
        +importIndex(data)
    }
    
    class IndexMapper {
        -dataMapper: DataMapper
        -trieSearch: TrieSearch
        -documents: Map~string, IndexedDocument~
        +indexDocument(document, id, fields)
        +search(query, options): SearchResult[]
        +removeDocument(id)
        +exportState(): Object
        +importState(state)
    }
    
    class DataMapper {
        -dataMap: Map~string, Set~string~~
        +mapData(key, documentId)
        +getDocuments(key): Set~string~
        +removeDocument(documentId)
        +exportState(): Record~string, string[]~
        +importState(state)
    }
    
    class CacheManager {
        -cache: Map~string, CacheEntry~
        -maxSize: number
        -ttl: number
        -strategy: CacheStrategy
        +set(key, data)
        +get(key): SearchResult[]
        +clear()
        +getStats()
        +getSize(): number
    }
    
    %% Configuration
    class NexusSearchConfig {
        +name: string
        +version: number
        +fields: string[]
        +storage: StorageConfig
        +indexing: IndexingConfig
        +search: SearchConfig
        +documentSupport: DocumentConfig
        +validate(): boolean
        +toJSON(): object
    }
    
    %% Utility Classes
    class ScoringUtils {
        +calculateDocumentRanks(documents, links): Map~string, DocumentRank~
        +calculateTfIdf(term, document, documents): number
        +calculateCombinedScore(textScore, documentRank, termFrequency, inverseDocFreq): number
    }
    
    class SearchUtils {
        +bfsRegexTraversal(root, pattern, maxResults, config): RegexSearchResult[]
        +dfsRegexTraversal(root, pattern, maxResults, config): RegexSearchResult[]
        +calculateScore(document, query, field, options): number
        +extractMatches(document, query, fields, options): string[]
    }
    
    class PerformanceMonitor {
        -metrics: Map~string, number[]~
        +measure(name, fn): Promise~T~
        +getMetrics(): MetricsResult
        +clear()
    }
    
    %% Relationships
    SearchEngine --> QueryProcessor : uses
    SearchEngine --> TrieSearch : uses
    SearchEngine --> IndexManager : uses
    SearchEngine --> SearchStorage : uses
    SearchEngine --> CacheManager : uses
    
    TrieSearch --> TrieNode : uses
    TrieSearch ..> IndexedDocument : stores
    
    IndexManager --> IndexMapper : uses
    IndexMapper --> DataMapper : uses
    IndexMapper --> TrieSearch : uses
    
    IndexedDocument --|> BaseDocument : extends
    
    SearchEngine ..> DocumentLink : handles
    SearchEngine ..> ScoringUtils : uses
    SearchEngine ..> SearchUtils : uses
    
    NexusSearchConfig --> StorageConfig : contains
    NexusSearchConfig --> IndexingConfig : contains
    NexusSearchConfig --> SearchConfig : contains
    NexusSearchConfig --> DocumentConfig : contains
    ```