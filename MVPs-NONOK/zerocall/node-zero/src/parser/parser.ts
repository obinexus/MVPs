// src/parser/parser.ts

import { FileFormat } from "./types/result.js";
import { TokenType, Token, ParseMode } from "./types/result.js";
import { ParserOptions } from "./types/result.js";
import { createSuccessResult, createErrorResult } from "./types/token.js";
import { ZeroError, ZeroErrorCode } from "../errors/index.js";
import { IZeroId, IZeroKey } from "../types/encoding.js";

/**
 * Output data structure combining ID and key
 */
export interface OutputData {
  id: IZeroId;
  key?: IZeroKey;
}

/**
 * Zero File Parser
 * Handles parsing of different Zero library file formats
 */
export class ZeroParser {
  /**
   * Parser configuration options
   */
  private options: ParserOptions;
  
  /**
   * Creates a new Zero file parser
   * 
   * @param options - Parser configuration options
   */
  constructor(options: Partial<ParserOptions> = {}) {
    this.options = {
      format: FileFormat.TEXT,
      mode: ParseMode.STRICT,
      encoding: 'utf8',
      skipUnknownFields: false,
      validateChecksums: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB default
      ...options
    };
  }

  /**
   * Identifies the format of the input data
   * 
   * @param input - Input data
   * @returns Detected file format
   */
  public identifyFormat(input: Buffer | string): FileFormat {
    // If it's a buffer, check for binary format
    if (Buffer.isBuffer(input)) {
      // Check for binary format markers
      if (input.length >= 4) {
        // Check for common binary signatures
        const firstFourBytes = input.readUInt32BE(0);
        
        // Specific binary format signature for Zero library
        // This signature is a magic number specific to Zero library binary files
        if ((firstFourBytes & 0xFFFF0000) === 0x5A4B0000) { // 'ZK' magic number
          return FileFormat.BINARY;
        }
        
        // Additional binary format checks could be added here
        // For example, checking specific header structures
      }
      
      // Convert to string for further checks
      const str = input.toString('utf8', 0, Math.min(100, input.length));
      return this.identifyFormatFromString(str);
    } else {
      return this.identifyFormatFromString(input);
    }
  }

  /**
   * Identifies the format from a string sample
   * 
   * @param input - Input string
   * @returns Detected file format
   */
  private identifyFormatFromString(input: string): FileFormat {
      // Trim and limit input for processing
  const trimmedInput = input.trim().slice(0, 500);

  // Check for Zero Identity File text format first (most specific)
  if (trimmedInput.includes('# Zero Identity File') || 
      trimmedInput.includes('# Zero Key File')) {
    return FileFormat.TEXT;
  }
  
  // Then check other formats
  if ((trimmedInput.startsWith('{') && trimmedInput.includes(':')) || 
      (trimmedInput.startsWith('[') && trimmedInput.includes('{'))) {
    try {
      JSON.parse(trimmedInput.toLowerCase());
      return FileFormat.JSON;
    } catch {
      // If parsing fails, continue to other format checks
    }
  }
    
    // 2. Base64 Format Detection
    // More strict Base64 validation
    if (
      /^[A-Za-z0-9+/=]+$/.test(trimmedInput) && 
      trimmedInput.length % 4 === 0 && 
      trimmedInput.replace(/=/g, '').length % 4 === 0
    ) {
      try {
        // Attempt to decode to validate
        Buffer.from(trimmedInput, 'base64');
        return FileFormat.BASE64;
      } catch {
        // If decoding fails, it's not valid Base64
      }
    }
    
    // 3. Compressed Format Detection
    // Check for common compression format signatures
    if (
      trimmedInput.startsWith('PK') ||  // ZIP
      trimmedInput.startsWith('Rar!') ||  // RAR
      trimmedInput.startsWith('H4sI')  // GZIP base64 encoded
    ) {
      return FileFormat.COMPRESSED;
    }
    
    // 4. Default to TEXT format
    // Ensure it's a readable text format
   // Default to TEXT for any readable content
   if (/^[\x20-\x7E\n\r\t]+$/.test(trimmedInput)) {
    return FileFormat.TEXT;
  }
  
  return FileFormat.BINARY;
  }

