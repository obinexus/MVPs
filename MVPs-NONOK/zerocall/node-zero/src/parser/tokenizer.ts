import { ZeroError, ZeroErrorCode } from "@/errors";
import { Token, TokenType} from "./types/result";

/**
 * Command options for 'challenge' command
 */
export interface ChallengeCommandOptions {
  output: string;
  size?: string;
  verbose?: boolean;
}

/**
 * Command options for 'sign' command
 */
export interface SignCommandOptions {
  input: string;
  key: string;
  id?: string;
  output: string;
  verbose?: boolean;
}

export interface VerifyCommandOptions {
  input: string;
  key: string;
  id?: string;
  verbose?: boolean;
}

/**
 * Command options for 'verify-proof' command
 */
export interface VerifyProofCommandOptions {
  input: string;
  challenge: string;
  id: string;
  verbose?: boolean;
}

export interface ProveCommandOptions {
  input: string;
  proof: string;
  challenge: string;
  output: string;
  format: string;
  verbose?: boolean;
}

/**
 * Command options for 'info' command
 */
export interface InfoCommandOptions {
  verbose?: boolean;
}

/**
 * Command options for 'derive' command
 */
export interface DeriveCommandOptions {
  input: string;
  purpose: string;
  output?: string;
  algorithm?: string;
  format?: string;
  network?: string;
  verbose?: boolean;
  withKey?: boolean;
}
/**
 * Command options for 'create' command
 */
export interface CreateCommandOptions {
  input: string;
  output?: string;
  salt?: string;
  algorithm?: string;
  format?: string;
  verbose?: boolean;
}

/**
 * Tokenizer interface for breaking down input into tokens
 */
export interface ITokenizer {
  /**
   * Tokenizes input content
   * 
   * @param content - Content to tokenize
   * @returns Array of tokens
   */
  tokenize(content: string | Buffer): Token[];
  
  /**
   * Resets the tokenizer state
   */
  reset(): void;
  
  /**
   * Returns the current tokens
   * 
   * @returns Array of extracted tokens
   */
  getTokens(): Token[];
  
  /**
   * Checks if tokenization is complete
   * 
   * @returns True if tokenization is complete
   */
  isDone(): boolean;
}
export class Tokenizer implements ITokenizer {
  /**
   * Current tokens extracted from content
   */
  private tokens: Token[] = [];
  
  /**
   * Current cursor position
   */
  private position: number = 0;
  
  /**
   * Current line number
   */
  private line: number = 1;
  
  /**
   * Current column number
   */
  private column: number = 1;
  
  /**
   * Whether tokenization is complete
   */
  private done: boolean = false;

  /**
   * Tokenizes input content
   * 
   * @param content - Content to tokenize
   * @returns Array of tokens
   */
  public tokenize(content: string | Buffer): Token[] {
    // Reset state
    this.reset();
    
    // Convert buffer to string if needed
    const input = typeof content === 'string' ? content : content.toString('utf8');
    
    // Special case for empty content
    if (input.length === 0) {
      return [];
    }
    
    try {
      // Split into lines for line-based processing
      const lines = input.split(/\r?\n/);
      
      // Process each line
      for (const line of lines) {
        this.tokenizeLine(line);
        this.line++;
        this.column = 1;
      }
      
      this.done = true;
      return this.tokens;
    } catch (err) {
      if (err instanceof ZeroError) {
        throw err;
      }
      
      throw new ZeroError(
        ZeroErrorCode.INVALID_FORMAT,
        'Failed to tokenize content',
        { contentLength: input.length },
        err instanceof Error ? err : undefined
      );
    }
  }
  
  /**
   * Resets the tokenizer state
   */
  public reset(): void {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.done = false;
  }

  /**
   * Returns the current tokens
   * 
   * @returns Array of extracted tokens
   */
  public getTokens(): Token[] {
    return this.tokens;
  }
  
  /**
   * Checks if tokenization is complete
   * 
   * @returns True if tokenization is complete
   */
  public isDone(): boolean {
    return this.done;
  }
  
  /**
   * Processes a single line of content
   * 
   * @param line - Line content
   */
  private tokenizeLine(line: string): void {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (trimmedLine.length === 0) {
      return;
    }
    
    // Process comments
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
      this.addToken(TokenType.COMMENT, trimmedLine, this.position, trimmedLine.length);
      return;
    }
    
    // Check for section headers like [Key]
    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      const section = trimmedLine.substring(1, trimmedLine.length - 1).trim();
      let tokenType = TokenType.UNKNOWN;
      
      // Map section names to token types
      switch (section.toLowerCase()) {
        case 'key':
          tokenType = TokenType.KEY;
          break;
        case 'id':
          tokenType = TokenType.METADATA;
          break;
        case 'proof':
          tokenType = TokenType.PROOF;
          break;
        case 'challenge':
          tokenType = TokenType.CHALLENGE;
          break;
        case 'metadata':
          tokenType = TokenType.METADATA;
          break;
      }
      
      this.addToken(tokenType, section, this.position, trimmedLine.length);
      return;
    }
    
    // Process key-value pairs
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();
      
      // Determine token type based on key
      const tokenType = this.getTokenTypeForKey(key);
      
      // Add token
      this.addToken(
        tokenType,
        value,
        this.position + colonIndex + 1,
        value.length,
        trimmedLine
      );
    } else {
      // Unknown format, add as unknown token
      this.addToken(TokenType.UNKNOWN, trimmedLine, this.position, trimmedLine.length);
    }
  }
  
  /**
   * Adds a token to the tokens array
   * 
   * @param type - Token type
   * @param value - Token value
   * @param position - Token position
   * @param length - Token length
   * @param raw - Raw token content
   */
  private addToken(
    type: TokenType,
    value: any,
    position: number,
    length: number,
    raw?: string
  ): void {
    this.tokens.push({
      type,
      value,
      position,
      length,
      raw,
      line: this.line,
      column: this.column
    });
  }
  
  /**
   * Determines token type based on key name
   * 
   * @param key - Key name
   * @returns Corresponding token type
   */
  private getTokenTypeForKey(key: string): TokenType {
    switch (key.toLowerCase()) {
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
      case 'checksum':
        return TokenType.CHECKSUM;
      case 'challenge':
        return TokenType.CHALLENGE;
      case 'proof':
        return TokenType.PROOF;
      default:
        return TokenType.UNKNOWN;
    }
  }
}

// Re-export the command option interfaces from the original file
export interface ChallengeCommandOptions {
  output: string;
  size?: string;
  verbose?: boolean;
}

export interface SignCommandOptions {
  input: string;
  key: string;
  id?: string;
  output: string;
  verbose?: boolean;
}

export interface VerifyCommandOptions {
  input: string;
  key: string;
  id?: string;
  verbose?: boolean;
}

export interface VerifyProofCommandOptions {
  input: string;
  challenge: string;
  id: string;
  verbose?: boolean;
}

export interface ProveCommandOptions {
  input: string;
  proof: string;
  challenge: string;
  output: string;
  format: string;
  verbose?: boolean;
}

export interface InfoCommandOptions {
  verbose?: boolean;
}

export interface DeriveCommandOptions {
  input: string;
  purpose: string;
  output?: string;
  algorithm?: string;
  format?: string;
  verbose?: boolean;
}

export interface CreateCommandOptions {
  input: string;
  output?: string;
  salt?: string;
  algorithm?: string;
  format?: string;
  verbose?: boolean;
}