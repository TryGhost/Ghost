import { describe, expect, it } from 'vitest';
import {
  SERP_DESCRIPTION_PLACEHOLDER,
  characterCount,
  metaDescriptionPlaceholder,
  seoDescription,
  seoTitle,
  seoUrl,
  serpDate,
  serpDescription,
  serpTitle,
  truncate,
} from './meta-data-fields';

describe('characterCount', () => {
  it('counts a multibyte character once', () => {
    expect(characterCount('a𝔘b')).toBe(3);
  });

  it('counts nothing in an empty field', () => {
    expect(characterCount('')).toBe(0);
  });
});

describe('truncate', () => {
  it('leaves a value the ellipsis would still fit inside', () => {
    expect(truncate('a'.repeat(57), 60)).toBe('a'.repeat(57));
  });

  it('spends the last three characters on the ellipsis', () => {
    expect(truncate('a'.repeat(58), 60)).toBe(`${'a'.repeat(57)}...`);
  });

  it('counts whole Unicode characters without splitting a surrogate pair', () => {
    expect(truncate('😀'.repeat(57), 60)).toBe('😀'.repeat(57));
    expect(truncate('😀'.repeat(58), 60)).toBe(`${'😀'.repeat(57)}...`);
  });
});

describe('seoTitle', () => {
  it('prefers the meta title', () => {
    expect(seoTitle('Meta', 'Title')).toBe('Meta');
  });

  it('falls back to the post title', () => {
    expect(seoTitle('', 'Title')).toBe('Title');
  });

  it('falls back to the untitled placeholder', () => {
    expect(seoTitle('', '')).toBe('(Untitled)');
  });
});

describe('seoDescription', () => {
  it('prefers the meta description', () => {
    expect(seoDescription('Meta', 'Excerpt')).toBe('Meta');
  });

  it('falls back to the custom excerpt', () => {
    expect(seoDescription('', 'Excerpt')).toBe('Excerpt');
  });

  it('has nothing to fall back to without either', () => {
    expect(seoDescription('', '')).toBe('');
  });
});

describe('seoUrl', () => {
  it('reads the host and the slug off the site', () => {
    expect(seoUrl({ siteUrl: 'https://example.com/', slug: 'a-post', canonicalUrl: '' })).toBe(
      'example.com › a-post',
    );
  });

  it('keeps a subdirectory site’s path segments', () => {
    expect(seoUrl({ siteUrl: 'https://example.com/blog/', slug: 'a-post', canonicalUrl: '' })).toBe(
      'example.com › blog › a-post',
    );
  });

  it('replaces the whole address with the canonical URL', () => {
    expect(
      seoUrl({
        siteUrl: 'https://example.com/',
        slug: 'a-post',
        canonicalUrl: 'https://elsewhere.com/syndicated/story',
      }),
    ).toBe('elsewhere.com › syndicated › story');
  });

  it('shows nothing for a canonical URL it cannot parse', () => {
    expect(
      seoUrl({ siteUrl: 'https://example.com/', slug: 'a-post', canonicalUrl: 'nonsense' }),
    ).toBe('');
  });
});

describe('serpTitle', () => {
  it('truncates to what a result shows', () => {
    expect(serpTitle('a'.repeat(80))).toBe(`${'a'.repeat(57)}...`);
  });
});

describe('serpDescription', () => {
  it('truncates the description a result shows', () => {
    expect(serpDescription('a'.repeat(200))).toBe(`${'a'.repeat(146)}...`);
  });

  it('explains itself when there is no description', () => {
    expect(serpDescription('')).toBe(SERP_DESCRIPTION_PLACEHOLDER);
  });
});

describe('metaDescriptionPlaceholder', () => {
  it('truncates further than the result does', () => {
    expect(metaDescriptionPlaceholder('a'.repeat(200))).toBe(`${'a'.repeat(147)}...`);
  });
});

describe('serpDate', () => {
  it('pads the day and shortens the month', () => {
    expect(serpDate(new Date(2026, 8, 7))).toBe('07 Sep 2026');
  });
});
