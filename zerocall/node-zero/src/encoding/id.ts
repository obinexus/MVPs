/**
 * ID creation, encoding, and verification for the Zero library
 * 
 * Provides secure ID management with:
 * - Creation from input data with secure salting
 * - Verification against source data
 * - Derivation of specialized IDs for specific purposes
 * - String encoding/decoding with configurable formats
 * - ZKP (Zero-Knowledge Proof) operations
 */
import crypto from 'crypto';

import { ZeroContext } from '../context/ZeroContext';
import { IZeroId, IZeroKey, IZeroData, IDerivedIdOptions, isZeroData, IEncodingOptions, EncodingAlgorithm } from '../types/encoding';
import { CryptoFlags } from '../types/common';
import { ZeroError } from '../errors/ZeroError';
import { ZeroErrorCode } from '../types/error';
import { generateSalt, verifySalt } from '../crypto/salt';
import { hash, HashAlgorithm } from '../crypto/hash';
import { deriveKey, KdfAlgorithm } from '../crypto/kdf';
import { secureFree, constantTimeCompare } from '../utils/memory';
import { sortObjectKeys, normalizeDataValues } from '../utils/strings';
import { CRYPTO } from '../utils/constants';
import { createKey, verifyKey } from './key';

/**
 * Creates a new ID from input data
 * 
 * @param context - Library context
 * @param data - Source data for ID creation
 * @param options - Optional encoding options
 * @returns New secure ID
 * @throws ZeroError if data or parameters are invalid
 */
