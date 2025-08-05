import { ZeroError } from '../../src/errors/ZeroError';
import { IZeroData } from '../../src/encoding';
import {
StringFlags,
safeConcat,
secureStringCompare,
secureSplit,
truncateString,
safeParseInt,
bufferToHex,
hexToBuffer,
maskSensitiveString,
normalizeDataValues,
padToLength,
fromBase64Url,
toBase64Url
} from '../../src/utils/strings';

describe('String Utilities', () => {
describe('safeConcat', () => {
    it('should concatenate strings within length limit', () => {
        expect(safeConcat('hello', ' world', 20)).toBe('hello world');
    });

    it('should throw error when result exceeds max length', () => {
        expect(() => safeConcat('hello', ' world', 8)).toThrow(ZeroError);
    });

    it('should handle empty strings', () => {
        expect(safeConcat('', '', 10)).toBe('');
        expect(safeConcat('test', '', 10)).toBe('test');
    });
});

describe('secureStringCompare', () => {
    it('should return true for identical strings', () => {
        expect(secureStringCompare('secret', 'secret')).toBe(true);
    });

    it('should return false for different strings', () => {
        expect(secureStringCompare('secret', 'Secret')).toBe(false);
        expect(secureStringCompare('secret', 'secrey')).toBe(false);
    });

    it('should handle empty strings', () => {
        expect(secureStringCompare('', '')).toBe(true);
    });

    it('should throw for non-string inputs', () => {
        expect(() => secureStringCompare(123 as any, 'test')).toThrow(ZeroError);
    });
});

describe('secureSplit', () => {
    it('should split string with basic delimiter', () => {
        expect(secureSplit('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should respect maxTokens limit', () => {
        expect(secureSplit('a,b,c,d', ',', 2)).toEqual(['a', 'b']);
    });

    it('should handle trim flag', () => {
        const result = secureSplit(' a , b , c ', ',', 10, StringFlags.TRIM);
        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty input', () => {
        expect(secureSplit('', ',')).toEqual([]);
    });
});

describe('truncateString', () => {
    it('should truncate string with ellipsis', () => {
        expect(truncateString('hello world', 8)).toBe('hello...');
    });

    it('should not truncate if within limit', () => {
        expect(truncateString('test', 10)).toBe('test');
    });

    it('should handle custom ellipsis', () => {
        expect(truncateString('hello world', 7, '..')).toBe('hello..');
    });
});

describe('safeParseInt', () => {
    it('should parse valid integers', () => {
        expect(safeParseInt('123')).toBe(123);
        expect(safeParseInt('-456')).toBe(-456);
    });

    it('should respect min/max bounds', () => {
        expect(safeParseInt('5', 0, 10)).toBe(5);
        expect(() => safeParseInt('15', 0, 10)).toThrow(ZeroError);
    });

    it('should handle default value', () => {
        expect(safeParseInt('invalid', 0, 100, 50)).toBe(50);
    });
});

describe('bufferToHex', () => {
    it('should convert buffer to hex string', () => {
        const buffer = Buffer.from([0x01, 0x02, 0xFF]);
        expect(bufferToHex(buffer)).toBe('0102ff');
    });

    it('should handle uppercase option', () => {
        const buffer = Buffer.from([0x01, 0x02, 0xFF]);
        expect(bufferToHex(buffer, true)).toBe('0102FF');
    });

    it('should add prefix when specified', () => {
        const buffer = Buffer.from([0xFF]);
        expect(bufferToHex(buffer, false, '0x')).toBe('0xff');
    });
});

describe('hexToBuffer', () => {
    it('should convert hex string to buffer', () => {
        const result = hexToBuffer('0102FF');
        expect(result).toEqual(Buffer.from([0x01, 0x02, 0xFF]));
    });

    it('should handle 0x prefix', () => {
        expect(hexToBuffer('0x0102')).toEqual(Buffer.from([0x01, 0x02]));
    });

    it('should throw on invalid hex', () => {
        expect(() => hexToBuffer('0102GG')).toThrow(ZeroError);
    });
});

describe('maskSensitiveString', () => {
    it('should mask middle portion of string', () => {
        expect(maskSensitiveString('1234567890', 2, 2)).toBe('12******90');
    });

    it('should handle short strings', () => {
        expect(maskSensitiveString('123', 2, 2)).toBe('***');
    });

    it('should use custom mask character', () => {
        expect(maskSensitiveString('1234567890', 2, 2, '#')).toBe('12######90');
    });
});

describe('normalizeDataValues', () => {
    it('should normalize data structure values', () => {
        const data: IZeroData = {
            keys: ['key1', 'key2'],
            values: [' value1 ', '', ' value3 '],
            count: 3
        };
        const normalized = normalizeDataValues(data);
        expect(normalized.values).toEqual(['value1', '', 'value3']);
    });
});
it('should round-trip correctly with specific examples', () => {
    // Known valid base64url strings and their binary representations
    const testCases = [
      'YWJjZA', // 'abcd'
      'YWJjZGU', // 'abcde'  
      'YWJjZGVm', // 'abcdef'
      'SGVsbG8gV29ybGQh', // 'Hello World!'
    ];
    
    for (const base64url of testCases) {
      const decoded = fromBase64Url(base64url);
      expect(toBase64Url(decoded)).toBe(base64url);
    }
  });

describe('Base64URL Conversion', () => {
    it('should convert between Buffer and Base64URL', () => {
        const original = Buffer.from('Hello World!');
        const base64url = toBase64Url(original);
        const decoded = fromBase64Url(base64url);
        expect(decoded).toEqual(original);
    });

    it('should handle special characters correctly', () => {
        const base64url = 'abc-_9';
        const decoded = fromBase64Url(base64url);
        expect(toBase64Url(decoded)).toBe(base64url);
    });
});

describe('padToLength', () => {
    it('should pad string to specified length', () => {
        expect(padToLength('test', 8)).toBe('test    ');
        expect(padToLength('test', 8, '_')).toBe('test____');
        expect(padToLength('test', 8, '_', false)).toBe('____test');
    });

    it('should not pad if string is already long enough', () => {
        expect(padToLength('testing', 5)).toBe('testing');
    });
});
});