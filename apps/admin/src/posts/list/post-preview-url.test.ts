import {describe, expect, it} from 'vitest';
import {getPostPreviewUrl} from './post-preview-url';

/**
 * The shareable preview link for an unpublished post, ported from the
 * `previewUrl` computed in `apps/ember-admin/app/models/post.js`.
 *
 * Ember's own "Copy preview link" action does not use it — it copies `.url`,
 * the public permalink, which for a draft points at a page that does not exist
 * yet. That is a bug worth not porting; see the test at the bottom.
 */
describe('getPostPreviewUrl', () => {
    it('builds a /p/<uuid>/ link under the site url', () => {
        expect(getPostPreviewUrl({uuid: 'abc-123'}, 'https://example.com'))
            .toBe('https://example.com/p/abc-123/');
    });

    it('trims a trailing slash off the site url rather than doubling it', () => {
        expect(getPostPreviewUrl({uuid: 'abc-123'}, 'https://example.com/'))
            .toBe('https://example.com/p/abc-123/');
    });

    // A post that has never been saved has no uuid, so there is nothing to
    // preview. Ember returns '' here; an empty string is what the caller
    // checks, so a '/p/undefined/' link would be worse than useless.
    it('has no link for a post with no uuid', () => {
        expect(getPostPreviewUrl({}, 'https://example.com')).toBe('');
    });
});
