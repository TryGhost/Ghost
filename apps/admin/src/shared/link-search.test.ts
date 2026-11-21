import { describe, expect, it } from 'vitest';
import { isLinkablePost, isLinkableUrl, matchesWords } from './link-search';

describe('matchesWords', () => {
  it('matches every word in any order, ignoring case', () => {
    expect(matchesWords('Sale for spring', 'spring sale')).toBe(true);
    expect(matchesWords('Sale for spring', 'SPRING')).toBe(true);
  });

  it('matches words inside other words', () => {
    expect(matchesWords('/spring-sale/', 'spring sale')).toBe(true);
    expect(matchesWords('Weekly news', 'eekl')).toBe(true);
  });

  it('excludes text missing any word', () => {
    expect(matchesWords('Sale for spring', 'spring sale today')).toBe(false);
  });

  it('ignores extra whitespace around and between words', () => {
    expect(matchesWords('Sale for spring', '  spring \t sale  ')).toBe(true);
  });

  it('matches anything for a blank term', () => {
    expect(matchesWords('Sale for spring', '')).toBe(true);
    expect(matchesWords('Sale for spring', '   ')).toBe(true);
  });
});

describe('isLinkableUrl', () => {
  it('accepts a URL that resolves', () => {
    expect(isLinkableUrl('https://example.com/about/')).toBe(true);
  });

  it.each([undefined, null, '', 'https://example.com/404/'])('rejects %s', (url) => {
    expect(isLinkableUrl(url)).toBe(false);
  });
});

describe('isLinkablePost', () => {
  it('accepts published content with a URL that resolves', () => {
    expect(isLinkablePost({ status: 'published', url: 'https://example.com/hello/' })).toBe(true);
  });

  it.each([
    { status: 'draft', url: 'https://example.com/hello/' },
    { status: 'published', url: 'https://example.com/404/' },
    { status: 'published', url: null },
    { url: 'https://example.com/hello/' },
  ])('rejects %o', (entry) => {
    expect(isLinkablePost(entry)).toBe(false);
  });
});