export function createId(
  context: ZeroContext,
  data: IZeroData, 
  options?: Partial<IEncodingOptions>
): IZeroId {
  if (!context) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context is required',
      { contextType: typeof context }
    );
  }
  
  if (!isZeroData(data)) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Invalid data structure',
      { data }
    );
  }
  
  // Apply default options using destructuring for cleaner initialization
  const opts: IEncodingOptions = {
    hashAlgorithm: options?.hashAlgorithm ?? HashAlgorithm.SHA512,
    saltLength: options?.saltLength ?? context.config.saltLength,
    flags: options?.flags ?? CryptoFlags.SECURE_MEMORY,
    algorithm: EncodingAlgorithm.BASE64
  };
  
  // Validate options
  validateEncodingOptions(opts);
  
  try {
    // Generate salt
    const salt = generateSalt({
      length: opts.saltLength,
      flags: opts.flags
    });
    
    // Create sorted and normalized data structure for consistent hashing
    const normalizedData = normalizeDataValues(data);
    const sortedData = sortObjectKeys(normalizedData);
    
    // Create concatenated data for hashing
    const dataBuffer = createDataBuffer(sortedData);
    
    // Calculate hash
    const dataHash = calculateIdHash(dataBuffer, salt, opts.hashAlgorithm!, opts.flags!);
    
    // Create ID structure
    const id: IZeroId = {
      version: context.config.version,  
      hash: dataHash,
      salt,
      hashSize: dataHash.length,
      saltSize: salt.length
    };
    
    // Track active ID
    context.incrementActiveIds();
    
    return id;
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to create ID',
      { dataKeys: data.keys },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies an ID against source data
 * 
 * @param context - Library context
 * @param id - ID to verify
 * @param key - Key for verification (optional)
 * @param data - Source data to verify against
 * @returns True if ID is valid, false otherwise
 * @throws ZeroError if parameters are invalid
 */
export function verifyId(
  context: ZeroContext,
  id: IZeroId,
  key: IZeroKey | null,
  data: IZeroData
): boolean {
  if (!context || !id || !data) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context, ID, and data are required',
      {
        hasContext: !!context,
        hasId: !!id,
        hasData: !!data
      }
    );
  }
  
  // If key provided, verify it first
  if (key) {
    const keyValid = verifyKey(context, key, id);
    if (!keyValid) {
      return false;
    }
  }
  
  try {
    // Create sorted and normalized data structure for consistent hashing
    const normalizedData = normalizeDataValues(data);
    const sortedData = sortObjectKeys(normalizedData);
    
    // Create concatenated data for hashing
    const dataBuffer = createDataBuffer(sortedData);
    
    // Calculate verification hash using ID's salt
    const verificationHash = calculateIdHash(
      dataBuffer,
      id.salt,
      getHashAlgorithmFromLength(id.hash.length),
      CryptoFlags.SECURE_MEMORY
    );
    
    // Compare hashes in constant time
    return constantTimeCompare(id.hash, verificationHash) === 0;
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.VERIFICATION_FAILED,
      'ID verification failed due to error',
      { idVersion: id.version },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Derives a new ID for a specific purpose from a base ID
 * 
 * @param context - Library context
 * @param baseId - Source ID to derive from
 * @param purpose - Purpose string (e.g., "auth", "payment")
 * @param options - Derivation options
 * @returns Derived ID
 * @throws ZeroError if parameters are invalid
 */
export function deriveId(
  context: ZeroContext,
  baseId: IZeroId,
  purpose: string,
  options?: Partial<IDerivedIdOptions>
): IZeroId {
  if (!context || !baseId || !purpose) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context, base ID, and purpose are required',
      {
        hasContext: !!context,
        hasBaseId: !!baseId,
        purpose
      }
    );
  }
  
  // Apply default options
  const opts: IDerivedIdOptions = {
    kdfAlgorithm: KdfAlgorithm.PBKDF2_HMAC_SHA512,
    hashAlgorithm: HashAlgorithm.SHA512,
    flags: CryptoFlags.SECURE_MEMORY,
    saltLength: context.config.saltLength,
    algorithm: EncodingAlgorithm.BASE64,
    ...options
  };
  
  try {
    // Generate salt for derived ID
    const salt = generateSalt({
      length: opts.saltLength,
      flags: opts.flags
    });
    
    // Prepare input for key derivation (baseId hash + purpose)
    const purposeBuffer = Buffer.from(purpose, 'utf8');
    const inputBuffer = Buffer.concat([baseId.hash, purposeBuffer]);
    
    // Derive hash using KDF
    const derivedHash = deriveKey(
      opts.kdfAlgorithm,
      inputBuffer,
      salt,
      undefined,
      opts.flags
    );
    
    // Create derived ID
    const derivedId: IZeroId = {
      version: baseId.version,
      hash: derivedHash,
      salt
    };
    
    // Track active ID
    context.incrementActiveIds();
    
    return derivedId;
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to derive ID',
      { purpose },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Converts an ID to string representation
 * 
 * @param context - Library context
 * @param id - ID to convert
 * @returns String representation of ID
 * @throws ZeroError if parameters are invalid
 */
export function idToString(context: ZeroContext, id: IZeroId): string {
  if (!context || !id) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context and ID are required',
      {
        hasContext: !!context,
        hasId: !!id
      }
    );
  }
  
  try {
    // Format: version.base64Hash.hexSalt
    const hashBase64 = id.hash.toString('base64');
    const saltHex = id.salt.toString('hex');
    
    return `${id.version}${context.config.separator}${hashBase64}${context.config.separator}${saltHex}`;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.ENCODING_FAILED,
      'Failed to convert ID to string',
      { idVersion: id.version },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Parses a string into an ID
 * 
 * @param context - Library context
 * @param str - String representation of ID
 * @returns Parsed ID
 * @throws ZeroError if string format is invalid
 */
export function idFromString(context: ZeroContext, str: string): IZeroId {
  if (!context || !str) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context and string are required',
      {
        hasContext: !!context,
        stringLength: str?.length
      }
    );
  }
  
  try {
    // Split by separator
    const parts = str.split(context.config.separator);
    if (parts.length !== 3) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        `Invalid ID format: expected 3 parts, got ${parts.length}`,
        { string: str, separator: context.config.separator }
      );
    }
    
    // Parse version
    const version = parseInt(parts[0], 10);
    if (isNaN(version) || version < 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        `Invalid version: ${parts[0]}`,
        { versionString: parts[0] }
      );
    }
    
    // Parse hash (base64)
    let hash: Buffer;
    try {
      hash = Buffer.from(parts[1], 'base64');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Invalid base64 hash',
        { hashString: parts[1] },
        err instanceof Error ? err : undefined
      );
    }
    
    // Parse salt (hex)
    let salt: Buffer;
    try {
      salt = Buffer.from(parts[2], 'hex');
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Invalid hex salt',
        { saltString: parts[2] },
        err instanceof Error ? err : undefined
      );
    }
    
    // Validate salt
    if (!verifySalt(salt)) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_HASH,
        'Salt verification failed',
        { saltLength: salt.length }
      );
    }
    
    return {
      version,
      hash,
      salt,
      hashSize: hash.length,
      saltSize: salt.length
    };
  } catch (err) {
    if (err instanceof ZeroError) {
      throw err;
    }
    
    throw new ZeroError(
      ZeroErrorCode.INVALID_FORMAT,
      'Failed to parse ID string',
      { string: str },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Creates a zero-knowledge proof for an ID
 * 
 * @param context - Library context
 * @param id - ID to create proof for
 * @param challenge - Challenge data for proof
 * @returns Zero-knowledge proof
 * @throws ZeroError if parameters are invalid
 */
export function createProof(
  context: ZeroContext,
  id: IZeroId,
  challenge: Buffer
): Buffer {
  if (!context || !id || !challenge) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context, ID, and challenge are required',
      {
        hasContext: !!context,
        hasId: !!id,
        challengeLength: challenge?.length
      }
    );
  }
  
  if (challenge.length < CRYPTO.CHALLENGE_SIZE) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      `Challenge must be at least ${CRYPTO.CHALLENGE_SIZE} bytes`,
      { challengeLength: challenge.length, requiredLength: CRYPTO.CHALLENGE_SIZE }
    );
  }
  
  try {
    // Create hash context for proof generation
    const hmacKey = crypto.createHash('sha256').update(id.salt).digest();
    
    // Calculate HMAC of the challenge using ID hash as key
    const hmacResult = crypto.createHmac('sha512', id.hash)
      .update(challenge)
      .update(hmacKey)
      .digest();
    
    return hmacResult;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.CRYPTO_FAILURE,
      'Failed to create proof',
      { idVersion: id.version },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Verifies a zero-knowledge proof
 * 
 * @param context - Library context
 * @param proof - Proof to verify
 * @param challenge - Challenge that proof was created for
 * @param id - ID that proof claims to be for
 * @returns True if proof is valid, false otherwise
 * @throws ZeroError if parameters are invalid
 */
export function verifyProof(
  context: ZeroContext,
  proof: Buffer,
  challenge: Buffer,
  id: IZeroId
): boolean {
  if (!context || !proof || !challenge || !id) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context, proof, challenge, and ID are required',
      {
        hasContext: !!context,
        proofLength: proof?.length,
        challengeLength: challenge?.length,
        hasId: !!id
      }
    );
  }
  
  try {
    // Recalculate expected proof
    const expectedProof = createProof(context, id, challenge);
    
    // Verify in constant time
    return constantTimeCompare(proof, expectedProof) === 0;
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.VERIFICATION_FAILED,
      'Proof verification failed',
      { idVersion: id.version },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Generates a random challenge for proof generation
 * 
 * @param context - Library context
 * @param size - Challenge size in bytes
 * @returns Random challenge buffer
 * @throws ZeroError if parameters are invalid
 */
export function generateChallenge(
  context: ZeroContext,
  size: number = CRYPTO.CHALLENGE_SIZE
): Buffer {
  if (!context) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Context is required',
      { contextType: typeof context }
    );
  }
  
  if (size < 16 || size > 128) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      'Challenge size must be between 16 and 128 bytes',
      { requestedSize: size }
    );
  }
  
  try {
    // Use secure random generation
    return crypto.randomBytes(size);
  } catch (err) {
    throw new ZeroError(
      ZeroErrorCode.RANDOM_SOURCE_FAILURE,
      'Failed to generate challenge',
      { size },
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Creates an ID and key pair from input data
 * 
 * @param context - Library context
 * @param data - Source data for ID creation
 * @param options - Optional encoding options
 * @returns Object containing ID and key
 * @throws ZeroError if data or parameters are invalid
 */
export function encodeId(
  context: ZeroContext,
  data: IZeroData,
  options?: Partial<IEncodingOptions>
): { id: IZeroId; key: IZeroKey } {
  // Create ID first
  const id = createId(context, data, options);
  
  // Then create verification key
  const key = createKey(context, id);
  
  return { id, key };
}

/**
 * Calculates hash for ID creation
 */
function calculateIdHash(
  data: Buffer,
  salt: Buffer,
  algorithm: HashAlgorithm,
  flags: CryptoFlags
): Buffer {
  // Create hash context
  const saltedData = Buffer.concat([salt, data]);
  
  // Calculate hash
  return hash(algorithm, saltedData, flags);
}

/**
 * Creates a buffer from data structure
 */
function createDataBuffer(data: IZeroData): Buffer {
  const buffers: Buffer[] = [];
  
  // For each key-value pair, create buffer
  for (let i = 0; i < data.keys.length; i++) {
    const keyBuffer = Buffer.from(data.keys[i], 'utf8');
    const valueBuffer = Buffer.from(data.values[i], 'utf8');
    
    buffers.push(keyBuffer);
    buffers.push(valueBuffer);
  }
  
  return Buffer.concat(buffers);
}

/**
 * Validates encoding options
 */
function validateEncodingOptions(options: IEncodingOptions): void {
  // Use null check for optional properties
  if (options.saltLength && (
    options.saltLength < CRYPTO.MIN_SALT_LENGTH || 
    options.saltLength > CRYPTO.MAX_SALT_LENGTH)
  ) {
    throw new ZeroError(
      ZeroErrorCode.INVALID_ARGUMENT,
      `Salt length must be between ${CRYPTO.MIN_SALT_LENGTH} and ${CRYPTO.MAX_SALT_LENGTH} bytes`,
      { 
        saltLength: options.saltLength, 
        minLength: CRYPTO.MIN_SALT_LENGTH, 
        maxLength: CRYPTO.MAX_SALT_LENGTH 
      }
    );
  }
}

/**
 * Gets hash algorithm based on hash length
 */
function getHashAlgorithmFromLength(length: number): HashAlgorithm {
  switch (length) {
    case 32:
      return HashAlgorithm.SHA256;
    case 48:
      return HashAlgorithm.SHA384;
    case 64:
      return HashAlgorithm.SHA512;
    default:
      throw new ZeroError(
        ZeroErrorCode.INVALID_HASH,
        `Unsupported hash length: ${length}`,
        { hashLength: length, supportedLengths: [32, 48, 64] }
      );
  }
}

/**
 * Cleans up an ID, freeing secure memory
 * 
 * @param context - Library context
 * @param id - ID to clean up
 */
export function freeId(context: ZeroContext, id: IZeroId): void {
  if (!context || !id) {
    return;
  }
  
  try {
    if (id.hash) {
      secureFree(id.hash, id.hash.length);
    }
    
    if (id.salt) {
      secureFree(id.salt, id.salt.length);
    }
    
    context.decrementActiveIds();
  } catch (err) {
    // Swallow errors during cleanup
    console.error('Error during ID cleanup:', err);
  }
}