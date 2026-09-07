import { describe, expect, it } from 'vitest';
import { formatUrlPreview } from './url-preview';

describe('formatUrlPreview', () => {
  it('drops the scheme and terminates both the host and the slug', () => {
    expect(formatUrlPreview('https://example.com', 'my-post')).toBe('example.com/my-post/');
  });

  it('keeps a subdirectory site without doubling its slash', () => {
    expect(formatUrlPreview('http://example.com/blog/', 'my-post')).toBe(
      'example.com/blog/my-post/',
    );
  });

  it('shows the site on its own until the post has a slug', () => {
    expect(formatUrlPreview('https://example.com/', '')).toBe('example.com/');
  });
});
