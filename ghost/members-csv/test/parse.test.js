const should = require('should');
const path = require('path');
const {readCSV} = require('../lib/parse');
const csvPath = path.join(__dirname, '/fixtures/');

describe('parse', function () {
    it('read csv: empty file', async function () {
        const result = await readCSV({
            path: csvPath + 'empty.csv'
        });

        should.exist(result);
        result.length.should.eql(0);
    });

    it('read csv: one column', async function () {
        const result = await readCSV({
            path: csvPath + 'single-column-with-header.csv'
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('read csv: two columns, 1 filter', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-with-header.csv'
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('read csv: two columns, 2 filters', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-obscure-header.csv',
            mapping: {
                'Email Address': 'email'
            }
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].id.should.eql('1');
        result[1].email.should.eql('test@example.com');
        result[1].id.should.eql('2');
    });

    it('read csv: two columns with mapping', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-mapping-header.csv',
            mapping: {
                correo_electronico: 'email',
                nombre: 'name'
            }
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].name.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].email.should.eql('test@example.com');
        result[1].name.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('read csv: two columns with partial mapping', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-mapping-header.csv',
            mapping: {
                correo_electronico: 'email'
            }
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].nombre.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].email.should.eql('test@example.com');
        result[1].nombre.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('read csv: two columns with empty mapping', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-mapping-header.csv',
            mapping: {}
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].correo_electronico.should.eql('jbloggs@example.com');
        result[0].nombre.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].correo_electronico.should.eql('test@example.com');
        result[1].nombre.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('read csv: transforms empty values to nulls', async function () {
        const result = await readCSV({
            path: csvPath + 'multiple-records-with-empty-values.csv'
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].name.should.eql('Bob');

        result[1].email.should.eql('test@example.com');
        should.equal(result[1].name, null);
    });
});
