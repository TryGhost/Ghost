var should = require('should'),
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
    defaultSettings = schema.defaultSettings,
    sandbox = sinon.sandbox.create();

// Check version integrity
// These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
// without knowing that they also need to update the default database version,
// both of which are required for migrations to work properly.
describe('DB version integrity', function () {
    // Only these variables should need updating
    var currentSchemaHash = '71d6b843f798352f804db09e5478eef5',
        currentFixturesHash = 'c08c23c38a3732452a48915952861fc7';

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

        schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation)).digest('hex');
        fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures)).digest('hex');

        // by default the database version is null
        should.not.exist(defaultSettings.core.databaseVersion.defaultValue);
        schemaHash.should.eql(currentSchemaHash);
        fixturesHash.should.eql(currentFixturesHash);
        schema.versioning.canMigrateFromVersion.should.eql('1.0');
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
