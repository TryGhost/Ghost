import assert from 'node:assert/strict';
import buildPostData, {
  RowSkipped,
} from '../../../../../../core/server/services/content-import/import/post-data';
import { postImportRowSchema } from '../../../../../../core/server/services/content-import/import/row';

// A stand-in converter that shows what it was given, so the test can assert both the
// wiring (called with the row's html) and the stringification.
const htmlToLexical = (html: string) => ({ converted: html });

const row = (cells: Record<string, string>) => postImportRowSchema.parse(cells);

const TAGS = ['#Import 2026-01-01 10:00', '#Import Run run_test'];

describe('buildPostData', function () {
  it('sets lexical from the html cell and never html itself', function () {
    const data = buildPostData(row({ title: 'T', html: '<p>Hello</p>' }), htmlToLexical, TAGS);

    assert.equal(data.lexical, JSON.stringify({ converted: '<p>Hello</p>' }));
    // the model strips client-supplied html when importing, so passing it would be a no-op
    assert.equal('html' in data, false);
  });

  it('slugs the title with the standard rules, not the importing-mode pass', function () {
    const data = buildPostData(
      row({ title: 'A post with a comma, in its title' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.slug, 'a-post-with-a-comma-in-its-title');
  });

  it('omits lexical for an empty html cell, leaving the model its blank document', function () {
    const data = buildPostData(row({ title: 'T' }), htmlToLexical, TAGS);

    assert.equal('lexical' in data, false);
  });

  it('dates the whole post from the CSV date: published_at, created_at and updated_at', function () {
    const data = buildPostData(
      row({ title: 'T', published_at: '2025-01-01T00:00:00.000Z' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.published_at, '2025-01-01T00:00:00.000Z');
    assert.equal(data.created_at, '2025-01-01T00:00:00.000Z');
    assert.equal(data.updated_at, '2025-01-01T00:00:00.000Z');
  });

  it('fills every unspecified field with the import defaults', function () {
    const data = buildPostData(row({ title: 'T' }), htmlToLexical, TAGS);

    assert.equal(data.status, 'published');
    assert.equal(data.type, 'post');
    assert.equal(
      data.visibility,
      'public',
      'explicit: the model would read the default_content_visibility setting',
    );
    assert.deepEqual(
      data.tags,
      TAGS.map((name) => ({ name })),
    );
    assert.equal('authors' in data, false);
  });

  it('omits every date when the cell is absent, leaving the model to stamp now', function () {
    const data = buildPostData(row({ title: 'T' }), htmlToLexical, TAGS);

    assert.equal('published_at' in data, false);
    assert.equal('created_at' in data, false);
    assert.equal('updated_at' in data, false);
  });

  const skipsWith = (cells: Record<string, string>, reason: string | RegExp) => {
    assert.throws(
      () => buildPostData(row(cells), htmlToLexical, TAGS),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped, 'skipped, not a hard failure');
        if (reason instanceof RegExp) {
          assert.match(error.message, reason);
        } else {
          assert.equal(error.message, reason);
        }
        return true;
      },
    );
  };

  it('skips a row without a title', function () {
    skipsWith({ html: '<p>No title</p>' }, 'title is required');
  });

  it('skips a row whose title is only whitespace', function () {
    skipsWith({ title: '   ' }, 'title is required');
  });

  it('skips a row whose title is longer than 255 characters', function () {
    skipsWith({ title: 'x'.repeat(256) }, 'title must be 255 characters or fewer');
  });

  it('accepts a title of exactly 255 characters', function () {
    const data = buildPostData(row({ title: 'x'.repeat(255) }), htmlToLexical, TAGS);

    assert.equal(data.title.length, 255);
  });

  it('skips a row whose published_at is not a date, quoting the cell', function () {
    skipsWith(
      { title: 'T', published_at: 'not-a-date' },
      'published_at is not a valid date: "not-a-date"',
    );
  });

  it('skips a row whose published_at is a rolled-over calendar date', function () {
    // new Date() would normalize this to March 2 and quietly mis-date the post
    skipsWith(
      { title: 'T', published_at: '2025-02-30T00:00:00.000Z' },
      'published_at is not a valid date: "2025-02-30T00:00:00.000Z"',
    );
  });

  it('accepts a non-ISO date format that new Date can parse', function () {
    const data = buildPostData(
      row({ title: 'T', published_at: 'May 1, 2024' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.published_at, 'May 1, 2024');
  });

  it('skips a row whose html cannot be converted', function () {
    const throwingConverter = () => {
      throw new Error('parser exploded');
    };

    assert.throws(
      () => buildPostData(row({ title: 'T', html: '<p>bad</p>' }), throwingConverter, TAGS),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped);
        assert.equal(error.message, 'html could not be converted');
        return true;
      },
    );
  });
});
