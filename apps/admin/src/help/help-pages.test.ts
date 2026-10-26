import { describe, expect, it } from 'vitest';
import { getPageKey, PAGE_ARTICLES, PAGE_LABELS, PAGE_TOPICS } from './help-pages';

describe('getPageKey', () => {
  it.each([
    ['/posts', 'posts'],
    ['/editor/post/123', 'editor'],
    ['/members-activity', 'members'],
    ['/settings/newsletters', 'newsletters'],
    ['/settings/stripe-connect', 'membership'],
    ['/settings/announcement-bar/edit', 'design'],
    ['/settings/general', 'settings'],
    ['/activitypub/inbox', 'network'],
    ['/pro/billing', 'ghost-pro'],
    ['/', 'home'],
  ])('maps %s to %s', (pathname, page) => {
    expect(getPageKey(pathname)).toBe(page);
  });
});

describe('pages', () => {
  it('each have a label, topics and fallback articles', () => {
    expect(Object.keys(PAGE_TOPICS).sort()).toEqual(Object.keys(PAGE_LABELS).sort());
    expect(Object.keys(PAGE_ARTICLES).sort()).toEqual(Object.keys(PAGE_LABELS).sort());
  });
});