  /**
   * Parses a ZID file content into an ID object
   * 
   * @param content - File content to parse
   * @param format - Format of the file (optional, auto-detect if not provided)
   * @returns Parsed ID and optionally embedded key
   */
  public parseZidFile(content: Buffer | string, format?: FileFormat): OutputData | null {
    try {
      // Auto-detect format if not provided
      const detectedFormat = format || this.identifyFormat(content);
      
      // Parse based on format
      switch (detectedFormat) {
        case FileFormat.TEXT:
          return this.parseTextFormat(content.toString());
        case FileFormat.JSON:
          return this.parseJsonFormat(content.toString());
        case FileFormat.BINARY:
          return this.parseBinaryFormat(Buffer.isBuffer(content) ? content : Buffer.from(content));
        default:
          throw new ZeroError(
            ZeroErrorCode.UNSUPPORTED_FEATURE,
            `Unsupported file format: ${detectedFormat}`,
            { detectedFormat }
          );
      }
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Failed to parse ZID file',
        { format: format || 'auto' },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Parses text format ZID file
   * 
   * @param content - Text content to parse
   * @returns Parsed ID and optionally embedded key
   */
  private parseTextFormat(content: string): OutputData {
    // Split into lines and process section by section
    const lines = content.split(/\r?\n/);
    
    // Initialize ID and key objects
    const result: OutputData = {
      id: {
        version: 1,
        hash: Buffer.alloc(0),
        salt: Buffer.alloc(0)
      }
    };
    
    // Track if we're parsing ID or key section
    let parsingKey = false;
    
    // Process each line
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (trimmedLine.length === 0) continue;
      
      // Check for section markers
      if (trimmedLine.startsWith('# Zero Key File')) {
        parsingKey = true;
        
        if (!result.key) {
          result.key = {
            hash: Buffer.alloc(0),
            timestamp: Date.now()
          };
        }
        
        continue;
      }
      
      // Continue if comment line not marking a section
      if (trimmedLine.startsWith('#')) continue;
      
      // Process key-value pairs
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        
        if (parsingKey) {
          this.parseKeyProperty(key, value, result);
        } else {
          this.parseIdProperty(key, value, result);
        }
      }
    }
    
    // Validate parsed data
    this.validateParsedData(result);
    
    return result;
  }

  /**
   * Parses a property for the ID object
   * 
   * @param key - Property key
   * @param value - Property value
   * @param result - Result object being built
   */
  private parseIdProperty(key: string, value: string, result: OutputData): void {
    switch (key) {
      case 'version':
        result.id.version = parseInt(value, 10);
        break;
      case 'hash':
        result.id.hash = Buffer.from(value, 'hex');
        result.id.hashSize = result.id.hash.length;
        break;
      case 'salt':
        result.id.salt = Buffer.from(value, 'hex');
        result.id.saltSize = result.id.salt.length;
        break;
      default:
        if (!this.options.skipUnknownFields) {
          throw new ZeroError(
            ZeroErrorCode.INVALID_FORMAT,
            `Unknown ID property: ${key}`,
            { key, value }
          );
        }
    }
  }

  /**
   * Parses a property for the Key object
   * 
   * @param key - Property key
   * @param value - Property value
   * @param result - Result object being built
   */
  private parseKeyProperty(key: string, value: string, result: OutputData): void {
    if (!result.key) {
      result.key = {
        hash: Buffer.alloc(0),
        timestamp: Date.now()
      };
    }
    
    switch (key) {
      case 'hash':
        result.key.hash = Buffer.from(value, 'hex');
        result.key.hashSize = result.key.hash.length;
        break;
      case 'timestamp':
        result.key.timestamp = parseInt(value, 10);
        break;
      case 'expires':
      case 'expiration':
      case 'expirationtime':
        result.key.expirationTime = parseInt(value, 10);
        break;
      default:
        if (!this.options.skipUnknownFields) {
          throw new ZeroError(
            ZeroErrorCode.INVALID_FORMAT,
            `Unknown key property: ${key}`,
            { key, value }
          );
        }
    }
  }

