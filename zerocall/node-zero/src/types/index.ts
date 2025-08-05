/**
 * Main type definitions export file
 * Re-exports all type definitions from the various type modules
 */

// Common types
export {
    SecureBuffer,
    CryptoFlags,
    IDisposable,
    IAsyncInitializable,
    IResult,
    ICloneOptions,
    ICloneable,
    IVersion,
    Timestamp
} from './common.js';

// Context types
export {
    IZeroContext,
    IZeroConfig,
    IZeroStatus,
    IZeroAllocator,
    IZeroMap,
    ContextFlags,
    isZeroConfig,
    isZeroContext,
    isZeroStatus,
    isZeroAllocator,
    isZeroMap,
    
} from './context.js';

// Crypto types
export {
    isHashAlgorithm,
    ISaltOptions,
    IKdfOptions,
    IHashContext,
    SignatureAlgorithm,
    ISignatureVerificationResult,
    SignatureVerificationStatus,
    KeyType,
    KeyUsage,
    IKeyMetadata,
    
} from './crypto.js';

// Encoding types
export {
    IZeroId,
    IZeroKey,
    IZeroData,
    EncodingAlgorithm,
    IEncodingOptions,
    IDerivedIdOptions,
    IKeyOptions,
    IZeroProof,
    IZkpOptions,
    IdSerializationFormat,
    KeySerializationFormat,
    IKeyValueStorage,
    IStorageOptions
} from './encoding.js';

// Error types
export {
    IZeroErrorInfo,
    ZeroResult,
    
    ZeroErrorCode
} from './error.js';
