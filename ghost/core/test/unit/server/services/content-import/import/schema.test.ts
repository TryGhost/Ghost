import assert from 'node:assert/strict';
import {
  importRequestSchema,
  mappingSchema,
} from '../../../../../../core/server/services/content-import/import/schema';

function issuesFor(mapping: Record<string, string>): string[] {
  const result = mappingSchema.safeParse(mapping);
  if (result.success) {
    assert.fail('Expected mapping validation to fail');
  }
  return result.error.issues.map((issue) => issue.message);
}

describe('content import schema', function () {
  it('accepts a CSV or ZIP request with a valid editable mapping', function () {
    assert.deepEqual(
      importRequestSchema.parse({
        filePath: '/tmp/posts.zip',
        fileName: 'posts.zip',
        mapping: {
          Headline: 'title',
          Body: 'html',
          Source: 'comment_id',
          Notes: '',
        },
      }),
      {
        filePath: '/tmp/posts.zip',
        fileName: 'posts.zip',
        mapping: {
          Headline: 'title',
          Body: 'html',
          Source: 'comment_id',
          Notes: '',
        },
      },
    );
  });

  it('keeps mapping optional for direct identity-header clients', function () {
    assert.deepEqual(
      importRequestSchema.parse({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' }),
      { filePath: '/tmp/posts.csv', fileName: 'posts.csv' },
    );
  });

  it('rejects empty and prototype CSV headers', function () {
    assert.deepEqual(issuesFor({ '': 'title' }), ['Invalid CSV header mapping: ""']);
    assert.deepEqual(issuesFor({ constructor: 'title' }), [
      'Invalid CSV header mapping: "constructor"',
    ]);
  });

  it('rejects unknown and duplicate post targets', function () {
    assert.deepEqual(issuesFor({ Headline: 'title', Body: 'not_a_field' }), [
      'Unknown post field mapping: "not_a_field"',
    ]);
    assert.deepEqual(issuesFor({ Headline: 'title', Duplicate: 'title' }), [
      'Post field is mapped more than once: "title"',
    ]);
  });

  it('requires a title target while allowing multiple ignored columns', function () {
    assert.deepEqual(issuesFor({ Body: 'html', Notes: '', Other: '' }), [
      'Post field mapping must include "title"',
    ]);
  });

  it('requires non-empty file paths and names', function () {
    const result = importRequestSchema.safeParse({ filePath: '', fileName: '' });

    if (result.success) {
      assert.fail('Expected request validation to fail');
    }
    assert.equal(result.error.issues.length, 2);
  });
});
