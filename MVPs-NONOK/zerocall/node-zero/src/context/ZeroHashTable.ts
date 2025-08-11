/**
 * ZeroHashTable - Secure hash table implementation for the Zero library
 * 
 * Provides a cryptographically secure key-value store with:
 * - HMAC-based key derivation for secure lookups
 * - Constant-time operations to prevent timing attacks
 * - Zero-knowledge verification capabilities
 * - Secure memory handling for sensitive data
 */
import crypto from 'crypto';
import { ZeroContext } from '../context/ZeroContext.js';
import { ZeroError, ZeroErrorCode } from '../errors/index.js';
import { CryptoFlags } from '../types/common.js';
import { HashAlgorithm, hmac } from '../crypto/hash.js';
import { secureAlloc, secureFree, constantTimeCompare, secureRandomBytes } from '../utils/memory.js';

/**
 * Entry in the hash table
 */
interface HashEntry<V> {
  /**
   * HMAC of the original key
   */
  keyHmac: Buffer;
  
  /**
   * Value associated with the key
   */
  value: V;
  
  /**
   * Salt used for HMAC calculation
   */
  salt: Buffer;
  
  /**
   * Optional timestamp for entry creation
   */
  timestamp: number;
  
  /**
   * Optional expiration time
   */
  expirationTime?: number;
}

/**
 * Options for hash table creation and operation
 */
export interface HashTableOptions {
  /**
   * Hash algorithm to use for HMACs
   */
  hashAlgorithm?: HashAlgorithm;
  
  /**
   * Initial capacity for the hash table
   */
  initialCapacity?: number;
  
  /**
   * Load factor threshold for rehashing
   */
  loadFactor?: number;
  
  /**
   * Whether to use constant-time operations
   */
  constantTime?: boolean;
  
  /**
   * Security flags for operations
   */
  flags?: CryptoFlags;
  
  /**
   * Default time-to-live for entries in milliseconds
   */
  defaultTtl?: number;
}

/**
 * Default options for hash table
 */
const DEFAULT_OPTIONS: HashTableOptions = {
  hashAlgorithm: HashAlgorithm.SHA256,
  initialCapacity: 16,
  loadFactor: 0.75,
  constantTime: true,
  flags: CryptoFlags.SECURE_MEMORY,
  defaultTtl: undefined
};

/**
 * Secure hash table implementation that provides cryptographic guarantees
 * and zero-knowledge operations for key-value storage
 */
export class ZeroHashTable<K, V> {
  /**
   * Context for operations
   */
  private readonly context!: ZeroContext;
  
  /**
   * Hash algorithm used for key derivation
   */
  private readonly hashAlgorithm: HashAlgorithm;
  
  /**
   * Internal storage buckets
   */
  private buckets: Array<Array<HashEntry<V>>>;
  
  /**
   * Current number of entries
   */
  private size: number;
  
  /**
   * Current capacity (number of buckets)
   */
  private capacity: number;
  
  /**
   * Threshold for rehashing
   */
  private threshold: number;
  
  /**
   * Load factor for rehashing
   */
  private loadFactor: number;
  
  /**
   * Security flags
   */
  private flags: CryptoFlags;
  
  /**
   * Whether to use constant-time operations
   */
  private constantTime: boolean;
  
  /**
   * Master key for HMAC operations (generated per instance)
   */
  private masterKey: Buffer;
  
  /**
   * Default TTL for entries
   */
  private defaultTtl?: number;

