import { describe, expect, it } from 'vitest';
import { getPostActionMessage } from './post-action-messages';

/**
 * The toast wording, ported from the `messages` table and `#getToastMessage` in
 * `apps/ember-admin/app/components/posts-list/context-menu.js`.
 *
 * Pinned in tests because these strings are the only feedback a bulk action
 * gives, they differ between one row and many in ways that aren't guessable,
 * and one of them is deliberately wrong (see below).
 */

describe('getPostActionMessage', () => {
  describe('one post', () => {
    it.each([
      ['deleted', 'Post deleted'],
      ['unpublished', 'Post reverted to a draft'],
      ['unscheduled', 'Post unscheduled'],
      ['accessUpdated', 'Post access updated'],
      ['duplicated', 'Post duplicated'],
      ['tagsAdded', 'Tags added'],
      ['tagAdded', 'Tag added'],
    ] as const)('%s', (action, expected) => {
      expect(getPostActionMessage(action, { count: 1, resource: 'posts' })).toBe(expected);
    });
  });

  describe('several posts', () => {
    it.each([
      ['deleted', '3 posts deleted'],
      ['unpublished', '3 posts reverted to drafts'],
      ['unscheduled', '3 posts unscheduled'],
      ['duplicated', '3 posts duplicated'],
      ['tagsAdded', 'Tags added to 3 posts'],
      ['tagAdded', 'Tag added to 3 posts'],
    ] as const)('%s', (action, expected) => {
      expect(getPostActionMessage(action, { count: 3, resource: 'posts' })).toBe(expected);
    });

    // The odd one out: this one leads with the capitalised type rather than
    // the count, so it reads "Post access updated for 3 posts".
    it('accessUpdated leads with the type, not the count', () => {
      expect(getPostActionMessage('accessUpdated', { count: 3, resource: 'posts' })).toBe(
        'Post access updated for 3 posts',
      );
    });
  });

  describe('pages', () => {
    it('uses the page noun, capitalised where the string leads with it', () => {
      expect(getPostActionMessage('deleted', { count: 1, resource: 'pages' })).toBe('Page deleted');
      expect(getPostActionMessage('deleted', { count: 4, resource: 'pages' })).toBe(
        '4 pages deleted',
      );
    });

    /**
     * Ember hardcodes "Post link copied" and "Preview link copied" with no
     * interpolation, so copying a *page* link still says "Post". Ported
     * as-is rather than quietly corrected: it is a visible string, and
     * changing it here would make the two implementations disagree while
     * the flag is still switchable.
     */
    it('still says "Post link copied" on a page, as Ember does', () => {
      expect(getPostActionMessage('copiedPostUrl', { count: 1, resource: 'pages' })).toBe(
        'Post link copied',
      );
      expect(getPostActionMessage('copiedPreviewUrl', { count: 1, resource: 'pages' })).toBe(
        'Preview link copied',
      );
    });
  });

  // These are only ever reached from a single-post action, and Ember's table
  // has no plural for them at all — it would interpolate `undefined`.
  it('keeps the copy messages singular whatever the count', () => {
    expect(getPostActionMessage('copiedPostUrl', { count: 9, resource: 'posts' })).toBe(
      'Post link copied',
    );
  });
});
