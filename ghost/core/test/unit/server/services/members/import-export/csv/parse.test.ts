import path from 'node:path';
import assert from 'node:assert/strict';
import {vi} from 'vitest';
import {parse} from '../../../../../../../core/server/services/members/import-export/csv';
const csvPath = path.join(__dirname, '/fixtures/');

// parse is purely mechanical: it reads the file, renames columns per the mapping,
// carries unmapped columns through, and emits raw string cells. Giving those columns
// meaning and coercing them is the import schema's job (row.test.ts).
describe('parse', function () {
    const DEFAULT_HEADER_MAPPING = {
        email: 'email',
        name: 'name'
    };

    it('empty file', async function () {
        const result = await parse(csvPath + 'empty.csv', DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 0);
    });

    it('one column', async function () {
        const result = await parse(csvPath + 'single-column-with-header.csv', DEFAULT_HEADER_MAPPING);

        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('carries the column through untouched when no header mapping is passed', async function () {
        const result = await parse(csvPath + 'single-column-with-header.csv');

        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('one column with bom', async function () {
        const result = await parse(csvPath + 'single-column-with-header-bom.csv', DEFAULT_HEADER_MAPPING);

        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('carries the column through untouched (with bom) when no header mapping is passed', async function () {
        const result = await parse(csvPath + 'single-column-with-header-bom.csv');

        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('renames a column per the mapping', async function () {
        const result = await parse(csvPath + 'two-columns-obscure-header.csv', {
            id: 'id',
            'Email Address': 'email'
        });

        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].id, '1');
        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].id, '2');
    });

    it('renames multiple columns per the mapping', async function () {
        const result = await parse(csvPath + 'two-columns-mapping-header.csv', {
            id: 'id',
            correo_electronico: 'email',
            nombre: 'name'
        });

        assert.equal(result.length, 2);
        assert.deepEqual(result[0], {id: '1', email: 'jbloggs@example.com', name: 'joe'});
        assert.deepEqual(result[1], {id: '2', email: 'test@example.com', name: 'test'});
    });

    it('carries every unmapped column through as a raw cell', async function () {
        const result = await parse(csvPath + 'two-columns-mapping-header.csv', {
            correo_electronico: 'email'
        });

        assert.equal(result.length, 2);
        assert.deepEqual(result[0], {id: '1', email: 'jbloggs@example.com', nombre: 'joe'});
        assert.deepEqual(result[1], {id: '2', email: 'test@example.com', nombre: 'test'});
    });

    it('leaves cell values as raw strings -- coercion is the schema\'s job', async function () {
        const result = await parse(csvPath + 'subscribed-to-emails-header.csv', {
            email: 'email',
            subscribed_to_emails: 'subscribed'
        });

        assert.equal(result[0].subscribed, 'true');
        assert.equal(result[1].subscribed, 'false');
    });

    it('ignores the overflow from a row with more fields than headers', async function () {
        const result = await parse(csvPath + 'long-row.csv', {email: 'email', name: 'name'});

        assert.deepEqual(result, [{email: 'a@b.com', name: 'Al'}]);
    });

    it('does not hang when the overflow column is mapped', async function () {
        // name is unmapped, so it carries through; the __parsed_extra overflow is an
        // array, not a string, and is skipped either way.
        const result = await parse(csvPath + 'long-row.csv', {email: 'email', __parsed_extra: 'note'});

        assert.deepEqual(result, [{email: 'a@b.com', name: 'Al'}]);
    });

    it('drops a column named after an Object.prototype member', async function () {
        const result = await parse(csvPath + 'prototype-named-column.csv', {email: 'email'});

        assert.equal(result.length, 1);
        assert.deepEqual(Object.keys(result[0]), ['email']);
    });

    it('keeps the first of two identically named columns', async function () {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            const result = await parse(csvPath + 'duplicate-headers.csv', {email: 'email'});

            assert.equal(result.length, 1);
            assert.equal(result[0].email, 'jbloggs@example.com');
            assert.equal(warn.mock.calls.length, 1, 'papaparse warns that it renamed the duplicate');
        } finally {
            warn.mockRestore();
        }
    });

    it('rejects with error for non-existent file path', async function () {
        await assert.rejects(
            () => parse(csvPath + 'does-not-exist.csv', DEFAULT_HEADER_MAPPING),
            (err: NodeJS.ErrnoException) => {
                assert.ok(err);
                assert.equal(err.code, 'ENOENT');
                return true;
            }
        );
    });
});
