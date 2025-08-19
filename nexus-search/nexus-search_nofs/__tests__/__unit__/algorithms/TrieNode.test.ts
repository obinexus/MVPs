import { TrieNode } from "@/index";

describe('TrieNode', () => {
  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const node = new TrieNode();
      
      expect(node.children).toBeInstanceOf(Map);
      expect(node.children.size).toBe(0);
      expect(node.isEndOfWord).toBe(false);
      expect(node.documentRefs).toBeInstanceOf(Set);
      expect(node.documentRefs.size).toBe(0);
      expect(node.weight).toBe(0);
      expect(node.frequency).toBe(0);
      expect(node.prefixCount).toBe(0);
      expect(node.depth).toBe(0);
      expect(typeof node.lastAccessed).toBe('number');
    });

    test('should initialize with specified depth', () => {
      const node = new TrieNode(5);
      expect(node.depth).toBe(5);
    });
  });

  describe('addChild', () => {
    test('should add a child node and return it', () => {
      const node = new TrieNode();
      const childNode = node.addChild('a');
      
      expect(node.children.has('a')).toBe(true);
      expect(node.children.get('a')).toBe(childNode);
      expect(childNode).toBeInstanceOf(TrieNode);
      expect(childNode.depth).toBe(1);
    });

    test('should increment depth for nested children', () => {
      const root = new TrieNode();
      const level1 = root.addChild('a');
      const level2 = level1.addChild('b');
      const level3 = level2.addChild('c');
      
      expect(root.depth).toBe(0);
      expect(level1.depth).toBe(1);
      expect(level2.depth).toBe(2);
      expect(level3.depth).toBe(3);
    });
  });

  describe('getChild', () => {
    test('should return the child node for a given character', () => {
      const node = new TrieNode();
      const childNode = node.addChild('a');
      
      expect(node.getChild('a')).toBe(childNode);
    });

    test('should return undefined for non-existent child', () => {
      const node = new TrieNode();
      expect(node.getChild('a')).toBeUndefined();
    });
  });

  describe('hasChild', () => {
    test('should return true if child exists', () => {
      const node = new TrieNode();
      node.addChild('a');
      
      expect(node.hasChild('a')).toBe(true);
    });

    test('should return false if child does not exist', () => {
      const node = new TrieNode();
      expect(node.hasChild('a')).toBe(false);
    });

    test('should handle multiple children correctly', () => {
      const node = new TrieNode();
      node.addChild('a');
      node.addChild('b');
      node.addChild('c');
      
      expect(node.hasChild('a')).toBe(true);
      expect(node.hasChild('b')).toBe(true);
      expect(node.hasChild('c')).toBe(true);
      expect(node.hasChild('d')).toBe(false);
    });
  });

  describe('incrementWeight', () => {
    test('should increment weight by default value (1.0)', () => {
      const node = new TrieNode();
      node.incrementWeight();
      
      expect(node.weight).toBe(1.0);
      expect(node.frequency).toBe(1);
    });

    test('should increment weight by specified value', () => {
      const node = new TrieNode();
      node.incrementWeight(2.5);
      
      expect(node.weight).toBe(2.5);
      expect(node.frequency).toBe(1);
    });

    test('should update lastAccessed timestamp', () => {
      const node = new TrieNode();
      const beforeTimestamp = node.lastAccessed;
      
      // Small delay to ensure timestamp change
      jest.advanceTimersByTime(10);
      
      node.incrementWeight();
      expect(node.lastAccessed).toBeGreaterThan(beforeTimestamp);
    });

    test('should accumulate weight over multiple calls', () => {
      const node = new TrieNode();
      node.incrementWeight(1.5);
      node.incrementWeight(2.5);
      
      expect(node.weight).toBe(4.0);
      expect(node.frequency).toBe(2);
    });
  });

  describe('decrementWeight', () => {
    test('should decrement weight by default value (1.0)', () => {
      const node = new TrieNode();
      node.incrementWeight(5.0);
      node.decrementWeight();
      
      expect(node.weight).toBe(4.0);
      expect(node.frequency).toBe(0);
    });

    test('should decrement weight by specified value', () => {
      const node = new TrieNode();
      node.incrementWeight(5.0);
      node.decrementWeight(2.5);
      
      expect(node.weight).toBe(2.5);
      expect(node.frequency).toBe(0);
    });

    test('should not allow negative weight', () => {
      const node = new TrieNode();
      node.incrementWeight(1.0);
      node.decrementWeight(10.0);
      
      expect(node.weight).toBe(0);
      expect(node.frequency).toBe(0);
    });

    test('should not allow negative frequency', () => {
      const node = new TrieNode();
      node.frequency = 1;
      node.decrementWeight(); // This should reduce frequency by 1
      node.decrementWeight(); // This should not make frequency negative
      
      expect(node.frequency).toBe(0);
    });
  });

  describe('clearChildren', () => {
    test('should remove all children', () => {
      const node = new TrieNode();
      node.addChild('a');
      node.addChild('b');
      node.documentRefs.add('doc1');
      node.incrementWeight(2.0);
      
      node.clearChildren();
      
      expect(node.children.size).toBe(0);
      expect(node.documentRefs.size).toBe(0);
      expect(node.weight).toBe(0);
      expect(node.frequency).toBe(0);
    });
  });

  describe('shouldPrune', () => {
    test('should return true for empty nodes', () => {
      const node = new TrieNode();
      expect(node.shouldPrune()).toBe(true);
    });

    test('should return false if node has children', () => {
      const node = new TrieNode();
      node.addChild('a');
      expect(node.shouldPrune()).toBe(false);
    });

    test('should return false if node has document references', () => {
      const node = new TrieNode();
      node.documentRefs.add('doc1');
      expect(node.shouldPrune()).toBe(false);
    });

    test('should return false if node has weight', () => {
      const node = new TrieNode();
      node.incrementWeight();
      expect(node.shouldPrune()).toBe(false);
    });

    test('should return false if node has frequency', () => {
      const node = new TrieNode();
      node.frequency = 1;
      expect(node.shouldPrune()).toBe(false);
    });
  });

  describe('getScore', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should calculate score based on weight, frequency, recency and depth', () => {
      const node = new TrieNode(2); // depth = 2
      node.incrementWeight(2.0); // weight = 2.0, frequency = 1
      
      const initialScore = node.getScore();
      expect(initialScore).toBeGreaterThan(0);
      
      // Advance time to simulate aging (24 hours)
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
      
      const laterScore = node.getScore();
      expect(laterScore).toBeLessThan(initialScore);
    });

    test('should return higher score for more recently accessed nodes', () => {
      const node1 = new TrieNode();
      const node2 = new TrieNode();
      
      node1.incrementWeight(1.0);
      node2.incrementWeight(1.0);
      
      // Advance time for node1
      jest.advanceTimersByTime(12 * 60 * 60 * 1000);
      
      // Now increment node2 (makes it more recent)
      node2.incrementWeight(0);
      
      expect(node2.getScore()).toBeGreaterThan(node1.getScore());
    });

    test('should factor in depth to prioritize shorter words', () => {
      const shallowNode = new TrieNode(1);
      const deepNode = new TrieNode(5);
      
      // Same weight and frequency
      shallowNode.incrementWeight(1.0);
      deepNode.incrementWeight(1.0);
      
      expect(shallowNode.getScore()).toBeGreaterThan(deepNode.getScore());
    });
  });

  describe('getWeight', () => {
    test('should return the weight value', () => {
      const node = new TrieNode();
      expect(node.getWeight()).toBe(0);
      
      node.incrementWeight(3.5);
      expect(node.getWeight()).toBe(3.5);
    });
  });
});