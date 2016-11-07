var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    crypto = require('crypto'),
    fs = require('fs'),
    errors = require('../../server/errors'),
    models = require('../../server/models'),
    exporter = require('../../server/data/export'),
    schema = require('../../server/data/schema'),
    migration = rewire('../../server/data/migration'),
    fixtures = require('../../server/data/migration/fixtures'),
    populate = require('../../server/data/migration/populate'),
    update = rewire('../../server/data/migration/update'),
    defaultSettings = schema.defaultSettings,
    schemaTables = Object.keys(schema.tables),
    sandbox = sinon.sandbox.create();

// Check version integrity
// These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
// without knowing that they also need to update the default database version,
// both of which are required for migrations to work properly.
describe.skip('DB version integrity', function () {
    // Only these variables should need updating
    var currentDbVersion = 'alpha.1',
        currentSchemaHash = 'b3bdae210526b2d4393359c3e45d7f83',
        currentFixturesHash = '30b0a956b04e634e7f2cddcae8d2fd20';

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

/**
 * we don't use our logic anymore
 * so some tests are failing
 *
 * @TODO: kate-migrations
 */
describe.skip('Migrations', function () {
    var loggerStub, resetLogger;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
        resetLogger();
    });

    beforeEach(function () {
        loggerStub = {
            info: sandbox.stub(),
            warn: sandbox.stub()
        };

        resetLogger = update.__set__('logger', loggerStub);
    });

    describe('Backup', function () {
        var exportStub, filenameStub, fsStub;

        beforeEach(function () {
            exportStub = sandbox.stub(exporter, 'doExport').returns(new Promise.resolve());
            filenameStub = sandbox.stub(exporter, 'fileName').returns(new Promise.resolve('test'));
            fsStub = sandbox.stub(fs, 'writeFile').yields();
        });

        it('should create a backup JSON file', function (done) {
            migration.backupDatabase(loggerStub).then(function () {
                exportStub.calledOnce.should.be.true();
                filenameStub.calledOnce.should.be.true();
                fsStub.calledOnce.should.be.true();
                loggerStub.info.calledTwice.should.be.true();

                done();
            }).catch(done);
        });

        it('should fall back to console.log if no logger provided', function (done) {
            var noopStub = sandbox.stub(_, 'noop');

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
        var deleteStub;

        beforeEach(function () {
            deleteStub = sandbox.stub(schema.commands, 'deleteTable').returns(new Promise.resolve());
        });

        it('should delete all tables in reverse order', function (done) {
            migration.reset().then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length + 1);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith('migrations').should.be.true();

                done();
            }).catch(done);
        });

        it('should delete all tables in reverse order when called twice in a row', function (done) {
            migration.reset().then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length + 1);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith('migrations').should.be.true();

                return migration.reset();
            }).then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length * 2 + 2);
                // First call (second set) should be called with the last table
                deleteStub.getCall(schemaTables.length).calledWith('migrations').should.be.true();
                // Last call (second Set) should be called with the first table
                // deleteStub.getCall(schemaTables.length * 2 + 2).calledWith(schemaTables[0]).should.be.true();

                done();
            }).catch(done);
        });
    });

    describe('Populate', function () {
        var createStub, fixturesStub, setDatabaseVersionStub, populateDefaultsStub;

        beforeEach(function () {
            fixturesStub = sandbox.stub(fixtures, 'populate').returns(new Promise.resolve());
        });

        it('should create all tables, and populate fixtures', function (done) {
            createStub = sandbox.stub(schema.commands, 'createTable').returns(new Promise.resolve());
            setDatabaseVersionStub = sandbox.stub(schema.versioning, 'setDatabaseVersion').returns(new Promise.resolve());
            populateDefaultsStub = sandbox.stub(models.Settings, 'populateDefaults').returns(new Promise.resolve());

            populate().then(function (result) {
                should.not.exist(result);

                populateDefaultsStub.called.should.be.true();
                setDatabaseVersionStub.called.should.be.true();
                createStub.called.should.be.true();
                createStub.callCount.should.be.eql(schemaTables.length);
                createStub.firstCall.calledWith(schemaTables[0]).should.be.true();
                createStub.lastCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                fixturesStub.calledOnce.should.be.true();
                done();
            }).catch(done);
        });

        it('should rollback if error occurs', function (done) {
            var i = 0;

            createStub = sandbox.stub(schema.commands, 'createTable', function () {
                i = i + 1;

                if (i > 10) {
                    return new Promise.reject(new Error('error on table creation :('));
                }

                return new Promise.resolve();
            });

            populate()
                .then(function () {
                    done(new Error('should throw an error for database population'));
                })
                .catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.GhostError).should.eql(true);
                    createStub.callCount.should.eql(11);
                    done();
                });
        });
    });

    describe('isDatabaseOutOfDate', function () {
        var updateDatabaseSchemaStub, updateDatabaseSchemaReset, versionsSpy;

        beforeEach(function () {
            versionsSpy = sandbox.spy(schema.versioning, 'getMigrationVersions');

            // For these tests, stub out the actual update task
            updateDatabaseSchemaStub = sandbox.stub().returns(new Promise.resolve());
            updateDatabaseSchemaReset = update.__set__('updateDatabaseSchema', updateDatabaseSchemaStub);
        });

        afterEach(function () {
            updateDatabaseSchemaReset();
        });

        it('should throw error if versions are too old', function () {
            var response = update.isDatabaseOutOfDate({fromVersion: '0.8', toVersion: '1.0'});
            updateDatabaseSchemaStub.calledOnce.should.be.false();
            (response.error instanceof errors.DatabaseVersionError).should.eql(true);
        });

        it('should just return if versions are the same', function () {
            var migrateToDatabaseVersionStub = sandbox.stub().returns(new Promise.resolve()),
                migrateToDatabaseVersionReset = update.__set__('migrateToDatabaseVersion', migrateToDatabaseVersionStub),
                response = update.isDatabaseOutOfDate({fromVersion: '1.0', toVersion: '1.0'});

            response.migrate.should.eql(false);
            versionsSpy.calledOnce.should.be.false();
            migrateToDatabaseVersionStub.callCount.should.eql(0);
            migrateToDatabaseVersionReset();
        });

        it('should throw an error if the database version is higher than the default', function () {
            var response = update.isDatabaseOutOfDate({fromVersion: '1.3', toVersion: '1.2'});
            updateDatabaseSchemaStub.calledOnce.should.be.false();
            (response.error instanceof errors.DatabaseVersionError).should.eql(true);
        });
    });
});
