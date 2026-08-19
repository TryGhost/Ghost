import assert from 'node:assert/strict';
import buildPostData from '../../../../../../core/server/services/content-import/import/post-data';
import {postImportRowSchema} from '../../../../../../core/server/services/content-import/import/row';

// A stand-in converter that shows what it was given, so the test can assert both the
// wiring (called with the row's html) and the stringification.
const htmlToLexical = (html: string) => ({converted: html});

const row = (cells: Record<string, string>) => postImportRowSchema.parse(cells);

describe('buildPostData', function () {
    it('sets lexical from the html cell and never html itself', function () {
        const data = buildPostData(row({title: 'T', html: '<p>Hello</p>'}), htmlToLexical);

        assert.equal(data.lexical, JSON.stringify({converted: '<p>Hello</p>'}));
        // the model strips client-supplied html when importing, so passing it would be a no-op
        assert.equal('html' in data, false);
    });

    it('slugs the title with the standard rules, not the importing-mode pass', function () {
        const data = buildPostData(row({title: 'A post with a comma, in its title'}), htmlToLexical);

        assert.equal(data.slug, 'a-post-with-a-comma-in-its-title');
    });

    it('omits lexical for an empty html cell, leaving the model its blank document', function () {
        const data = buildPostData(row({title: 'T'}), htmlToLexical);

        assert.equal('lexical' in data, false);
    });

    it('passes published_at through as the CSV string when present', function () {
        const data = buildPostData(row({title: 'T', published_at: '2025-01-01T00:00:00.000Z'}), htmlToLexical);

        assert.equal(data.published_at, '2025-01-01T00:00:00.000Z');
    });

    it('omits published_at when the cell is absent', function () {
        const data = buildPostData(row({title: 'T'}), htmlToLexical);

        assert.equal('published_at' in data, false);
    });
});
