// AlgoUtils.test.ts
import { AlgoUtils } from '@/utils';
import { IndexNode, DocumentLink } from '@/types';
import { TestFactory } from '../TestFactory';

describe('AlgoUtils', () => {
  let mockRoot: IndexNode;

  beforeEach(() => {
    mockRoot = TestFactory.createIndexNode({
      children: new Map(),
      score: 0,
      depth: 0
    });
  });

  describe('bfsTraversal', () => {
    test('should find exact matches', () => {
      const doc1Node = TestFactory.createIndexNode({
        id: 'doc1',
        score: 1.0,
        depth: 3
      });
      const doc2Node = TestFactory.createIndexNode({
        id: 'doc2',
        score: 0.8,
        depth: 3
      });
      
      mockRoot.children.set('c', TestFactory.createIndexNode({
        depth: 1,
        children: new Map([
          ['a', TestFactory.createIndexNode({
            depth: 2,
            children: new Map([
              ['t', doc1Node],
              ['r', doc2Node]
            ])
          })]
        ])
      }));

      const results = AlgoUtils.bfsTraversal(mockRoot, 'cat');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ id: 'doc1', score: 1.0 });
    });

    // ... other bfsTraversal tests similarly updated ...
  });

  describe('enhancedSearch', () => {
    test('should combine multiple scoring factors', () => {
      const documents = new Map();
      documents.set('doc1', TestFactory.createIndexedDocument({
        id: 'doc1',
        fields: {
          content: { text: 'test document one' }
        }
      }));
      documents.set('doc2', TestFactory.createIndexedDocument({
        id: 'doc2',
        fields: {
          content: { text: 'test document two' }
        }
      }));

      const documentLinks = [
        TestFactory.createDocumentLink({
          source: 'doc1',
          target: 'doc2',
          weight: 1
        })
      ];

      const doc1Node = TestFactory.createIndexNode({
        id: 'doc1',
        score: 0.8,
        depth: 3
      });

      mockRoot.children.set('t', TestFactory.createIndexNode({
        depth: 1,
        children: new Map([
          ['e', TestFactory.createIndexNode({
            depth: 2,
            children: new Map([
              ['s', TestFactory.createIndexNode({
                depth: 3,
                children: new Map([
                  ['t', doc1Node]
                ])
              })]
            ])
          })]
        ])
      }));

      const results = AlgoUtils.enhancedSearch(mockRoot, 'test', documents, documentLinks);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('rank');
    });
  });
});

