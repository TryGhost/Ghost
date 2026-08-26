import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse} from '../../../../../../core/server/services/content-import/csv';

// The CSVs live inline: each case writes its content to a temp file, so the
// fixture sits next to the assertions that read it.
describe('content import csv parse', function () {
    const HEADER_MAPPING = {
        title: 'title',
        html: 'html',
        published_at: 'published_at'
    };

    let dir: string;
    let fileCount = 0;

    beforeAll(async function () {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-parse-'));
    });

    afterAll(async function () {
        await fs.rm(dir, {recursive: true, force: true});
    });

    const csvFile = async (content: string): Promise<string> => {
        fileCount += 1;
        const filePath = path.join(dir, `case-${fileCount}.csv`);
        await fs.writeFile(filePath, content);
        return filePath;
    };

    it('parses an empty file to no rows', async function () {
        const result = await parse(await csvFile(''), HEADER_MAPPING);

        assert.deepEqual(result, []);
    });

    it('parses title, html and published_at cells, quoting included', async function () {
        const result = await parse(await csvFile(
            'title,html,published_at\n' +
            'First post,<p>Hello</p>,2025-01-01T00:00:00.000Z\n' +
            'Second post,"<p>Comma, and a ""quote""</p>",2025-01-02T12:30:00.000Z\n'
        ), HEADER_MAPPING);

        assert.equal(result.length, 2);
        assert.deepEqual(result[0], {
            title: 'First post',
            html: '<p>Hello</p>',
            published_at: '2025-01-01T00:00:00.000Z'
        });
        assert.equal(result[1].title, 'Second post');
        assert.equal(result[1].html, '<p>Comma, and a "quote"</p>');
    });

    it('handles a byte order mark before the header row', async function () {
        const result = await parse(await csvFile(
            '\ufeff' + 'title,html,published_at\n' +
            'Bom post,<p>Bom</p>,2025-01-01T00:00:00.000Z\n'
        ), HEADER_MAPPING);

        assert.equal(result.length, 1);
        assert.equal(result[0].title, 'Bom post');
    });

    it('drops a blank line rather than emitting an empty row', async function () {
        const result = await parse(await csvFile(
            'title,html,published_at\n' +
            'Before blank,<p>a</p>,2025-01-01T00:00:00.000Z\n' +
            '\n' +
            'After blank,<p>b</p>,2025-01-02T00:00:00.000Z\n'
        ), HEADER_MAPPING);

        assert.equal(result.length, 2);
        assert.equal(result[0].title, 'Before blank');
        assert.equal(result[1].title, 'After blank');
    });

    it('ignores the overflow cells of a ragged row', async function () {
        const result = await parse(await csvFile(
            'title,html,published_at\n' +
            'Ragged post,<p>Hi</p>,2025-01-01T00:00:00.000Z,overflow,cells\n'
        ), HEADER_MAPPING);

        assert.equal(result.length, 1);
        assert.deepEqual(result[0], {
            title: 'Ragged post',
            html: '<p>Hi</p>',
            published_at: '2025-01-01T00:00:00.000Z'
        });
    });

    it('rejects a file with an unterminated quoted field instead of importing garbage', async function () {
        await assert.rejects(parse(await csvFile(
            'title,html,published_at\n' +
            'Broken quote,"<p>never closed,2025-01-01T00:00:00.000Z\n' +
            'Next post,<p>fine</p>,2025-01-02T00:00:00.000Z\n'
        ), HEADER_MAPPING), /MissingQuotes/);
    });

    it('drops a column named after an Object.prototype member', async function () {
        const result = await parse(await csvFile(
            'title,toString\n' +
            'Proto post,shadowed\n'
        ), HEADER_MAPPING);

        assert.equal(result.length, 1);
        assert.deepEqual(result[0], {title: 'Proto post'});
    });

    it('carries an unmapped column through untouched', async function () {
        const result = await parse(await csvFile(
            'title,html,published_at,custom_thing\n' +
            'Extra post,<p>Hi</p>,2025-01-01T00:00:00.000Z,kept\n'
        ), HEADER_MAPPING);

        assert.equal(result.length, 1);
        assert.equal(result[0].custom_thing, 'kept');
    });
});
