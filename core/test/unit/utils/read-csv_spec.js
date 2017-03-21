var should = require('should'),
    utils = require('../../../server/utils'),
    path = require('path'),
    csvPath = path.join(__dirname, '../../utils/fixtures/csv/');

describe('read csv', function () {
    it('read csv: one column', function (done) {
        utils.readCSV({
            path: csvPath + 'single-column-with-header.csv',
            columnsToExtract: [{name: 'email', lookup: /email/i}]
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(3);
            result[0].email.should.eql('email');
            result[1].email.should.eql('jbloggs@example.com');
            result[2].email.should.eql('test@example.com');
            done();
        }).catch(done);
    });

    it('read csv: two columns, 1 filter', function (done) {
        utils.readCSV({
            path: csvPath + 'two-columns-with-header.csv',
            columnsToExtract: [{name: 'email', lookup: /email/i}]
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('jbloggs@example.com');
            result[1].email.should.eql('test@example.com');
            should.not.exist(result[0].id);

            done();
        }).catch(done);
    });

    it('read csv: two columns, 2 filters', function (done) {
        utils.readCSV({
            path: csvPath + 'two-columns-obscure-header.csv',
            columnsToExtract: [
                {name: 'email', lookup: /email/i},
                {name: 'id', lookup: /id/i}
            ]
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('jbloggs@example.com');
            result[0].id.should.eql('1');
            result[1].email.should.eql('test@example.com');
            result[1].id.should.eql('2');
            done();
        }).catch(done);
    });
});
