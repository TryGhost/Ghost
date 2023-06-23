const path = require('path');
const assert = require('assert/strict');
const {parse} = require('../index');
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

    it(' transforms "subscribed_to_emails" column to "subscribed" property when the mapping is passed in', async function () {
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

    it('DOES NOT transforms "subscribed_to_emails" column to "subscribed" property when the WITHOUT mapping', async function () {
        const filePath = csvPath + 'subscribed-to-emails-header.csv';
        const result = await parse(filePath, DEFAULT_HEADER_MAPPING);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.equal(result[0].subscribed_to_emails, undefined, 'property not present in the mapping should not be defined');

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].subscribed_to_emails, undefined, 'property not present in the mapping should not be defined');
    });
});
