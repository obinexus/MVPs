import { HashAlgorithm } from '@/crypto';
import crypto from 'crypto';

/**
 * Shared constants for the Zero library
 * These values are used across multiple modules for consistent behavior
 */

/**
 * Memory-related constants
 */
export const MEMORY = {
    /**
     * Default memory page size in bytes (4KB)
     * Used for memory alignment and buffer size calculations
     */
    PAGE_SIZE: 4096,
    
    /**
     * Default allocation alignment in bytes
     */
    ALIGNMENT: 16,
    
    /**
     * Canary size in bytes for buffer overflow detection
     */
    CANARY_SIZE: 16,
    
    /**
     * Magic number for memory block validation
     * Used to detect memory corruption
     */
    BLOCK_MAGIC: 0xFEE01234,
    
    /**
     * Pattern used for secure memory wiping (multi-pass)
     * Values are applied in sequence for thorough wiping
     */
    WIPE_PATTERNS: [0x00, 0xFF, 0xAA, 0x55, 0xF0, 0x0F],
    
    /**
     * Number of milliseconds to keep memory marked as sensitive
     */
    SENSITIVE_TTL: 5 * 60 * 1000,
    
    /**
     * Maximum size for stack allocations before using heap
     */
    MAX_STACK_ALLOC: 1024
};
  
/**
 * Cryptographic constants
 */
export const CRYPTO = {
    /**
     * Default salt length in bytes
     */
    DEFAULT_SALT_LENGTH: 32,
    
    /**
     * Minimum acceptable salt length in bytes
     */
    MIN_SALT_LENGTH: 16,

    /**
     * Default algorithm for password hashing
     * Used for key derivation and password storage
     * Must be a supported algorithm by the platform
     * @see https://nodejs.org/api/crypto.html#crypto_crypto_gethashes
     */
    DEFAULT_ALGORITHM: 'sha512' as HashAlgorithm,
    
    /**
     * Maximum acceptable salt length in bytes
     */
    MAX_SALT_LENGTH: 64,
    
    /**
     * Default hash output size in bytes (SHA-256)
     */
    DEFAULT_HASH_SIZE: 32,
    
    /**
     * Challenge size in bytes for ZKP operations
     */
    CHALLENGE_SIZE: 32,
    
    /**
     * Default proof size in bytes for ZKP operations
     */
    DEFAULT_PROOF_SIZE: 64,
    
    /**
     * Key derivation function default parameters
     */
    KDF: {
        /**
         * Default iterations for PBKDF2
         */
        DEFAULT_ITERATIONS: 600000,
        
        /**
         * Default memory size for memory-hard KDFs (in KB)
         */
        DEFAULT_MEMORY_SIZE: 64 * 1024,
        
        /**
         * Default parallelism factor
         */
        DEFAULT_PARALLELISM: 4,
        
        /**
         * Default output length in bytes
         */
        DEFAULT_OUTPUT_LENGTH: 32,
        
        /**
         * Recommended minimum iterations for PBKDF2
         */
        MIN_ITERATIONS: 310000,
        
        /**
         * Recommended minimum memory for Argon2 (in KB)
         */
        MIN_MEMORY_SIZE: 32 * 1024
    },
    
    /**
     * Signature algorithm constants
     */
    SIGNATURE: {
        /**
         * Default signature algorithm
         */
        DEFAULT_ALGORITHM: 'ed25519',
        
        /**
         * Supported signature algorithms
         */
        SUPPORTED_ALGORITHMS: ['ed25519', 'secp256k1', 'rsa-pss'],
        
        /**
         * Default RSA key size in bits
         */
        DEFAULT_RSA_KEY_SIZE: 3072,
        
        /**
         * ED25519 signature size in bytes
         */
        ED25519_SIGNATURE_SIZE: 64,
        
        /**
         * SECP256K1 signature size in bytes (r, s, v)
         */
        SECP256K1_SIGNATURE_SIZE: 65
    },
    
    /**
     * Hash algorithm constants
     */
    HASH: {
        /**
         * Default hash algorithm
         */
        DEFAULT_ALGORITHM: 'sha512',
        
        /**
         * Supported hash algorithms
         */
        SUPPORTED_ALGORITHMS: ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-512'],
        
        /**
         * Output sizes in bytes for each algorithm
         */
        OUTPUT_SIZES: {
            'sha256': 32,
            'sha384': 48,
            'sha512': 64,
            'sha3-256': 32,
            'sha3-512': 64
        }
    },
    
    /**
     * HMAC constants
     */
    HMAC: {
        /**
         * Default HMAC algorithm
         */
        DEFAULT_ALGORITHM: 'sha512',
        
        /**
         * Minimum key size in bytes
         */
        MIN_KEY_SIZE: 32
    },
    
    /**
     * Entropy-related constants
     */
    ENTROPY: {
        /**
         * Size of entropy pool in bytes
         */
        POOL_SIZE: 1024,
        
        /**
         * Entropy pool refresh interval in milliseconds (10 minutes)
         */
        REFRESH_INTERVAL: 10 * 60 * 1000,
        
        /**
         * Minimum entropy required for cryptographic operations (bits)
         */
        MIN_REQUIRED_BITS: 256
    }
};
  
