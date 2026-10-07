import { describe, expect, it } from 'vitest';
import { getCelebrationCopy } from './post-celebration-copy';

/**
 * The celebration's headings, ported from the `<h1>` in
 * `apps/ember-admin/app/components/modal-post-success.hbs`.
 *
 * Two lines: a primary and a secondary. Which pair you get depends on whether
 * the post was scheduled or published, whether it is a page, whether it was
 * email-only, and whether a published count was fetched.
 */
describe('getCelebrationCopy', () => {
  it('celebrates a scheduled post with a single line', () => {
    expect(getCelebrationCopy({ wasPublished: false, type: 'post' })).toEqual({
      primary: 'All set!',
      secondary: '',
    });
  });

  it('counts the published posts when the count is known', () => {
    expect(getCelebrationCopy({ wasPublished: true, type: 'post', postCount: 47 })).toEqual({
      primary: 'Boom! It’s out there.',
      secondary: 'That’s 47 posts published.',
    });
  });

  // The count request is fired but not awaited before showing the modal, so
  // this is the state the user sees first.
  it('falls back to "Spread the word!" before the count lands', () => {
    expect(getCelebrationCopy({ wasPublished: true, type: 'post' })).toEqual({
      primary: 'Your post is published.',
      secondary: 'Spread the word!',
    });
  });

  it('says so when the post was email-only', () => {
    expect(
      getCelebrationCopy({ wasPublished: true, type: 'post', emailOnly: true, postCount: 9 })
        .secondary,
    ).toBe('Your email has been sent.');
  });

  it('has its own line for a page, whatever the count says', () => {
    expect(getCelebrationCopy({ wasPublished: true, type: 'page', postCount: 9 }).secondary).toBe(
      'Your page is published.',
    );
  });

  it('says "post" rather than "posts" for the first one', () => {
    expect(getCelebrationCopy({ wasPublished: true, type: 'post', postCount: 1 }).secondary).toBe(
      'That’s 1 post published.',
    );
  });

  it('groups the digits of a large count', () => {
    expect(
      getCelebrationCopy({ wasPublished: true, type: 'post', postCount: 1234 }).secondary,
    ).toBe('That’s 1,234 posts published.');
  });

  // A scheduled page is still just "All set!" — the scheduled branch comes
  // first in Ember's template and swallows every other distinction.
  it('ignores everything else when scheduled', () => {
    expect(
      getCelebrationCopy({ wasPublished: false, type: 'page', emailOnly: true, postCount: 9 }),
    ).toEqual({ primary: 'All set!', secondary: '' });
  });
});
