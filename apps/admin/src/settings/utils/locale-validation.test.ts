import { validateLocale } from '@/settings/utils/locale-validation';

describe('validateLocale', function () {
  describe('valid locales', function () {
    it('accepts simple two-letter language codes', function () {
      const result = validateLocale('en');
      expect(result).toBeNull();
    });

    it('accepts three-letter language codes', function () {
      const result = validateLocale('eng');
      expect(result).toBeNull();
    });

    it('accepts language with region', function () {
      expect(validateLocale('en-US')).toBeNull();
      expect(validateLocale('pt-BR')).toBeNull();
      expect(validateLocale('zh-CN')).toBeNull();
    });

    it('accepts language with script', function () {
      expect(validateLocale('zh-Hans')).toBeNull();
      expect(validateLocale('zh-Hant')).toBeNull();
      expect(validateLocale('sr-Latn')).toBeNull();
    });

    it('accepts language with script and region', function () {
      expect(validateLocale('zh-Hans-CN')).toBeNull();
      expect(validateLocale('sr-Latn-RS')).toBeNull();
    });

    it('accepts private use tags', function () {
      expect(validateLocale('x-custom')).toBeNull();
      expect(validateLocale('x-private')).toBeNull();
    });

    it('accepts language with private use extension', function () {
      expect(validateLocale('en-x-custom')).toBeNull();
    });

    it('accepts numeric region codes', function () {
      expect(validateLocale('es-419')).toBeNull();
    });

    it('accepts variant subtags', function () {
      expect(validateLocale('sl-rozaj')).toBeNull();
      expect(validateLocale('de-CH-1901')).toBeNull();
    });

    it('is case-insensitive', function () {
      expect(validateLocale('EN')).toBeNull();
      expect(validateLocale('en-us')).toBeNull();
      expect(validateLocale('ZH-HANS')).toBeNull();
    });

    it('trims whitespace', function () {
      expect(validateLocale('  en  ')).toBeNull();
    });

    it('accepts grandfathered tags', function () {
      expect(validateLocale('i-klingon')).toBeNull();
      expect(validateLocale('zh-min-nan')).toBeNull();
      expect(validateLocale('en-GB-oed')).toBeNull();
    });
  });

  describe('invalid locales', function () {
    it('rejects empty strings', function () {
      const result = validateLocale('');
      expect(result).toBe('Enter a value');
    });

    it('rejects whitespace-only strings', function () {
      const result = validateLocale('   ');
      expect(typeof result).toBe('string');
    });

    it('rejects single character language codes', function () {
      const result = validateLocale('e');
      expect(typeof result).toBe('string');
    });

    it('rejects language codes longer than 3 characters', function () {
      const result = validateLocale('english');
      expect(typeof result).toBe('string');
    });

    it('rejects codes starting with hyphen', function () {
      const result = validateLocale('-en');
      expect(typeof result).toBe('string');
    });

    it('rejects codes ending with hyphen', function () {
      const result = validateLocale('en-');
      expect(typeof result).toBe('string');
    });

    it('rejects consecutive hyphens', function () {
      const result = validateLocale('en--US');
      expect(typeof result).toBe('string');
    });

    it('rejects invalid characters', function () {
      const result = validateLocale('en_US');
      expect(typeof result).toBe('string');
    });

    it('rejects special characters', function () {
      expect(validateLocale('en@US')).not.toBeNull();
      expect(validateLocale('en.US')).not.toBeNull();
      expect(validateLocale('en/US')).not.toBeNull();
    });

    it('rejects common English words', function () {
      expect(validateLocale('english')).not.toBeNull();
      expect(validateLocale('french')).not.toBeNull();
      expect(validateLocale('spanish')).not.toBeNull();
    });

    it('rejects private use prefix without subtag', function () {
      const result = validateLocale('x');
      expect(typeof result).toBe('string');
    });
  });
});
