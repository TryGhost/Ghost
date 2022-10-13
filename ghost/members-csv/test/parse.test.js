const should = require('should');
const path = require('path');
const assert = require('assert');
const {parse} = require('../index');
const csvPath = path.join(__dirname, '/fixtures/');

describe('parse', function () {
    it('empty file', async function () {
        const filePath = csvPath + 'empty.csv';
        const result = await parse(filePath);

        should.exist(result);
        result.length.should.eql(0);
    });

    it('one column', async function () {
        const filePath = csvPath + 'single-column-with-header.csv';
        const result = await parse(filePath);

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('one column without header mapping returns empty result', async function () {
        const filePath = csvPath + 'single-column-with-header.csv';
        const result = await parse(filePath);

        should.exist(result);
        result.length.should.eql(0);
    });

    it('two columns, 1 filter', async function () {
        const filePath = csvPath + 'two-columns-with-header.csv';
        const result = await parse(filePath);

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('two columns, 2 filters', async function () {
        const filePath = csvPath + 'two-columns-obscure-header.csv';
        const mapping = {
            'Email Address': 'email'
        };
        const result = await parse(filePath, mapping);

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].id.should.eql('1');
        result[1].email.should.eql('test@example.com');
        result[1].id.should.eql('2');
    });

    it('two columns with mapping', async function () {
        const filePath = csvPath + 'two-columns-mapping-header.csv';
        const mapping = {
            correo_electronico: 'email',
            nombre: 'name'
        };
        const result = await parse(filePath, mapping);

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].name.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].email.should.eql('test@example.com');
        result[1].name.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('two columns with partial mapping', async function () {
        const filePath = csvPath + 'two-columns-mapping-header.csv';
        const mapping = {
            correo_electronico: 'email'
        };
        const result = await parse(filePath, mapping);

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].nombre.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].email.should.eql('test@example.com');
        result[1].nombre.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('two columns with empty mapping', async function () {
        const filePath = csvPath + 'two-columns-mapping-header.csv';
        const mapping = {};
        const result = await parse(filePath, mapping);

        should.exist(result);
        result.length.should.eql(2);
        result[0].correo_electronico.should.eql('jbloggs@example.com');
        result[0].nombre.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].correo_electronico.should.eql('test@example.com');
        result[1].nombre.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('transforms empty values to nulls', async function () {
        const filePath = csvPath + 'multiple-records-with-empty-values.csv';
        const result = await parse(filePath);

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].name.should.eql('Bob');

        result[1].email.should.eql('test@example.com');
        should.equal(result[1].name, null);
    });

    it(' transforms "subscribed_to_emails" column to "subscribed" property when the mapping is passed in', async function () {
        const filePath = csvPath + 'subscribed-to-emails-header.csv';
        const mapping = {
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
        const result = await parse(filePath);

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.ok(result[0].subscribed_to_emails);

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].subscribed_to_emails, false);
    });
});
