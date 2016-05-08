/*globals describe, beforeEach, afterEach, it*/

var utils = require('../../../server/utils'),
    errors = require('../../../server/errors'),
    sinon = require('sinon'),
    should = require('should'),
    fs = require('fs'),
    lodash = require('lodash'),
    readline = require('readline');

describe('read csv', function () {
    var scope = {};

    beforeEach(function () {
        sinon.stub(fs, 'createReadStream');

        sinon.stub(readline, 'createInterface', function () {
            return {
                on: function (eventName, cb) {
                    switch (eventName) {
                        case 'line':
                            lodash.each(scope.csv, function (line) {
                                cb(line);
                            });
                            break;
                        case 'close':
                            cb();
                            break;
                    }
                }
            };
        });
    });

    afterEach(function () {
        fs.createReadStream.restore();
        readline.createInterface.restore();
    });

    it('read csv: one column', function (done) {
        scope.csv = [
            'email',
            'hannah@ghost.org',
            'kate@ghost.org'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email']
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('hannah@ghost.org');
            result[1].email.should.eql('kate@ghost.org');
            done();
        }).catch(done);
    });

    it('read csv: two columns', function (done) {
        scope.csv = [
            'id,email',
            '1,hannah@ghost.org',
            '1,kate@ghost.org'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email']
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('hannah@ghost.org');
            result[1].email.should.eql('kate@ghost.org');
            should.not.exist(result[0].id);

            done();
        }).catch(done);
    });

    it('read csv: two columns', function (done) {
        scope.csv = [
            'id,email',
            '1,hannah@ghost.org',
            '2,kate@ghost.org'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email', 'id']
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('hannah@ghost.org');
            result[0].id.should.eql('1');
            result[1].email.should.eql('kate@ghost.org');
            result[1].id.should.eql('2');
            done();
        }).catch(done);
    });

    it('read csv: test email regex', function (done) {
        scope.csv = [
            'email_address',
            'hannah@ghost.org',
            'kate@ghost.org'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email']
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('hannah@ghost.org');
            result[1].email.should.eql('kate@ghost.org');
            done();
        }).catch(done);
    });

    it('read csv: support single column use case', function (done) {
        scope.csv = [
            'a_column',
            'hannah@ghost.org',
            'kate@ghost.org'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email']
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(2);
            result[0].email.should.eql('hannah@ghost.org');
            result[1].email.should.eql('kate@ghost.org');
            done();
        }).catch(done);
    });

    it('read csv: support single column use case (we would loose the first entry)', function (done) {
        scope.csv = [
            'hannah@ghost.org',
            'kate@ghost.org'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email']
        }).then(function (result) {
            should.exist(result);
            result.length.should.eql(1);
            result[0].email.should.eql('kate@ghost.org');
            done();
        }).catch(done);
    });

    it('read csv: broken', function (done) {
        scope.csv = [
            'id,test',
            '1,2',
            '1,2'
        ];

        utils.readCSV({
            path: 'read-file-is-mocked',
            columnsToExtract: ['email', 'id']
        }).then(function () {
            return done(new Error('we expected an error from read csv!'));
        }).catch(function (err) {
            (err instanceof errors.ValidationError).should.eql(true);
            done();
        });
    });
});
