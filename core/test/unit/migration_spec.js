var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    crypto = require('crypto'),
    fs = require('fs'),
    models = require('../../server/models'),
    exporter = require('../../server/data/export'),
    schema = require('../../server/data/schema'),
    backupDatabase = rewire('../../server/data/db/backup'),
    fixtures = require('../../server/data/schema/fixtures'),

    sandbox = sinon.sandbox.create();

// Check version integrity
// These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
// without knowing that they also need to update the default database version,
// both of which are required for migrations to work properly.
describe('DB version integrity', function () {
    // Only these variables should need updating
    var currentSchemaHash = '329f9b498944c459040426e16fc65b11',
        currentFixturesHash = '90925e0004a0cedd1e6ea789c81ec67d';

    // If this test is failing, then it is likely a change has been made that requires a DB version bump,
    // and the values above will need updating as confirmation
    it('should not change without fixing this test', function () {
        var tablesNoValidation = _.cloneDeep(schema.tables),
            schemaHash,
            fixturesHash;

        _.each(tablesNoValidation, function (table) {
            return _.each(table, function (column, name) {
                table[name] = _.omit(column, 'validations');
            });
        });

        schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation), 'binary').digest('hex');
        fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures), 'binary').digest('hex');

        schemaHash.should.eql(currentSchemaHash);
        fixturesHash.should.eql(currentFixturesHash);
    });
});

describe('Migrations', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Backup', function () {
        var exportStub, filenameStub, fsStub;

        beforeEach(function () {
            exportStub = sandbox.stub(exporter, 'doExport').returns(new Promise.resolve());
            filenameStub = sandbox.stub(exporter, 'fileName').returns(new Promise.resolve('test'));
            fsStub = sandbox.stub(fs, 'writeFile').yields();
        });

        it('should create a backup JSON file', function (done) {
            backupDatabase().then(function () {
                exportStub.calledOnce.should.be.true();
                filenameStub.calledOnce.should.be.true();
                fsStub.calledOnce.should.be.true();

                done();
            }).catch(done);
        });
    });
});