/**
 * String encoding constants
 */
export const ENCODING = {
    /**
     * Default separator character for ID representation
     */
    DEFAULT_SEPARATOR: '.',
    
    /**
     * Default encoding alphabet size (Base62)
     */
    DEFAULT_ENCODING_SIZE: 62,
    
    /**
     * Standard Base64 alphabet
     */
    BASE64_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    
    /**
     * URL-safe Base64 alphabet
     */
    BASE64URL_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
    
    /**
     * Hexadecimal alphabet
     */
    HEX_ALPHABET: '0123456789abcdef',
    
    /**
     * Base58 alphabet (Bitcoin-style, no similar-looking characters)
     */
    BASE58_ALPHABET: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
    
    /**
     * Base32 alphabet (RFC 4648)
     */
    BASE32_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
    
    /**
     * Standard padding character
     */
    PADDING_CHAR: '=',
    
    /**
     * Maximum allowed data structure size
     */
    MAX_DATA_SIZE: 1024 * 1024,
    
    /**
     * Maximum key length for key-value pairs
     */
    MAX_KEY_LENGTH: 256,
    
    /**
     * Maximum value length for key-value pairs
     */
    MAX_VALUE_LENGTH: 8192,
    
    /**
     * Characters requiring escaping in string representations
     */
    ESCAPE_CHARS: {
        '.': '\\.',
        '\\': '\\\\',
        ':': '\\:',
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t'
    },
    
    /**
     * Encoding formats
     */
    FORMATS: {
        TEXT: 'text',
        JSON: 'json',
        BINARY: 'binary',
        HEX: 'hex',
        BASE64: 'base64',
        BASE64URL: 'base64url'
    }
};
  
/**
 * Version information
 */
export const VERSION = {
    /**
     * Current protocol version
     */
    CURRENT: 1,
    
    /**
     * Minimum supported version
     */
    MIN_SUPPORTED: 1,
    
    /**
     * Maximum supported version
     */
    MAX_SUPPORTED: 1,
    
    /**
     * Library version
     */
    LIBRARY: '1.0.0',
    
    /**
     * Library build timestamp
     */
    BUILD_TIMESTAMP: '2025-02-25T12:00:00Z',
    
    /**
     * Version compatibility matrix
     */
    COMPATIBILITY: {
        1: {
            minLibraryVersion: '1.0.0',
            maxLibraryVersion: '1.9.9',
            features: ['basic', 'zkp']
        }
    }
};
  
/**
 * System-related constants
 */
