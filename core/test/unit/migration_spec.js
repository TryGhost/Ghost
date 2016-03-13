/*globals describe, it, afterEach*/
var should          = require('should'),
    sinon           = require('sinon'),
    _               = require('lodash'),
    Promise         = require('bluebird'),
    crypto          = require('crypto'),
    fs              = require('fs'),

    // Stuff we are testing
    exporter        = require('../../server/data/export'),
    fixtures        = require('../../server/data/migration/fixtures'),
    migration       = require('../../server/data/migration'),
    populate        = require('../../server/data/migration/populate'),
    schema          = require('../../server/data/schema'),

    defaultSettings = schema.defaultSettings,
    schemaTables    = Object.keys(schema.tables),

    sandbox = sinon.sandbox.create();

describe('Migrations', function () {
    afterEach(function () {
        sandbox.restore();
    });

    // Check version integrity
    // These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
    // without knowing that they also need to update the default database version,
    // both of which are required for migrations to work properly.
    describe('DB version integrity', function () {
        // Only these variables should need updating
        var currentDbVersion = '004',
            currentSchemaHash = 'a195562bf4915e3f3f610f6d178aba01',
            currentFixturesHash = '17d6aa36a6ba904adca90279eb929381';

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
            fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures.fixtures)).digest('hex');

            // Test!
            defaultSettings.core.databaseVersion.defaultValue.should.eql(currentDbVersion);
            schemaHash.should.eql(currentSchemaHash);
            fixturesHash.should.eql(currentFixturesHash);
            schema.versioning.canMigrateFromVersion.should.eql('003');
        });
    });

    describe('Backup', function () {
        it('should create a backup JSON file', function (done) {
            var exportStub = sandbox.stub(exporter, 'doExport').returns(new Promise.resolve()),
                filenameStub = sandbox.stub(exporter, 'fileName').returns(new Promise.resolve('test')),
                logStub = sandbox.stub(),
                fsStub = sandbox.stub(fs, 'writeFile').yields();

            migration.backupDatabase(logStub).then(function () {
                exportStub.calledOnce.should.be.true();
                filenameStub.calledOnce.should.be.true();
                fsStub.calledOnce.should.be.true();
                logStub.calledTwice.should.be.true();

                done();
            }).catch(done);
        });

        it('should fall back to console.log if no logger provided', function (done) {
            var exportStub = sandbox.stub(exporter, 'doExport').returns(new Promise.resolve()),
                filenameStub = sandbox.stub(exporter, 'fileName').returns(new Promise.resolve('test')),
                noopStub = sandbox.stub(_, 'noop'),
                fsStub = sandbox.stub(fs, 'writeFile').yields();

            migration.backupDatabase().then(function () {
                exportStub.calledOnce.should.be.true();
                filenameStub.calledOnce.should.be.true();
                fsStub.calledOnce.should.be.true();
                noopStub.calledTwice.should.be.true();
                // restore early so we get the test output
                noopStub.restore();

                done();
            }).catch(done);
        });
    });

    describe('Reset', function () {
        it('should delete all tables in reverse order', function (done) {
            // Setup
            var deleteStub = sandbox.stub(schema.commands, 'deleteTable').returns(new Promise.resolve());

            // Execute
            migration.reset().then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith(schemaTables[0]).should.be.true();

                done();
            }).catch(done);
        });

        it('should delete all tables in reverse order when called twice in a row', function (done) {
            // Setup
            var deleteStub = sandbox.stub(schema.commands, 'deleteTable').returns(new Promise.resolve());

            // Execute
            migration.reset().then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith(schemaTables[0]).should.be.true();

                return migration.reset();
            }).then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length * 2);
                // First call (second set) should be called with the last table
                deleteStub.getCall(schemaTables.length).calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call (second Set) should be called with the first table
                deleteStub.getCall(schemaTables.length * 2 - 1).calledWith(schemaTables[0]).should.be.true();

                done();
            }).catch(done);
        });
    });

    describe('Populate', function () {
        it('should create all tables, and populate fixtures', function (done) {
            // Setup
            var createStub = sandbox.stub(schema.commands, 'createTable').returns(new Promise.resolve()),
                fixturesStub = sandbox.stub(fixtures, 'populate').returns(new Promise.resolve()),
                settingsStub = sandbox.stub(fixtures, 'ensureDefaultSettings').returns(new Promise.resolve()),
                logStub = sandbox.stub();

            populate(logStub).then(function (result) {
                should.not.exist(result);

                createStub.called.should.be.true();
                createStub.callCount.should.be.eql(schemaTables.length);
                createStub.firstCall.calledWith(schemaTables[0]).should.be.true();
                createStub.lastCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();

                fixturesStub.calledOnce.should.be.true();
                settingsStub.calledOnce.should.be.true();

                done();
            });
        });

        it('should should only create tables, with tablesOnly setting', function (done) {
            // Setup
            var createStub = sandbox.stub(schema.commands, 'createTable').returns(new Promise.resolve()),
                fixturesStub = sandbox.stub(fixtures, 'populate').returns(new Promise.resolve()),
                settingsStub = sandbox.stub(fixtures, 'ensureDefaultSettings').returns(new Promise.resolve()),
                logStub = sandbox.stub();

            populate(logStub, true).then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                createStub.called.should.be.true();
                createStub.callCount.should.be.eql(schemaTables.length);
                createStub.firstCall.calledWith(schemaTables[0]).should.be.true();
                createStub.lastCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();

                fixturesStub.called.should.be.false();
                settingsStub.called.should.be.false();

                done();
            });
        });
    });

    describe('Update', function () {
        it('should be tested!');
    });
});
