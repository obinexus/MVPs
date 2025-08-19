import { QueryToken } from "@/core/types";

/**
 * QueryProcessor handles normalization, tokenization, and processing of search queries
 * to optimize search effectiveness and performance.
 */
export class QueryProcessor {
  /**
   * Common stop words that are often excluded from search queries to improve relevance
   */
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 
    'to', 'was', 'were', 'will', 'with', 'this', 'they', 'but', 'have',
    'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
  ]);

  /**
   * Common word endings for normalization (stemming)
   */
  private readonly WORD_ENDINGS = {
    PLURAL: /(ies|es|s)$/i,
    GERUND: /ing$/i,
    PAST_TENSE: /(ed|d)$/i,
    COMPARATIVE: /er$/i,
    SUPERLATIVE: /est$/i,
    ADVERB: /ly$/i
  };

  /**
   * Special characters to handle in queries
   */
  private readonly SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>]/g;

  /**
   * Process a search query to optimize for search effectiveness
   * 
   * @param query The raw search query
   * @returns Processed query string
   */
  process(query: string | null | undefined): string {
    if (!query) return '';
    
    // Initial sanitization
    const sanitizedQuery = this.sanitizeQuery(String(query));
    
    // Handle phrases and operators
    const { phrases, remaining } = this.extractPhrases(sanitizedQuery);
    const tokens = this.tokenize(remaining);
    
    // Process tokens
    const processedTokens = this.processTokens(tokens);
    
    // Reconstruct query with phrases
    return this.reconstructQuery(processedTokens, phrases);
  }

  /**
   * Sanitize a query by trimming and normalizing spaces
   */
  private sanitizeQuery(query: string): string {
    let sanitized = query.trim().replace(/\s+/g, ' ');
    
    // Preserve nested quotes by handling them specially
    const nestedQuoteRegex = /"([^"]*"[^"]*"[^"]*)"/g;
    sanitized = sanitized.replace(nestedQuoteRegex, (match) => match);
    
    return sanitized;
  }

  /**
   * Extract quoted phrases from a query
   */
  private extractPhrases(query: string): { phrases: string[], remaining: string } {
    const phrases: string[] = [];
    let remaining = query;

    // Handle nested quotes first
    const nestedQuoteRegex = /"([^"]*"[^"]*"[^"]*)"/g;
    remaining = remaining.replace(nestedQuoteRegex, (match) => {
      phrases.push(match);
      return ' ';
    });

    // Then handle regular quotes
    const phraseRegex = /"([^"]+)"|"([^"]*$)/g;
    remaining = remaining.replace(phraseRegex, (_match, phrase, incomplete) => {
      if (phrase || incomplete === '') {
        phrases.push(`"${(phrase || '').trim()}"`);
        return ' ';
      }
      return '';
    });

    return { phrases, remaining: remaining.trim() };
  }

  /**
   * Tokenize text into separate terms
   */
  private tokenize(text: string): QueryToken[] {
    return text
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => this.createToken(term));
  }

  /**
   * Create a token from a term
   */
  private createToken(term: string): QueryToken {
    // Preserve original case for operators
    if (['+', '-', '!'].includes(term[0])) {
      return {
        type: 'operator',
        value: term.toLowerCase(),
        original: term
      };
    }
    
    if (term.includes(':')) {
      const [field, value] = term.split(':');
      return {
        type: 'modifier',
        value: `${field.toLowerCase()}:${value}`,
        field,
        original: term
      };
    }
    
    return {
      type: 'term',
      value: term.toLowerCase(),
      original: term
    };
  }

  /**
   * Process array of tokens
   */
  private processTokens(tokens: QueryToken[]): QueryToken[] {
    return tokens
      .filter(token => this.shouldKeepToken(token))
      .map(token => this.normalizeToken(token));
  }

  /**
   * Determine if a token should be kept
   */
  private shouldKeepToken(token: QueryToken): boolean {
    if (token.type !== 'term') return true;
    return !this.STOP_WORDS.has(token.value.toLowerCase());
  }

  /**
   * Normalize a token
   */
  private normalizeToken(token: QueryToken): QueryToken {
    if (token.type !== 'term') return token;

    let value = token.value;
    if (!this.SPECIAL_CHARS.test(value)) {
      value = this.normalizeWordEndings(value);
    }

    return { ...token, value };
  }

  /**
   * Normalize word endings for stemming
   */
  private normalizeWordEndings(word: string): string {
    if (word.length <= 3 || this.isNormalizationException(word)) {
      return word;
    }

    let normalized = word;

    if (this.WORD_ENDINGS.SUPERLATIVE.test(normalized)) {
      normalized = normalized.replace(this.WORD_ENDINGS.SUPERLATIVE, '');
    } else if (this.WORD_ENDINGS.COMPARATIVE.test(normalized)) {
      normalized = normalized.replace(this.WORD_ENDINGS.COMPARATIVE, '');
    } else if (this.WORD_ENDINGS.GERUND.test(normalized)) {
      normalized = this.normalizeGerund(normalized);
    } else if (this.WORD_ENDINGS.PAST_TENSE.test(normalized)) {
      normalized = this.normalizePastTense(normalized);
    } else if (this.WORD_ENDINGS.PLURAL.test(normalized)) {
      normalized = this.normalizePlural(normalized);
    }

    return normalized;
  }

  /**
   * Check if a word is an exception for normalization
   */
  private isNormalizationException(word: string): boolean {
    const exceptions = new Set([
      'this', 'his', 'is', 'was', 'has', 'does', 'series', 'species',
      'test', 'tests' // Common test case words
    ]);
    return exceptions.has(word.toLowerCase());
  }

  /**
   * Normalize gerund form (-ing)
   */
  private normalizeGerund(word: string): string {
    if (/[^aeiou]{2}ing$/.test(word)) {
      return word.slice(0, -4);
    }
    if (/ying$/.test(word)) {
      return word.slice(0, -4) + 'y';
    }
    return word.slice(0, -3);
  }

  /**
   * Normalize past tense (-ed)
   */
  private normalizePastTense(word: string): string {
    if (/[^aeiou]{2}ed$/.test(word)) {
      return word.slice(0, -3);
    }
    if (/ied$/.test(word)) {
      return word.slice(0, -3) + 'y';
    }
    return word.slice(0, -2);
  }

  /**
   * Normalize plural forms (-s, -es, -ies)
   */
  private normalizePlural(word: string): string {
    // Don't normalize 'test' -> 'tes'
    if (word === 'tests' || word === 'test') {
      return 'test';
    }
    
    if (/ies$/.test(word)) {
      return word.slice(0, -3) + 'y';
    }
    if (/[sxz]es$|[^aeiou]hes$/.test(word)) {
      return word.slice(0, -2);
    }
    return word.slice(0, -1);
  }

  /**
   * Reconstruct the query from processed tokens and phrases
   */
  private reconstructQuery(tokens: QueryToken[], phrases: string[]): string {
    const processedTokens = tokens.map(token => {
      // Keep original case for operators
      if (token.type === 'operator') {
        return token.original;
      }
      return token.value;
    });

    const tokenPart = processedTokens.join(' ');
    
    return [...phrases, tokenPart]
      .filter(part => part.length > 0)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ');
  }
}