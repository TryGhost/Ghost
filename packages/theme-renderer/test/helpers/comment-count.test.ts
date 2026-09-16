// Characterization tests adapted from ghost/core/test/unit/frontend/helpers/comment-count.test.js
// (expected values follow the original's behavior at 407e032dc7). The expected
// strings are written out literally — NOT built with common-tags — so they
// independently lock the exact bytes the live instance emits (docs/deltas.md
// row 5: one such script per post card).
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { configureTestDeps, teardownTestDeps } from '../utils/renderer-test-utils.ts';

import commentCount from '../../src/helpers/comment-count.ts';

beforeEach(function () {
  configureTestDeps();
});

afterEach(function () {
  teardownTestDeps();
});

describe('{{comment_count}}', function () {
  it('correctly sets the defaults', function () {
    const result = commentCount.call({ id: 'post-id' }, { hash: {} });
    assert.equal(
      result.toString(),
      '<script\n' +
        '    data-ghost-comment-count="post-id"\n' +
        '    data-ghost-comment-count-empty=""\n' +
        '    data-ghost-comment-count-singular="comment"\n' +
        '    data-ghost-comment-count-plural="comments"\n' +
        '    data-ghost-comment-count-tag="span"\n' +
        '    data-ghost-comment-count-class-name=""\n' +
        '    data-ghost-comment-count-autowrap="true"\n' +
        '>\n' +
        '</script>',
    );
  });

  it('returns a script tag with the post id when autowrap is disabled', function () {
    const result = commentCount.call(
      { id: 'post-id' },
      {
        hash: {
          empty: 'No comments',
          singular: 'comment',
          plural: 'comments',
          autowrap: 'false',
        },
      },
    );
    assert.equal(
      result.toString(),
      '<script\n' +
        '    data-ghost-comment-count="post-id"\n' +
        '    data-ghost-comment-count-empty="No comments"\n' +
        '    data-ghost-comment-count-singular="comment"\n' +
        '    data-ghost-comment-count-plural="comments"\n' +
        '    data-ghost-comment-count-tag="script"\n' +
        '    data-ghost-comment-count-class-name=""\n' +
        '    data-ghost-comment-count-autowrap="false"\n' +
        '>\n' +
        '</script>',
    );
  });

  it('applies all the hash params as data attributes', function () {
    const result = commentCount.call(
      { id: 'post-id' },
      {
        hash: {
          empty: 'No comments',
          singular: 'comment',
          plural: 'comments',
          autowrap: 'div',
          class: 'custom',
        },
      },
    );
    assert.equal(
      result.toString(),
      '<script\n' +
        '    data-ghost-comment-count="post-id"\n' +
        '    data-ghost-comment-count-empty="No comments"\n' +
        '    data-ghost-comment-count-singular="comment"\n' +
        '    data-ghost-comment-count-plural="comments"\n' +
        '    data-ghost-comment-count-tag="div"\n' +
        '    data-ghost-comment-count-class-name="custom"\n' +
        '    data-ghost-comment-count-autowrap="true"\n' +
        '>\n' +
        '</script>',
    );
  });
});