  /**
   * Parses JSON format ZID file
   * 
   * @param content - JSON content to parse
   * @returns Parsed ID and optionally embedded key
   */
  private parseJsonFormat(content: string): OutputData {
    try {
      const jsonData = JSON.parse(content);
      
      const result: OutputData = {
        id: {
          version: 1,
          hash: Buffer.alloc(0),
          salt: Buffer.alloc(0)
        }
      };
      
      // Parse ID properties
      if (jsonData.id) {
        // Direct ID object reference
        if (jsonData.id.version) {
          result.id.version = jsonData.id.version;
        }
        
        if (jsonData.id.hash) {
          result.id.hash = Buffer.from(jsonData.id.hash, 'hex');
          result.id.hashSize = result.id.hash.length;
        }
        
        if (jsonData.id.salt) {
          result.id.salt = Buffer.from(jsonData.id.salt, 'hex');
          result.id.saltSize = result.id.salt.length;
        }
      } else {
        // Direct properties
        if (jsonData.version) {
          result.id.version = jsonData.version;
        }
        
        if (jsonData.hash) {
          result.id.hash = Buffer.from(jsonData.hash, 'hex');
          result.id.hashSize = result.id.hash.length;
        }
        
        if (jsonData.salt) {
          result.id.salt = Buffer.from(jsonData.salt, 'hex');
          result.id.saltSize = result.id.salt.length;
        }
      }
      
      // Parse key properties
      if (jsonData.key) {
        result.key = {
          hash: Buffer.alloc(0),
          timestamp: Date.now()
        };
        
        if (jsonData.key.hash) {
          result.key.hash = Buffer.from(jsonData.key.hash, 'hex');
          result.key.hashSize = result.key.hash.length;
        }
        
        if (jsonData.key.timestamp) {
          result.key.timestamp = jsonData.key.timestamp;
        }
        
        if (jsonData.key.expirationTime) {
          result.key.expirationTime = jsonData.key.expirationTime;
        }
      }
      
      // Validate parsed data
      this.validateParsedData(result);
      
      return result;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Failed to parse JSON ZID file',
        { content: content.substring(0, 100) },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Parses binary format ZID file
   * 
   * @param content - Binary content to parse
   * @returns Parsed ID and optionally embedded key
   */
  private parseBinaryFormat(content: Buffer): OutputData {
    // Check header magic bytes (ZK)
    if (content.length < 8 || content.readUInt16BE(0) !== 0x5A4B) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Invalid binary ZID file (missing magic header)',
        { header: content.slice(0, 4) }
      );
    }
    
    const result: OutputData = {
      id: {
        version: 1,
        hash: Buffer.alloc(0),
        salt: Buffer.alloc(0)
      }
    };
    
    try {
      // Read version (2 bytes)
      result.id.version = content.readUInt16BE(2);
      
      // Read flags (2 bytes)
      const flags = content.readUInt16BE(4);
      
      // Check if the file contains a key
      const hasKey = (flags & 0x0001) !== 0;
      
      // Read hash size (2 bytes)
      const hashSize = content.readUInt16BE(6);
      
      // Read salt size (2 bytes)
      const saltSize = content.readUInt16BE(8);
      
      // Calculate offsets
      let offset = 10; // Header size
      
      // Read hash
      result.id.hash = Buffer.from(content.slice(offset, offset + hashSize));
      result.id.hashSize = hashSize;
      offset += hashSize;
      
      // Read salt
      result.id.salt = Buffer.from(content.slice(offset, offset + saltSize));
      result.id.saltSize = saltSize;
      offset += saltSize;
      
      // If file contains a key, read it
      if (hasKey && offset < content.length) {
        result.key = {
          hash: Buffer.alloc(0),
          timestamp: 0
        };
        
        // Read key hash size (2 bytes)
        const keyHashSize = content.readUInt16BE(offset);
        offset += 2;
        
        // Read key hash
        result.key.hash = Buffer.from(content.slice(offset, offset + keyHashSize));
        result.key.hashSize = keyHashSize;
        offset += keyHashSize;
        
        // Read timestamp (8 bytes)
        result.key.timestamp = Number(content.readBigUInt64BE(offset));
        offset += 8;
        
        // Read expiration time if present (8 bytes)
        if (offset + 8 <= content.length) {
          result.key.expirationTime = Number(content.readBigUInt64BE(offset));
        }
      }
      
      // Validate parsed data
      this.validateParsedData(result);
      
      return result;
    } catch (err) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Failed to parse binary ZID file',
        { contentLength: content.length },
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Validates parsed data structure
   * 
   * @param data - Parsed data to validate
   * @throws ZeroError if data is invalid
   */
  private validateParsedData(data: OutputData): void {
    // Validate ID
    if (!data.id) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Missing ID data in parsed file',
        { data }
      );
    }
    