export const SYSTEM = {
    /**
     * Whether secure memory operations are available
     * Determined by platform capabilities
     */
    HAS_SECURE_MEMORY: (
        typeof process !== 'undefined' && 
        process.version !== undefined && 
        typeof crypto !== 'undefined' && 
        typeof crypto.randomBytes === 'function'
    ),
    
    /**
     * Whether constant-time operations are required
     * Always true for cryptographic libraries
     */
    REQUIRE_CONSTANT_TIME: true,
    
    /**
     * Maximum buffer size for automatic allocation (16MB)
     * Prevents excessive memory allocation
     */
    MAX_AUTO_BUFFER_SIZE: 16 * 1024 * 1024,
    
    /**
     * Default timeout for operations in milliseconds
     */
    DEFAULT_TIMEOUT: 30000,
    
    /**
     * Maximum number of concurrent operations
     */
    MAX_CONCURRENCY: 4,
    
    /**
     * Maximum stack depth for recursive operations
     */
    MAX_STACK_DEPTH: 100,
    
    /**
     * Exit codes for CLI
     */
    EXIT_CODES: {
        SUCCESS: 0,
        GENERAL_ERROR: 1,
        INVALID_ARGUMENT: 2,
        IO_ERROR: 3,
        CRYPTO_ERROR: 4,
        PERMISSION_DENIED: 5,
        TIMEOUT: 6
    },
    
    /**
     * Default log levels
     */
    LOG_LEVELS: {
        NONE: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4,
        TRACE: 5
    },
    
    /**
     * Current platform information
     */
    PLATFORM: {
        IS_NODE: typeof process !== 'undefined' && process.versions && process.versions.node,
        IS_BROWSER: typeof window !== 'undefined' && typeof window.document !== 'undefined',
        IS_WORKER: typeof self !== 'undefined' && typeof self.importScripts === 'function',
        VERSION: typeof process !== 'undefined' ? process.version : 'unknown'
    }
};
  
/**
 * Time constants
 */
export const TIME = {
    /**
     * Milliseconds in a second
     */
    SECOND_MS: 1000,
    
    /**
     * Milliseconds in a minute
     */
    MINUTE_MS: 60 * 1000,
    
    /**
     * Milliseconds in an hour
     */
    HOUR_MS: 60 * 60 * 1000,
    
    /**
     * Milliseconds in a day
     */
    DAY_MS: 24 * 60 * 60 * 1000,
    
    /**
     * Milliseconds in a week
     */
    WEEK_MS: 7 * 24 * 60 * 60 * 1000,
    
    /**
     * Milliseconds in a 30-day month (approximation)
     */
    MONTH_MS: 30 * 24 * 60 * 60 * 1000,
    
    /**
     * Milliseconds in a 365-day year (approximation)
     */
    YEAR_MS: 365 * 24 * 60 * 60 * 1000,
    
    /**
     * Default key expiration time (90 days in milliseconds)
     */
    DEFAULT_KEY_EXPIRATION_MS: 90 * 24 * 60 * 60 * 1000,
    
    /**
     * Default token expiration time (1 hour in milliseconds)
     */
    DEFAULT_TOKEN_EXPIRATION_MS: 60 * 60 * 1000,
    
    /**
     * Default challenge expiration time (5 minutes in milliseconds)
     */
    DEFAULT_CHALLENGE_EXPIRATION_MS: 5 * 60 * 1000,
    
    /**
     * Default proof expiration time (15 minutes in milliseconds)
     */
    DEFAULT_PROOF_EXPIRATION_MS: 15 * 60 * 1000,
    
    /**
     * Default session expiration time (24 hours in milliseconds)
     */
    DEFAULT_SESSION_EXPIRATION_MS: 24 * 60 * 60 * 1000,
    
    /**
     * ISO date format string
     */
    ISO_DATE_FORMAT: 'YYYY-MM-DDTHH:mm:ss.sssZ'
};

/**
 * Network-related constants
 */
