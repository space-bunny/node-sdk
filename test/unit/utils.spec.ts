import { parseContent, encapsulateContent, isNullOrUndefined, isDeepStrictEqual } from '../../src/utils';

describe('utils', () => {
  describe('parseContent', () => {
    it('should parse valid JSON string', () => {
      const result = parseContent('{"key":"value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return string for invalid JSON', () => {
      const result = parseContent('hello world');
      expect(result).toBe('hello world');
    });

    it('should parse Buffer content', () => {
      const buf = Buffer.from('{"key":"value"}');
      const result = parseContent(buf);
      expect(result).toEqual({ key: 'value' });
    });

    it('should return string for non-JSON Buffer', () => {
      const buf = Buffer.from('plain text');
      const result = parseContent(buf);
      expect(result).toBe('plain text');
    });
  });

  describe('encapsulateContent', () => {
    it('should stringify JSON objects', () => {
      const result = encapsulateContent({ key: 'value' });
      expect(result).toBe('{"key":"value"}');
    });

    it('should handle nested objects', () => {
      const result = encapsulateContent({ a: { b: 1 } });
      expect(JSON.parse(result)).toEqual({ a: { b: 1 } });
    });
  });

  describe('isNullOrUndefined', () => {
    it('should return true for null', () => {
      expect(isNullOrUndefined(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isNullOrUndefined(undefined)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isNullOrUndefined('')).toBe(false);
    });

    it('should return false for 0', () => {
      expect(isNullOrUndefined(0)).toBe(false);
    });

    it('should return false for false', () => {
      expect(isNullOrUndefined(false)).toBe(false);
    });

    it('should return false for objects', () => {
      expect(isNullOrUndefined({})).toBe(false);
    });
  });

  describe('isDeepStrictEqual', () => {
    it('should return true for equal primitives', () => {
      expect(isDeepStrictEqual(1, 1)).toBe(true);
      expect(isDeepStrictEqual('a', 'a')).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(isDeepStrictEqual(1, 2)).toBe(false);
    });

    it('should return true for deeply equal objects', () => {
      expect(isDeepStrictEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
    });

    it('should return false for different objects', () => {
      expect(isDeepStrictEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should return false for different key counts', () => {
      expect(isDeepStrictEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('should return true for same reference', () => {
      const obj = { a: 1 };
      expect(isDeepStrictEqual(obj, obj)).toBe(true);
    });

    it('should return false when comparing null with object', () => {
      expect(isDeepStrictEqual(null, {})).toBe(false);
    });
  });
});
