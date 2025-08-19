// ScoringUtils.test.ts
import { ScoringUtils } from '@/utils/ScoringUtils';
import { TestFactory } from '../TestFactory';

describe('ScoringUtils', () => {
  describe('calculateDocumentRanks', () => {
    test('should calculate basic document ranks', () => {
      const documents = new Map([
        ['doc1', TestFactory.createIndexedDocument({
          id: 'doc1',
          fields: { content: { text: 'test' } }
        })],
        ['doc2', TestFactory.createIndexedDocument({
          id: 'doc2',
          fields: { content: { text: 'test' } }
        })]
      ]);

      const links = [
        TestFactory.createDocumentLink({
          source: 'doc1',
          target: 'doc2',
          weight: 1
        })
      ];

      const ranks = ScoringUtils.calculateDocumentRanks(documents, links);
      
      expect(ranks.size).toBe(2);
      expect(ranks.get('doc1')).toBeDefined();
      expect(ranks.get('doc2')).toBeDefined();
      expect(ranks.get('doc1')!.outgoingLinks).toBe(1);
      expect(ranks.get('doc2')!.incomingLinks).toBe(1);
    });

    test('should handle cyclic links', () => {
      const documents = new Map([
        ['doc1', TestFactory.createIndexedDocument({
          id: 'doc1',
          fields: { content: { text: 'test' } }
        })],
        ['doc2', TestFactory.createIndexedDocument({
          id: 'doc2',
          fields: { content: { text: 'test' } }
        })]
      ]);

      const links = [
        TestFactory.createDocumentLink({
          source: 'doc1',
          target: 'doc2',
          weight: 1
        }),
        TestFactory.createDocumentLink({
          source: 'doc2',
          target: 'doc1',
          weight: 1
        })
      ];

      const ranks = ScoringUtils.calculateDocumentRanks(documents, links);
      
      const rank1 = ranks.get('doc1')!.rank;
      const rank2 = ranks.get('doc2')!.rank;
      expect(Math.abs(rank1 - rank2)).toBeLessThan(0.0001);
    });
  });

  describe('calculateTfIdf', () => {
    test('should calculate TF-IDF score', () => {
      const documents = new Map([
        ['doc1', TestFactory.createIndexedDocument({
          id: 'doc1',
          fields: { content: { text: 'test document one' } }
        })],
        ['doc2', TestFactory.createIndexedDocument({
          id: 'doc2',
          fields: { content: { text: 'test document two' } }
        })]
      ]);

      const term = 'test';
      const document = documents.get('doc1');
      const score = ScoringUtils.calculateTfIdf(term, document, documents);
      
      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
    });
  });

  describe('adjustScoreByFreshness', () => {
    test('should adjust score based on document age', () => {
      const baseScore = 0.8;
      const recentDate = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      
      const adjustedScoreOld = ScoringUtils.adjustScoreByFreshness(
        baseScore,
        oldDate
      );
      const adjustedScoreRecent = ScoringUtils.adjustScoreByFreshness(
        baseScore,
        recentDate
      );

      expect(adjustedScoreOld).toBeLessThan(baseScore);
      expect(adjustedScoreRecent).toBeCloseTo(baseScore, 2);
    });
  });
});