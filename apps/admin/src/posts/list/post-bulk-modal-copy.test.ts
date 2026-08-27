import { describe, expect, it } from 'vitest';
import { getAccessModalTitle, getBulkConfirmCopy } from './post-bulk-modal-copy';

/**
 * Wording for the three confirmation modals, ported from
 * `apps/ember-admin/app/components/posts-list/modals/*.hbs`.
 *
 * A single post is named in quotes; several are counted. The count is the
 * *selection* count, so after Cmd+A it reads the server total rather than the
 * rows in memory.
 */
describe('getBulkConfirmCopy', () => {
  it('names a single post in the delete confirmation', () => {
    expect(getBulkConfirmCopy('delete', { count: 1, resource: 'posts', title: 'My post' })).toEqual(
      {
        title: 'Are you sure you want to delete this post?',
        body: 'You’re about to delete "My post". This is permanent! We warned you, k?',
        confirmLabel: 'Delete',
        runningLabel: 'Deleting',
      },
    );
  });

  it('falls back to the resource name when a single post has no title', () => {
    expect(getBulkConfirmCopy('delete', { count: 1, resource: 'posts' }).body).toBe(
      'You’re about to delete this post. This is permanent! We warned you, k?',
    );
  });

  it('counts several posts rather than naming them', () => {
    expect(getBulkConfirmCopy('delete', { count: 12, resource: 'posts' })).toEqual({
      title: 'Are you sure you want to delete these posts?',
      body: 'You’re about to delete 12 posts. This is permanent! We warned you, k?',
      confirmLabel: 'Delete',
      runningLabel: 'Deleting',
    });
  });

  // Unpublish and unschedule share a body — both revert to a private draft —
  // and neither carries the delete warning.
  it('reverts rather than deletes when unpublishing', () => {
    expect(
      getBulkConfirmCopy('unpublish', { count: 1, resource: 'posts', title: 'Live one' }),
    ).toEqual({
      title: 'Are you sure you want to unpublish this post?',
      body: 'You’re about to revert "Live one" to a private draft.',
      confirmLabel: 'Unpublish',
      runningLabel: 'Unpublishing',
    });
  });

  it('uses the same body for unschedule', () => {
    expect(getBulkConfirmCopy('unschedule', { count: 3, resource: 'posts' })).toEqual({
      title: 'Are you sure you want to unschedule these posts?',
      body: 'You’re about to revert 3 posts to a private draft.',
      confirmLabel: 'Unschedule',
      runningLabel: 'Unscheduling',
    });
  });

  it('says page on the pages screen', () => {
    expect(getBulkConfirmCopy('delete', { count: 2, resource: 'pages' }).title).toBe(
      'Are you sure you want to delete these pages?',
    );
  });

  /**
   * Ember decides singular from `isSingle` — one id selected *and not
   * inverted* — not from the count. Cmd+A on a one-post view is an inverted
   * selection of one, and Ember still says "these posts". Deriving it from
   * the count alone would name a post the user may not have meant to.
   */
  it('stays plural for an inverted selection of one', () => {
    const copy = getBulkConfirmCopy('delete', {
      count: 1,
      resource: 'posts',
      title: 'Only one',
      isSingle: false,
    });

    expect(copy.title).toBe('Are you sure you want to delete these posts?');
    expect(copy.body).toBe('You’re about to delete 1 posts. This is permanent! We warned you, k?');
  });

  // Ember's task button swaps to a present-participle while the request runs.
  it('offers a running label for each action', () => {
    expect(getBulkConfirmCopy('delete', { count: 1, resource: 'posts' }).runningLabel).toBe(
      'Deleting',
    );
    expect(getBulkConfirmCopy('unpublish', { count: 1, resource: 'posts' }).runningLabel).toBe(
      'Unpublishing',
    );
    expect(getBulkConfirmCopy('unschedule', { count: 1, resource: 'posts' }).runningLabel).toBe(
      'Unscheduling',
    );
  });
});

describe('getAccessModalTitle', () => {
  it('names the resource for a single post', () => {
    expect(getAccessModalTitle({ count: 1, resource: 'posts', isSingle: true })).toBe(
      'Change post access',
    );
  });

  // Ember appends the count only when the selection is not single.
  it('counts the posts when several are selected', () => {
    expect(getAccessModalTitle({ count: 7, resource: 'posts', isSingle: false })).toBe(
      'Change post access for 7 posts',
    );
  });

  it('says page on the pages screen', () => {
    expect(getAccessModalTitle({ count: 1, resource: 'pages', isSingle: true })).toBe(
      'Change page access',
    );
  });
});
