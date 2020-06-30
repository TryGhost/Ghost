const should = require('should');
const path = require('path');
const {readCSV} = require('../lib/parse');
const csvPath = path.join(__dirname, '/fixtures/');

describe('read csv', function () {
    it('read csv: one column', async function () {
        const result = await readCSV({
            path: csvPath + 'single-column-with-header.csv',
            columnsToExtract: [{name: 'email', lookup: /email/i}]
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('read csv: two columns, 1 filter', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-with-header.csv',
            columnsToExtract: [{name: 'email', lookup: /email/i}]
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
        should.not.exist(result[0].id);
    });

    it('read csv: two columns, 2 filters', async function () {
        const result = await readCSV({
            path: csvPath + 'two-columns-obscure-header.csv',
            columnsToExtract: [
                {name: 'email', lookup: /email/i},
                {name: 'id', lookup: /id/i}
            ]
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
                email: 'correo_electronico',
                name: 'nombre',
                id: 'id'
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
                email: 'correo_electronico'
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
});
