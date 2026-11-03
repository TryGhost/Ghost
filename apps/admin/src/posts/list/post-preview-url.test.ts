import { describe, expect, it } from 'vitest';
import { getPostPreviewUrl } from './post-preview-url';

/**
 * The shareable preview link for an unpublished post.
 */
describe('getPostPreviewUrl', () => {
  it('builds a /p/<uuid>/ link under the site url', () => {
    expect(getPostPreviewUrl({ uuid: 'abc-123' }, 'https://example.com')).toBe(
      'https://example.com/p/abc-123/',
    );
  });

  it('trims a trailing slash off the site url rather than doubling it', () => {
    expect(getPostPreviewUrl({ uuid: 'abc-123' }, 'https://example.com/')).toBe(
      'https://example.com/p/abc-123/',
    );
  });

  // A post that has never been saved has no uuid, so there is nothing to
  // preview. An empty string is what the caller checks, so a '/p/undefined/'
  // link would be worse than useless.
  it('has no link for a post with no uuid', () => {
    expect(getPostPreviewUrl({}, 'https://example.com')).toBe('');
  });
});