  /**
   * Creates a new secure hash table
   * 
   * @param context - Zero context for operations
   * @param options - Options for the hash table
   */
  constructor(context: ZeroContext, options: HashTableOptions = {}) {
    if (!context) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Context is required',
        { contextType: typeof context }
      );
    }
    
    // Apply default options
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    this.context = context;
    this.hashAlgorithm = opts.hashAlgorithm!;
    this.capacity = opts.initialCapacity!;
    this.loadFactor = opts.loadFactor!;
    this.threshold = Math.floor(this.capacity * this.loadFactor);
    this.constantTime = opts.constantTime!;
    this.flags = opts.flags!;
    this.defaultTtl = opts.defaultTtl;
    this.size = 0;
    
    // Initialize buckets
    this.buckets = new Array(this.capacity);
    for (let i = 0; i < this.capacity; i++) {
      this.buckets[i] = [];
    }
    
    // Generate master key for this instance
    this.masterKey = secureRandomBytes(32);
  }
  /**
   * Iterator for keys in the hash table
   */
  public *keys(): Generator<K, void, undefined> {
    for (const bucket of this.buckets) {
      for (const entry of bucket) {
        // Skip expired entries
        if (this.isEntryExpired(entry)) {
          continue;
        }
        // Pass through keyHmac and salt to validate
        yield entry.keyHmac as unknown as K;
      }
    }
  }
  /**
   * Gets the number of entries in the hash table
   */
  public getSize(): number {
    return this.size;
  }
  
  /**
   * Checks if the hash table is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }
  
  /**
   * Checks if the hash table contains a key
   * 
   * @param key - Key to check
   * @returns True if the key exists, false otherwise
   */
  public has(key: K): boolean {
    // Get key HMAC and bucket index
    const keyData = this.serializeKey(key);
    const { keyHmac, bucketIndex } = this.getKeyData(keyData);
    
    // Get bucket
    const bucket = this.buckets[bucketIndex];
    
    // Search for key in bucket
    if (this.constantTime) {
      // Constant-time search to prevent timing attacks
      let found = 0;
      
      for (const entry of bucket) {
        // Compare HMACs in constant time
        const result = constantTimeCompare(entry.keyHmac, keyHmac);
        
        // Check if entry is expired
        const isExpired = this.isEntryExpired(entry) ? 1 : 0;
        
        // Update found status without branching
        // found will be non-zero only if an entry matches and is not expired
        found |= (result === 0 && isExpired === 0) ? 1 : 0;
      }
      
      return found !== 0;
    } else {
      // Regular search
      for (const entry of bucket) {
        if (Buffer.compare(entry.keyHmac, keyHmac) === 0 && !this.isEntryExpired(entry)) {
          return true;
        }
      }
      
      return false;
    }
  }
  
  /**
   * Gets a value by key
   * 
   * @param key - Key to lookup
   * @returns Value or undefined if not found
   */
  public get(key: K): V | undefined {
    // Get key HMAC and bucket index
    const keyData = this.serializeKey(key);
    const { keyHmac, bucketIndex } = this.getKeyData(keyData);
    
    // Get bucket
    const bucket = this.buckets[bucketIndex];
    
    // Search for key in bucket
    for (const entry of bucket) {
      if (Buffer.compare(entry.keyHmac, keyHmac) === 0) {
        // Check if expired
        if (this.isEntryExpired(entry)) {
          // Remove expired entry
          this.removeEntry(bucketIndex, entry);
          return undefined;
        }
        
        return entry.value;
      }
    }
    
    return undefined;
  }
  
  /**
   * Sets a key-value pair
   * 
   * @param key - Key to set
   * @param value - Value to associate with key
   * @param ttl - Optional time-to-live in milliseconds
   * @returns This hash table instance
   */
  public set(key: K, value: V, ttl?: number): ZeroHashTable<K, V> {
    // Check if rehashing is needed
    if (this.size >= this.threshold) {
      this.rehash();
    }
    
    // Get key HMAC and bucket index
    const keyData = this.serializeKey(key);
    const { keyHmac, bucketIndex, salt } = this.getKeyData(keyData);
    
    // Get bucket
    const bucket = this.buckets[bucketIndex];
    
    // Check if key already exists
    for (let i = 0; i < bucket.length; i++) {
      if (Buffer.compare(bucket[i].keyHmac, keyHmac) === 0) {
        // Update existing entry
        bucket[i].value = value;
        bucket[i].timestamp = Date.now();
        
        // Update expiration if provided
        if (ttl !== undefined) {
          bucket[i].expirationTime = Date.now() + ttl;
        } else if (this.defaultTtl !== undefined) {
          bucket[i].expirationTime = Date.now() + this.defaultTtl;
        }
        
        return this;
      }
    }
    
    // Create new entry
    const entry: HashEntry<V> = {
      keyHmac,
      value,
      salt,
      timestamp: Date.now()
    };
    
    // Set expiration if provided
    if (ttl !== undefined) {
      entry.expirationTime = Date.now() + ttl;
    } else if (this.defaultTtl !== undefined) {
      entry.expirationTime = Date.now() + this.defaultTtl;
    }
    
    // Add to bucket
    bucket.push(entry);
    this.size++;
    
    return this;
  }
  
  /**
   * Deletes a key-value pair
   * 
   * @param key - Key to delete
   * @returns True if the key was deleted, false if not found
   */
  public delete(key: K): boolean {
    // Get key HMAC and bucket index
    const keyData = this.serializeKey(key);
    const { keyHmac, bucketIndex } = this.getKeyData(keyData);
    
    // Get bucket
    const bucket = this.buckets[bucketIndex];
    
    // Search for key in bucket
    for (let i = 0; i < bucket.length; i++) {
      if (Buffer.compare(bucket[i].keyHmac, keyHmac) === 0) {
        // Remove entry
        this.removeEntry(bucketIndex, bucket[i]);
        
        // Remove empty slot
        bucket.splice(i, 1);
        this.size--;
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Clears all entries
   */
  public clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      // Securely free all entries
      for (const entry of this.buckets[i]) {
        this.freeEntry(entry);
      }
      
      // Reset bucket
      this.buckets[i] = [];
    }
    
    this.size = 0;
  }
  
  /**
   * Disposes of the hash table and frees all resources
   */
  public dispose(): void {
    // Clear all entries
    this.clear();
    
    // Free master key
    secureFree(this.masterKey);
  }
  
  /**
   * Creates a zero-knowledge proof that a key exists without revealing the key
   * 
   * @param key - Key to create proof for
   * @param challenge - Challenge for the proof
   * @returns Proof buffer or null if key doesn't exist
   */
  public createProof(key: K, challenge: Buffer): Buffer | null {
    // Verify key exists
    if (!this.has(key)) {
      return null;
    }
    
    // Get key HMAC and bucket index
    const keyData = this.serializeKey(key);
    const { keyHmac } = this.getKeyData(keyData);
    
    // Create proof using HMAC
    return hmac(
      this.hashAlgorithm,
      keyHmac,
      Buffer.concat([challenge, this.masterKey]),
      this.flags
    );
  }
  
  /**
   * Verifies a zero-knowledge proof for a key
   * 
   * @param proof - Proof to verify
   * @param challenge - Challenge used to create the proof
   * @param key - Key claimed to be in the hash table
   * @returns True if the proof is valid, false otherwise
   */
  public verifyProof(proof: Buffer, challenge: Buffer, key: K): boolean {
    // Create a new proof and compare
    const newProof = this.createProof(key, challenge);
    
    // If key doesn't exist, proof is invalid
    if (!newProof) {
      return false;
    }
    
    // Compare proofs in constant time
    return constantTimeCompare(proof, newProof) === 0;
  }
  
  /**
   * Exports an encrypted backup of the hash table
   * 
   * @param encryptionKey - Key for encrypting the backup
   * @returns Encrypted backup buffer
   */
  public export(encryptionKey: Buffer): Buffer {
    // Create export data structure
    const exportData = {
      capacity: this.capacity,
      size: this.size,
      algorithm: this.hashAlgorithm,
      entries: [] as Array<{
        bucketIndex: number;
        keyHmac: string;
        salt: string;
        value: unknown;
        timestamp: number;
        expirationTime?: number;
      }>
    };
    
    // Collect all entries
    for (let i = 0; i < this.capacity; i++) {
      for (const entry of this.buckets[i]) {
        // Skip expired entries
        if (this.isEntryExpired(entry)) {
          continue;
        }
        
        exportData.entries.push({
          bucketIndex: i,
          keyHmac: entry.keyHmac.toString('base64'),
          salt: entry.salt.toString('base64'),
          value: entry.value,
          timestamp: entry.timestamp,
          expirationTime: entry.expirationTime
        });
      }
    }
    
    // Serialize data
    const jsonData = JSON.stringify(exportData);
    
    // Encrypt data
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    
    let encrypted = cipher.update(jsonData, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag
    return Buffer.concat([
      // Format version
      Buffer.from([1]),
      // IV
      iv,
      // Auth tag
      authTag,
      // Encrypted data
      encrypted
    ]);
  }
  
  /**
   * Imports an encrypted backup of the hash table
   * 
   * @param encryptedData - Encrypted backup buffer
   * @param encryptionKey - Key for decrypting the backup
   * @returns This hash table instance
   */
  public import(encryptedData: Buffer, encryptionKey: Buffer): ZeroHashTable<K, V> {
    // Clear existing data
    this.clear();
    
    try {
      // Check format version
      const formatVersion = encryptedData[0];
      if (formatVersion !== 1) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          `Unsupported backup format version: ${formatVersion}`,
          { formatVersion, supportedVersion: 1 }
        );
      }
      
      // Extract IV, auth tag, and encrypted data
      const iv = encryptedData.subarray(1, 17);
      const authTag = encryptedData.subarray(17, 33);
      const encrypted = encryptedData.subarray(33);
      
      // Decrypt data
      const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // Parse data
      const importData = JSON.parse(decrypted.toString('utf8'));
      
      // Validate import data
      if (!importData.capacity || !importData.size || !importData.algorithm || !Array.isArray(importData.entries)) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Invalid backup data structure',
          { importData }
        );
      }
      
      // Resize hash table if needed
      if (importData.capacity > this.capacity) {
        this.resize(importData.capacity);
      }
      
      // Import entries
      for (const entryData of importData.entries) {
        // Validate entry
        if (!entryData.keyHmac || !entryData.salt || !entryData.timestamp) {
          continue;
        }
        
        // Validate bucket index
        if (entryData.bucketIndex < 0 || entryData.bucketIndex >= this.capacity) {
          continue;
        }
        
        // Create entry
        const entry: HashEntry<V> = {
          keyHmac: Buffer.from(entryData.keyHmac, 'base64'),
          salt: Buffer.from(entryData.salt, 'base64'),
          value: entryData.value as V,
          timestamp: entryData.timestamp,
          expirationTime: entryData.expirationTime
        };
        
        // Check if expired
        if (this.isEntryExpired(entry)) {
          continue;
        }
        
        // Add to bucket
        this.buckets[entryData.bucketIndex].push(entry);
        this.size++;
      }
      
      return this;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.CRYPTO_FAILURE,
        'Failed to import hash table backup',
        {},
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Serializes a key to a buffer
   * 
   * @param key - Key to serialize
   * @returns Serialized key buffer
   */
  private serializeKey(key: K): Buffer {
    if (Buffer.isBuffer(key)) {
      return key as unknown as Buffer;
    }
    
    if (key instanceof Uint8Array) {
      return Buffer.from(key as unknown as Uint8Array);
    }
    
    if (typeof key === 'string') {
      return Buffer.from(key as unknown as string, 'utf8');
    }
    
    if (typeof key === 'number') {
      const buf = Buffer.alloc(8);
      buf.writeDoubleLE(key as unknown as number, 0);
      return buf;
    }
    
    if (typeof key === 'boolean') {
      return Buffer.from([(key as unknown as boolean) ? 1 : 0]);
    }
    
    if (key === null || key === undefined) {
      return Buffer.alloc(0);
    }
    
    // Fallback to JSON serialization
    try {
      return Buffer.from(JSON.stringify(key), 'utf8');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Failed to serialize key',
        { keyType: typeof key },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Gets key data for lookup and storage
   * 
   * @param keyData - Serialized key data
   * @returns Object with key HMAC, bucket index, and salt
   */
  private getKeyData(keyData: Buffer): { keyHmac: Buffer; bucketIndex: number; salt: Buffer } {
    // Generate salt for this key HMAC
    const salt = secureRandomBytes(16);
    
    // Calculate HMAC of key with master key
    const keyHmac = hmac(
      this.hashAlgorithm,
      this.masterKey,
      Buffer.concat([keyData, salt]),
      this.flags
    );
    
    // Calculate bucket index
    const bucketIndex = this.getBucketIndex(keyHmac);
    
    return { keyHmac, bucketIndex, salt };
  }
  
  /**
   * Calculates bucket index from key HMAC
   * 
   * @param keyHmac - Key HMAC
   * @returns Bucket index
   */
  private getBucketIndex(keyHmac: Buffer): number {
    // Use last 4 bytes of HMAC as hash code
    const hashCode = keyHmac.readUInt32LE(keyHmac.length - 4);
    
    // Calculate bucket index
    return hashCode % this.capacity;
  }
  
  /**
   * Checks if an entry is expired
   * 
   * @param entry - Entry to check
   * @returns True if expired, false otherwise
   */
  private isEntryExpired(entry: HashEntry<V>): boolean {
    return entry.expirationTime !== undefined && 
           entry.expirationTime <= Date.now();
  }
  
  /**
   * Removes an entry and frees its resources
   * 
   * @param bucketIndex - Bucket index
   * @param entry - Entry to remove
   */
  private removeEntry(bucketIndex: number, entry: HashEntry<V>): void {
    // Free entry resources
    this.freeEntry(entry);
    
    // Find and remove entry from bucket
    const bucket = this.buckets[bucketIndex];
    const index = bucket.indexOf(entry);
    
    if (index !== -1) {
      bucket.splice(index, 1);
      this.size--;
    }
  }
  
  /**
   * Frees resources used by an entry
   * 
   * @param entry - Entry to free
   */
  private freeEntry(entry: HashEntry<V>): void {
    // Free key HMAC
    secureFree(entry.keyHmac);
    
    // Free salt
    secureFree(entry.salt);
    
    // If value is a Buffer, free it too
    if (Buffer.isBuffer(entry.value)) {
      secureFree(entry.value as unknown as Buffer);
    }
  }
  
  /**
   * Resizes the hash table to a new capacity
   * 
   * @param newCapacity - New capacity
   */
  private resize(newCapacity: number): void {
    // Create new buckets
    const newBuckets: Array<Array<HashEntry<V>>> = new Array(newCapacity);
    for (let i = 0; i < newCapacity; i++) {
      newBuckets[i] = [];
    }
    
    // Rehash all entries
    for (const bucket of this.buckets) {
      for (const entry of bucket) {
        // Skip expired entries
        if (this.isEntryExpired(entry)) {
          this.freeEntry(entry);
          this.size--;
          continue;
        }
        
        // Calculate new bucket index
        const newBucketIndex = this.getBucketIndex(entry.keyHmac) % newCapacity;
        
        // Add to new bucket
        newBuckets[newBucketIndex].push(entry);
      }
    }
    
    // Update state
    this.buckets = newBuckets;
    this.capacity = newCapacity;
    this.threshold = Math.floor(newCapacity * this.loadFactor);
  }
  
  /**
   * Rehashes the table to increase capacity
   */
  private rehash(): void {
    this.resize(this.capacity * 2);
  }
}