    if (!data.id.version || data.id.version < 1) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Invalid or missing version in ID data',
        { version: data.id.version }
      );
    }
    
    if (!data.id.hash || data.id.hash.length === 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Missing hash in ID data',
        { hashLength: data.id.hash?.length }
      );
    }
    
    if (!data.id.salt || data.id.salt.length === 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Missing salt in ID data',
        { saltLength: data.id.salt?.length }
      );
    }
    
    // Validate key if present
    if (data.key) {
      if (!data.key.hash || data.key.hash.length === 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Missing hash in key data',
          { hashLength: data.key.hash?.length }
        );
      }
      
      if (!data.key.timestamp || data.key.timestamp <= 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_FORMAT,
          'Invalid or missing timestamp in key data',
          { timestamp: data.key.timestamp }
        );
      }
    }
  }

  /**
   * Creates a tokenizer for parsing ZID files
   * 
   * @param content - Content to tokenize
   * @returns Array of tokens
   */
  private tokenizeContent(content: string): Token[] {
    const tokens: Token[] = [];
    const lines = content.split(/\r?\n/);
    
    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (trimmedLine.length === 0 || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        continue;
      }
      
      // Check for key-value pairs
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        
        // Determine token type based on key
        const tokenType = this.getTokenTypeForKey(key);
        
        tokens.push({
          type: tokenType,
          value: value,
          position: colonIndex + 1,
          length: value.length,
          raw: trimmedLine,
          line: lineNumber,
          column: colonIndex + 1
        });
      } else {
        // Check for sections (e.g., "[Key]")
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
          const section = trimmedLine.substring(1, trimmedLine.length - 1).trim().toLowerCase();
          
          tokens.push({
            type: section === 'key' ? TokenType.KEY : TokenType.UNKNOWN,
            value: section,
            position: 0,
            length: trimmedLine.length,
            raw: trimmedLine,
            line: lineNumber,
            column: 0
          });
        } else {
          // Unknown line format
          tokens.push({
            type: TokenType.UNKNOWN,
            value: trimmedLine,
            position: 0,
            length: trimmedLine.length,
            raw: trimmedLine,
            line: lineNumber,
            column: 0
          });
        }
      }
    }
    
    return tokens;
  }

  /**
   * Determines token type based on key name
   * 
   * @param key - Key name
   * @returns Corresponding token type
   */
  private getTokenTypeForKey(key: string): TokenType {
    switch (key) {
      case 'version':
        return TokenType.VERSION;
      case 'hash':
        return TokenType.HASH;
      case 'salt':
        return TokenType.SALT;
      case 'timestamp':
        return TokenType.TIMESTAMP;
      case 'expires':
      case 'expiration':
      case 'expirationtime':
        return TokenType.METADATA;
      default:
        return TokenType.UNKNOWN;
    }
  }

  /**
   * Serializes data to a specific format
   * 
   * @param data - Data to serialize
   * @param format - Output format
   * @returns Serialized content
   */
  public serializeData(data: OutputData, format: FileFormat): Buffer | string {
    // Validate data before attempting to serialize
    if (!data || !data.id) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'Cannot serialize null or undefined data',
        { data }
      );
    }

    // Validate required ID fields
    if (!data.id.hash || data.id.hash.length === 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT, 
        'ID hash is required',
        { data }
      );
    }

    if (!data.id.salt || data.id.salt.length === 0) {
      throw new ZeroError(
        ZeroErrorCode.INVALID_ARGUMENT,
        'ID salt is required',
        { data }
      );
    }

    // Set default version if missing
    if (typeof data.id.version !== 'number') {
      data.id.version = 1;
    }

    // Validate key if present
    if (data.key) {
      if (!data.key.hash || data.key.hash.length === 0) {
        throw new ZeroError(
          ZeroErrorCode.INVALID_ARGUMENT,
          'Key hash is required when key is present',
          { data }
        );
      }

      if (!data.key.timestamp) {
        data.key.timestamp = Date.now();
      }
    }

    switch (format) {
      case FileFormat.TEXT:
        return this.serializeToText(data);
      case FileFormat.JSON:
        return this.serializeToJson(data);
      case FileFormat.BINARY:
        return this.serializeToBinary(data);
      default:
        throw new ZeroError(
          ZeroErrorCode.UNSUPPORTED_FEATURE,
          `Unsupported output format: ${format}`,
          { format }
        );
    }
  }

  /**
   * Serializes data to text format
   * 
   * @param data - Data to serialize
   * @returns Text representation
   */
  private serializeToText(data: OutputData): string {
    let result = '# Zero Identity File\n';
    
    // Write ID data
    result += `version: ${data.id.version}\n`;
    result += `hash: ${data.id.hash.toString('hex')}\n`;
    result += `salt: ${data.id.salt.toString('hex')}\n`;
    
    // Write key data if present
    if (data.key) {
      result += '\n# Zero Key File\n';
      result += `hash: ${data.key.hash.toString('hex')}\n`;
      result += `timestamp: ${data.key.timestamp}\n`;
      
      if (data.key.expirationTime) {
        result += `expires: ${data.key.expirationTime}\n`;
      }
    }
    
    return result;
  }

  /**
   * Serializes data to JSON format
   * 
   * @param data - Data to serialize
   * @returns JSON representation
   */
  private serializeToJson(data: OutputData): string {
    const jsonData: Record<string, any> = {
      id: {
        version: data.id.version,
        hash: data.id.hash.toString('hex'),
        salt: data.id.salt.toString('hex')
      }
    };
    
    if (data.key) {
      jsonData.key = {
        hash: data.key.hash.toString('hex'),
        timestamp: data.key.timestamp
      };
      
      if (data.key.expirationTime) {
        jsonData.key.expirationTime = data.key.expirationTime;
      }
    }
    
    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Serializes data to binary format
   * 
   * @param data - Data to serialize
   * @returns Binary representation
   */
  private serializeToBinary(data: OutputData): Buffer {
    // Calculate total size
    const hasKey = !!data.key;
    let totalSize = 10; // Header size (magic + version + flags + hash size + salt size)
    
    totalSize += data.id.hash.length; // Hash
    totalSize += data.id.salt.length; // Salt
    
    if (hasKey) {
      totalSize += 2; // Key hash size
      totalSize += data.key!.hash.length; // Key hash
      totalSize += 8; // Timestamp
      
      if (data.key!.expirationTime) {
        totalSize += 8; // Expiration time
      }
    }
    
    // Create buffer
    const buffer = Buffer.alloc(totalSize);
    
    // Write header
    buffer.writeUInt16BE(0x5A4B, 0); // Magic bytes 'ZK'
    buffer.writeUInt16BE(data.id.version, 2); // Version
    buffer.writeUInt16BE(hasKey ? 0x0001 : 0x0000, 4); // Flags
    buffer.writeUInt16BE(data.id.hash.length, 6); // Hash size
    buffer.writeUInt16BE(data.id.salt.length, 8); // Salt size
    
    // Write ID data
    let offset = 10;
    data.id.hash.copy(buffer, offset);
    offset += data.id.hash.length;
    
    data.id.salt.copy(buffer, offset);
    offset += data.id.salt.length;
    
    // Write key data if present
    if (hasKey) {
      buffer.writeUInt16BE(data.key!.hash.length, offset); // Key hash size
      offset += 2;
      
      data.key!.hash.copy(buffer, offset);
      offset += data.key!.hash.length;
      
      buffer.writeBigUInt64BE(BigInt(data.key!.timestamp), offset);
      offset += 8;
      
      if (data.key!.expirationTime) {
        buffer.writeBigUInt64BE(BigInt(data.key!.expirationTime), offset);
      }
    }
    
    return buffer;
  }
}