export const NETWORK = {
    /**
     * Default request timeout in milliseconds
     */
    DEFAULT_TIMEOUT_MS: 30000,
    
    /**
     * Maximum retry attempts
     */
    MAX_RETRIES: 3,
    
    /**
     * Base delay between retries in milliseconds
     */
    RETRY_BASE_DELAY_MS: 1000,
    
    /**
     * Maximum delay between retries in milliseconds
     */
    MAX_RETRY_DELAY_MS: 10000,
    
    /**
     * Default HTTP headers
     */
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `zero-library/${VERSION.LIBRARY}`
    },
    
    /**
     * Default ports
     */
    DEFAULT_PORTS: {
        HTTP: 80,
        HTTPS: 443
    },
    
    /**
     * Default batch size for network operations
     */
    DEFAULT_BATCH_SIZE: 50,
    
    /**
     * Rate limiting constants
     */
    RATE_LIMIT: {
        /**
         * Default requests per minute
         */
        DEFAULT_RPM: 60,
        
        /**
         * Default concurrent requests
         */
        DEFAULT_CONCURRENCY: 5,
        
        /**
         * Default burst size (requests allowed to exceed rate temporarily)
         */
        DEFAULT_BURST: 10
    }
};

/**
 * ZKP (Zero-Knowledge Proof) constants
 */
export const ZKP = {
    /**
     * Default protocol version
     */
    PROTOCOL_VERSION: 1,
    
    /**
     * Challenge size in bytes
     */
    CHALLENGE_SIZE: 32,
    
    /**
     * Response size in bytes
     */
    RESPONSE_SIZE: 64,
    
    /**
     * Minimum security level in bits
     */
    MIN_SECURITY_BITS: 128,
    
    /**
     * Round constants
     */
    ROUNDS: {
        /**
         * Minimum number of interactive rounds
         */
        MIN_INTERACTIVE: 20,
        
        /**
         * Recommended number of interactive rounds
         */
        RECOMMENDED_INTERACTIVE: 40,
        
        /**
         * High-security number of interactive rounds
         */
        HIGH_SECURITY_INTERACTIVE: 80
    },
    
    /**
     * Supported proof types
     */
    PROOF_TYPES: {
        SCHNORR: 'schnorr',
        CHAUM_PEDERSEN: 'chaum-pedersen',
        SIGMA: 'sigma'
    }
};

/**
 * File handling constants
 */
export const FILE = {
    /**
     * Default file permissions (octal)
     */
    DEFAULT_MODE: 0o600,
    
    /**
     * Maximum file size in bytes (16MB)
     */
    MAX_SIZE: 16 * 1024 * 1024,
    
    /**
     * Default file encoding
     */
    DEFAULT_ENCODING: 'utf8',
    
    /**
     * File formats
     */
    FORMATS: {
        TEXT: 'text',
        JSON: 'json',
        BINARY: 'binary'
    },
    
    /**
     * Temporary file prefix
     */
    TEMP_PREFIX: 'zero-tmp-',
    
    /**
     * File extensions by type
     */
    EXTENSIONS: {
        ID: '.zid',
        KEY: '.zkey',
        CHALLENGE: '.zch',
        PROOF: '.zprf',
        CONFIG: '.zconf',
        DATA: '.zdata'
    }
};

/**
 * Environment constants
 */
export const ENV = {
    /**
     * Check if code is running in browser environment
     */
    IS_BROWSER: typeof window !== 'undefined' && 
                typeof window.document !== 'undefined',
    
    /**
     * Check if code is running in web worker environment
     */
    IS_WORKER: typeof self !== 'undefined' && 
               typeof self.importScripts === 'function',
               
    /**
     * Check if code is running in Node.js environment
     */
    IS_NODE: typeof process !== 'undefined' && 
             process.versions != null && 
             process.versions.node != null,
             
    /**
     * Check if we're running in a development environment
     */
    IS_DEV: process.env.NODE_ENV === 'development',
    
    /**
     * Check if we're running in a production environment
     */
    IS_PROD: process.env.NODE_ENV === 'production',
    
    /**
     * Check if we're running in a test environment
     */
    IS_TEST: process.env.NODE_ENV === 'test'
};