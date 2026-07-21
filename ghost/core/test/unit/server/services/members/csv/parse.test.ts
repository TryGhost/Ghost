import path from 'node:path';
import assert from 'node:assert/strict';
import {vi} from 'vitest';
import {parse} from '../../../../../../core/server/services/members/csv';
const csvPath = path.join(__dirname, '/fixtures/');

describe('parse', function () {
    const DEFAULT_HEADER_MAPPING = {
        email: 'email',
        name: 'name'
    };

    it('empty file', async function () {
        const filePath = csvPath + 'empty.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 0);
    });

    it('one column', async function () {
        const filePath = csvPath + 'single-column-with-header.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('one column without header mapping returns empty result', async function () {
        const filePath = csvPath + 'single-column-with-header.csv';
        const result = await parse(filePath);

        assert.ok(result);
        assert.equal(result.length, 0);
    });

    it('one column with bom', async function () {
        const filePath = csvPath + 'single-column-with-header-bom.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('one column with bom and without header mapping returns empty result', async function () {
        const filePath = csvPath + 'single-column-with-header-bom.csv';
        const result = await parse(filePath);

        assert.ok(result);
        assert.equal(result.length, 0);
    });

    it('two columns, 1 filter', async function () {
        const filePath = csvPath + 'two-columns-with-header.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[1].email, 'test@example.com');
    });

    it('two columns, 2 filters', async function () {
        const filePath = csvPath + 'two-columns-obscure-header.csv';
        const mapping = {
            id: 'id',
            'Email Address': 'email'
        };
        const result = await parse(filePath, mapping);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].id, '1');
        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].id, '2');
    });

    it('two columns with mapping', async function () {
        const filePath = csvPath + 'two-columns-mapping-header.csv';
        const mapping = {
            id: 'id',
            correo_electronico: 'email',
            nombre: 'name'
        };
        const result = await parse(filePath, mapping);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].name, 'joe');
        assert.equal(result[0].id, '1');

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].name, 'test');
        assert.equal(result[1].id, '2');
    });

    it('two columns with partial mapping', async function () {
        const filePath = csvPath + 'two-columns-mapping-header.csv';
        const mapping = {
            id: 'id',
            correo_electronico: 'email'
        };
        const result = await parse(filePath, mapping);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].id, '1');

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].id, '2');
    });

    it('drops every unmapped column when several are unmapped', async function () {
        const filePath = csvPath + 'two-columns-mapping-header.csv';
        const mapping = {
            correo_electronico: 'email'
        };
        const result = await parse(filePath, mapping);

        assert.equal(result.length, 2);
        assert.deepEqual(Object.keys(result[0]), ['email', 'labels']);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.deepEqual(Object.keys(result[1]), ['email', 'labels']);
        assert.equal(result[1].email, 'test@example.com');
    });

    it('ignores the overflow from a row with more fields than headers', async function () {
        const filePath = csvPath + 'long-row.csv';
        const result = await parse(filePath, {email: 'email', name: 'name'});

        assert.deepEqual(result, [{email: 'a@b.com', name: 'Al', labels: []}]);
    });

    it('does not hang when the overflow column is mapped', async function () {
        const filePath = csvPath + 'long-row.csv';
        const result = await parse(filePath, {email: 'email', __parsed_extra: 'note'});

        assert.deepEqual(result, [{email: 'a@b.com', labels: []}]);
    });

    it('drops a column named after an Object.prototype member', async function () {
        const filePath = csvPath + 'prototype-named-column.csv';
        const result = await parse(filePath, {email: 'email'});

        assert.equal(result.length, 1);
        assert.deepEqual(Object.keys(result[0]), ['email', 'labels']);
    });

    it('keeps the first of two identically named columns', async function () {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            const filePath = csvPath + 'duplicate-headers.csv';
            const result = await parse(filePath, {email: 'email'});

            assert.equal(result.length, 1);
            assert.equal(result[0].email, 'jbloggs@example.com');
            assert.equal(warn.mock.calls.length, 1, 'papaparse warns that it renamed the duplicate');
        } finally {
            warn.mockRestore();
        }
    });

    it('transforms empty values to nulls', async function () {
        const filePath = csvPath + 'multiple-records-with-empty-values.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].name, 'Bob');

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].name, null);
    });

    it('transforms "subscribed_to_emails" column to "subscribed" property when the mapping is passed in', async function () {
        const filePath = csvPath + 'subscribed-to-emails-header.csv';
        const mapping = {
            email: 'email',
            subscribed_to_emails: 'subscribed'
        };
        const result = await parse(filePath, mapping);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.ok(result[0].subscribed);

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].subscribed, false);
    });

    it('does not transform "subscribed_to_emails" column to "subscribed" property without the mapping', async function () {
        const filePath = csvPath + 'subscribed-to-emails-header.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].subscribed_to_emails, undefined, 'property not present in the mapping should not be defined');

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].subscribed_to_emails, undefined, 'property not present in the mapping should not be defined');
    });

    it('transforms labels column into array of label objects', async function () {
        const filePath = csvPath + 'members-with-labels.csv';
        const mapping = {
            email: 'email',
            labels: 'labels'
        };
        const result = await parse(filePath, mapping);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.deepEqual(result[0].labels, [{name: 'vip'}, {name: 'premium'}]);
        assert.deepEqual(result[1].labels, [{name: 'basic'}]);
    });

    it('concatenates defaultLabels with row labels when both exist', async function () {
        const filePath = csvPath + 'members-with-labels.csv';
        const mapping = {
            email: 'email',
            labels: 'labels'
        };
        const defaultLabels = [{name: 'imported'}];
        const result = await parse(filePath, mapping, defaultLabels);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.deepEqual(result[0].labels, [{name: 'vip'}, {name: 'premium'}, {name: 'imported'}]);
        assert.deepEqual(result[1].labels, [{name: 'basic'}, {name: 'imported'}]);
    });

    it('falls back to defaultLabels when the labels column is empty', async function () {
        const filePath = csvPath + 'members-with-empty-labels.csv';
        const mapping = {
            email: 'email',
            labels: 'labels'
        };
        const defaultLabels = [{name: 'imported'}];
        const result = await parse(filePath, mapping, defaultLabels);

        assert.equal(result.length, 2);
        assert.deepEqual(result[0].labels, [{name: 'imported'}]);
        assert.deepEqual(result[1].labels, [{name: 'basic'}, {name: 'imported'}]);
    });

    it('gives each row its own labels array', async function () {
        const filePath = csvPath + 'members-with-empty-labels.csv';
        const mapping = {
            email: 'email',
            labels: 'labels'
        };
        const defaultLabels = [{name: 'imported'}];
        const result = await parse(filePath, mapping, defaultLabels);

        assert.notEqual(result[0].labels, defaultLabels, 'must not alias the caller\'s array');
        assert.notEqual(result[0].labels, result[1].labels);
    });

    it('transforms complimentary_plan column to boolean', async function () {
        const filePath = csvPath + 'members-with-complimentary-plan.csv';
        const mapping = {
            email: 'email',
            complimentary_plan: 'complimentary_plan'
        };
        const result = await parse(filePath, mapping);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].complimentary_plan, true);
        assert.equal(result[1].complimentary_plan, false);
    });

    it('transforms literal "undefined" string values to null', async function () {
        const filePath = csvPath + 'members-with-undefined-values.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].name, null);
        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].name, 'Bob');
    });

    it('rejects with error for non-existent file path', async function () {
        const filePath = csvPath + 'does-not-exist.csv';
        await assert.rejects(
            () => parse(filePath, DEFAULT_HEADER_MAPPING),
            (err: NodeJS.ErrnoException) => {
                assert.ok(err);
                assert.equal(err.code, 'ENOENT');
                return true;
            }
        );
    });
});
