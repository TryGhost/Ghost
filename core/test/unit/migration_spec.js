/*globals describe, it, afterEach, beforeEach*/
var should          = require('should'),
    sinon           = require('sinon'),
    rewire          = require('rewire'),
    _               = require('lodash'),
    Promise         = require('bluebird'),
    crypto          = require('crypto'),
    fs              = require('fs'),

    // Stuff we are testing
    db              = require('../../server/data/db'),
    errors          = require('../../server/errors/'),
    exporter        = require('../../server/data/export'),
    schema          = require('../../server/data/schema'),

    // TODO: can go when fixClientSecret is moved
    models          = require('../../server/models'),

    migration       = rewire('../../server/data/migration'),
    fixtures        = require('../../server/data/migration/fixtures'),
    populate        = require('../../server/data/migration/populate'),
    update          = rewire('../../server/data/migration/update'),
    updates004      = require('../../server/data/migration/004'),

    defaultSettings = schema.defaultSettings,
    schemaTables    = Object.keys(schema.tables),

    sandbox = sinon.sandbox.create();

// Check version integrity
// These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
// without knowing that they also need to update the default database version,
// both of which are required for migrations to work properly.
describe('DB version integrity', function () {
    // Only these variables should need updating
    var currentDbVersion = '004',
        currentSchemaHash = 'a195562bf4915e3f3f610f6d178aba01',
        currentFixturesHash = '77ebb081539f9e0c49f487faf7fd929e';

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

describe('Migrations', function () {
    var loggerStub;

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        loggerStub = {
            info: sandbox.stub(),
            warn: sandbox.stub()
        };
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
                deleteStub.callCount.should.be.eql(schemaTables.length);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith(schemaTables[0]).should.be.true();

                done();
            }).catch(done);
        });

        it('should delete all tables in reverse order when called twice in a row', function (done) {
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
        var createStub, fixturesStub, settingsStub;

        beforeEach(function () {
            createStub = sandbox.stub(schema.commands, 'createTable').returns(new Promise.resolve());
            fixturesStub = sandbox.stub(fixtures, 'populate').returns(new Promise.resolve());
            settingsStub = sandbox.stub(fixtures, 'ensureDefaultSettings').returns(new Promise.resolve());
        });

        it('should create all tables, and populate fixtures', function (done) {
            populate(loggerStub).then(function (result) {
                should.not.exist(result);

                createStub.called.should.be.true();
                createStub.callCount.should.be.eql(schemaTables.length);
                createStub.firstCall.calledWith(schemaTables[0]).should.be.true();
                createStub.lastCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();

                fixturesStub.calledOnce.should.be.true();
                settingsStub.calledOnce.should.be.true();

                loggerStub.info.called.should.be.true();
                loggerStub.warn.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should should only create tables, with tablesOnly setting', function (done) {
            populate(loggerStub, true).then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                createStub.called.should.be.true();
                createStub.callCount.should.be.eql(schemaTables.length);
                createStub.firstCall.calledWith(schemaTables[0]).should.be.true();
                createStub.lastCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();

                fixturesStub.called.should.be.false();
                settingsStub.called.should.be.false();

                loggerStub.info.called.should.be.true();
                loggerStub.warn.called.should.be.false();

                done();
            }).catch(done);
        });
    });

    describe('Update', function () {
        describe('Update function', function () {
            var reset, backupStub, settingsStub, fixturesStub, setDbStub, errorStub, versionsSpy, tasksSpy;

            beforeEach(function () {
                // Stubs
                backupStub = sandbox.stub().returns(new Promise.resolve());
                settingsStub = sandbox.stub(fixtures, 'ensureDefaultSettings').returns(new Promise.resolve());
                fixturesStub = sandbox.stub(fixtures, 'update').returns(new Promise.resolve());
                setDbStub = sandbox.stub(schema.versioning, 'setDatabaseVersion').returns(new Promise.resolve());
                errorStub = sandbox.stub(schema.versioning, 'showCannotMigrateError').returns(new Promise.resolve());
                // Spys
                versionsSpy = sandbox.spy(schema.versioning, 'getMigrationVersions');
                tasksSpy = sandbox.spy(schema.versioning, 'getUpdateDatabaseTasks');

                // Internal overrides
                reset = update.__set__('backup', backupStub);
            });

            afterEach(function () {
                reset();
            });

            describe('Pre & post update process', function () {
                var updateStub, updateReset;

                beforeEach(function () {
                    // For these tests, stub out the actual update task
                    updateStub = sandbox.stub().returns(new Promise.resolve());
                    updateReset = update.__set__('updateDatabaseSchema', updateStub);
                });

                afterEach(function () {
                    updateReset();
                });

                it('should attempt to run the pre & post update tasks correctly', function (done) {
                    // Execute
                    update('100', '102', loggerStub).then(function () {
                        // Before the update, it does some tasks...
                        // It should not show an error for these versions
                        errorStub.called.should.be.false();
                        // getMigrationVersions should be called with the correct versions
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('100', '102').should.be.true();
                        // It should attempt to do a backup
                        backupStub.calledOnce.should.be.true();

                        // Now it's going to try to actually do the update...
                        updateStub.calledOnce.should.be.true();
                        updateStub.calledWith(['101', '102'], loggerStub).should.be.true();

                        // And now there are some final tasks to wrap up...
                        // First, the ensure default settings task
                        settingsStub.calledOnce.should.be.true();
                        // Then fixture updates
                        fixturesStub.calledOnce.should.be.true();
                        // And finally, set the new DB version
                        setDbStub.calledOnce.should.be.true();

                        // Because we stubbed everything, loggerStub didn't get called
                        loggerStub.info.called.should.be.false();
                        loggerStub.warn.called.should.be.false();

                        // Just to be sure, lets assert the call order
                        sinon.assert.callOrder(
                            versionsSpy, backupStub, updateStub, settingsStub, fixturesStub, setDbStub
                        );

                        done();
                    }).catch(done);
                });

                it('should throw error if versions are too old', function (done) {
                    // Execute
                    update('000', '002', loggerStub).then(function () {
                        // It should show an error for these versions
                        errorStub.called.should.be.true();

                        // And so should not do the update...
                        updateStub.calledOnce.should.be.false();

                        // Because we stubbed everything, loggerStub didn't get called
                        loggerStub.info.called.should.be.false();
                        loggerStub.warn.called.should.be.false();

                        done();
                    }).catch(done);
                });

                it('should upgrade from minimum version, if FORCE_MIGRATION is set', function (done) {
                    // Setup
                    process.env.FORCE_MIGRATION = true;

                    // Execute
                    update('005', '006', loggerStub).then(function () {
                        // It should not show an error for these versions
                        errorStub.called.should.be.false();

                        // getMigrationVersions should be called with the correct versions
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('003', '006').should.be.true();
                        versionsSpy.returned(['003', '004', '005', '006']).should.be.true();

                        // It should try to do the update
                        updateStub.calledOnce.should.be.true();
                        updateStub.calledWith(['004', '005', '006']).should.be.true();

                        // Because we stubbed everything, loggerStub didn't get called
                        loggerStub.info.called.should.be.false();
                        loggerStub.warn.called.should.be.false();

                        // Restore
                        delete process.env.FORCE_MIGRATION;

                        done();
                    }).catch(done);
                });
            });

            describe('Update to 004', function () {
                it('should call all the 004 database upgrade tasks', function (done) {
                    // Setup
                    // Create a new stub, this will replace sequence, so that db calls don't actually get run
                    var sequenceStub = sandbox.stub(),
                        sequenceReset = update.__set__('sequence', sequenceStub);

                    // The first time we call sequence, it should be to execute a top level version, e.g 004
                    // yieldsTo('0') means this stub will execute the function at index 0 of the array passed as the
                    // first argument. In short the `runVersionTasks` function gets executed, and sequence gets called
                    // again with the array of tasks to execute for 004, which is what we want to check
                    sequenceStub.onFirstCall().yieldsTo('0');

                    // Execute
                    update('003', '004', loggerStub).then(function () {
                        errorStub.called.should.be.false();
                        loggerStub.info.calledTwice.should.be.true();

                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('003', '004').should.be.true();
                        versionsSpy.returned(['003', '004']).should.be.true();

                        tasksSpy.calledOnce.should.be.true();
                        tasksSpy.calledWith('004', loggerStub).should.be.true();
                        tasksSpy.firstCall.returnValue.should.be.an.Array().with.lengthOf(5);

                        sequenceStub.calledTwice.should.be.true();
                        sequenceStub.firstCall.calledWith(sinon.match.array, loggerStub).should.be.true();
                        sequenceStub.secondCall.calledWith(sinon.match.array, loggerStub).should.be.true();

                        sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(1);
                        sequenceStub.secondCall.args[0].should.be.an.Array().with.lengthOf(5);

                        sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'runVersionTasks');

                        sequenceStub.secondCall.args[0][0].should.be.a.Function().with.property('name', 'addTourColumnToUsers');
                        sequenceStub.secondCall.args[0][1].should.be.a.Function().with.property('name', 'addSortOrderColumnToPostsTags');
                        sequenceStub.secondCall.args[0][2].should.be.a.Function().with.property('name', 'addManyColumnsToClients');
                        sequenceStub.secondCall.args[0][3].should.be.a.Function().with.property('name', 'addClientTrustedDomainsTable');
                        sequenceStub.secondCall.args[0][4].should.be.a.Function().with.property('name', 'dropUniqueOnClientsSecret');

                        // Reset sequence
                        sequenceReset();
                        done();
                    }).catch(done);
                });

                describe('Tasks:', function () {
                    var addColumnStub, createTableStub, getIndexesStub, dropUniqueStub,
                        knexStub, knexMock;

                    beforeEach(function () {
                        knexMock = sandbox.stub().returns({});
                        knexMock.schema = {
                            hasTable: sandbox.stub(),
                            hasColumn: sandbox.stub()
                        };
                        // this MUST use sinon, not sandbox, see sinonjs/sinon#781
                        knexStub = sinon.stub(db, 'knex', {get: function () { return knexMock; }});

                        addColumnStub = sandbox.stub(schema.commands, 'addColumn');
                        createTableStub = sandbox.stub(schema.commands, 'createTable');
                        getIndexesStub = sandbox.stub(schema.commands, 'getIndexes');
                        dropUniqueStub = sandbox.stub(schema.commands, 'dropUnique');
                    });

                    afterEach(function () {
                        knexStub.restore();
                    });

                    describe('01-add-tour-column-to-users', function () {
                        it('does not try to add a new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(new Promise.resolve(false));

                            // Execute
                            updates004[0](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.called.should.be.false();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('does not try to add a new column if the column already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'tour').returns(new Promise.resolve(true));

                            // Execute
                            updates004[0](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'tour').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new column if table is present but column is not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'tour').returns(new Promise.resolve(false));

                            // Execute
                            updates004[0](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'tour').should.be.true();

                                addColumnStub.calledOnce.should.be.true();
                                addColumnStub.calledWith('users', 'tour').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('02-add-sortorder-column-to-poststags', function () {
                        it('does not try to add a new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts_tags').returns(new Promise.resolve(false));

                            // Execute
                            updates004[1](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts_tags').should.be.true();

                                knexMock.schema.hasColumn.called.should.be.false();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('does not try to add a new column if the column already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts_tags').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts_tags', 'sort_order').returns(new Promise.resolve(true));

                            // Execute
                            updates004[1](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts_tags').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts_tags', 'sort_order').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new column if table is present but column is not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts_tags').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts_tags', 'sort_order').returns(new Promise.resolve(false));

                            // Execute
                            updates004[1](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts_tags').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts_tags', 'sort_order').should.be.true();

                                addColumnStub.calledOnce.should.be.true();
                                addColumnStub.calledWith('posts_tags', 'sort_order').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('03-add-many-columns-to-clients', function () {
                        it('does not try to add new columns if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(false));

                            // Execute
                            updates004[2](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.called.should.be.false();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('does not try to add new columns if the columns already exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'redirection_uri').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'logo').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'status').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'type').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'description').returns(new Promise.resolve(true));

                            // Execute
                            updates004[2](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.callCount.should.eql(5);
                                knexMock.schema.hasColumn.calledWith('clients', 'redirection_uri').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'logo').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'status').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'type').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'description').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.callCount.should.eql(5);

                                done();
                            }).catch(done);
                        });

                        it('tries to add new columns if table is present but columns are not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'redirection_uri').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'logo').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'status').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'type').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'description').returns(new Promise.resolve(false));

                            // Execute
                            updates004[2](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.callCount.should.eql(5);
                                knexMock.schema.hasColumn.calledWith('clients', 'redirection_uri').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'logo').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'status').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'type').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'description').should.be.true();

                                addColumnStub.callCount.should.eql(5);
                                addColumnStub.calledWith('clients', 'redirection_uri').should.be.true();
                                addColumnStub.calledWith('clients', 'logo').should.be.true();
                                addColumnStub.calledWith('clients', 'status').should.be.true();
                                addColumnStub.calledWith('clients', 'type').should.be.true();
                                addColumnStub.calledWith('clients', 'description').should.be.true();

                                loggerStub.info.callCount.should.eql(5);
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });

                        it('will only try to add columns that do not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'redirection_uri').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'logo').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'status').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'type').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'description').returns(new Promise.resolve(true));

                            // Execute
                            updates004[2](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.callCount.should.eql(5);
                                knexMock.schema.hasColumn.calledWith('clients', 'redirection_uri').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'logo').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'status').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'type').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'description').should.be.true();

                                addColumnStub.callCount.should.eql(2);
                                addColumnStub.calledWith('clients', 'logo').should.be.true();
                                addColumnStub.calledWith('clients', 'type').should.be.true();

                                loggerStub.info.callCount.should.eql(2);
                                loggerStub.warn.callCount.should.eql(3);

                                done();
                            }).catch(done);
                        });
                    });

                    describe('04-add-clienttrusteddomains-table', function () {
                        it('does not try to add a new table if the table already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('client_trusted_domains').returns(new Promise.resolve(true));

                            // Execute
                            updates004[3](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('client_trusted_domains').should.be.true();

                                createTableStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new table if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('client_trusted_domains').returns(new Promise.resolve(false));

                            // Execute
                            updates004[3](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('client_trusted_domains').should.be.true();

                                createTableStub.calledOnce.should.be.true();
                                createTableStub.calledWith('client_trusted_domains').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('05-drop-unique-on-clients-secret', function () {
                        it('does not try to drop unique if the table does not exist', function (done) {
                            // Setup
                            getIndexesStub.withArgs('clients').returns(new Promise.resolve(
                                ['clients_slug_unique', 'clients_name_unique', 'clients_secret_unique'])
                            );
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(false));

                            // Execute
                            updates004[4](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                getIndexesStub.called.should.be.false();

                                dropUniqueStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('does not try to drop unique if the index does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));

                            getIndexesStub.withArgs('clients').returns(new Promise.resolve(
                                ['clients_slug_unique', 'clients_name_unique'])
                            );

                            // Execute
                            updates004[4](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                getIndexesStub.calledOnce.should.be.true();
                                getIndexesStub.calledWith('clients').should.be.true();

                                dropUniqueStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a drop unique if table and index both exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));

                            getIndexesStub.withArgs('clients').returns(new Promise.resolve(
                                ['clients_slug_unique', 'clients_name_unique', 'clients_secret_unique'])
                            );

                            // Execute
                            updates004[4](loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                getIndexesStub.calledOnce.should.be.true();
                                getIndexesStub.calledWith('clients').should.be.true();

                                dropUniqueStub.calledOnce.should.be.true();
                                dropUniqueStub.calledWith('clients', 'secret').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });
                });
            });
        });

        describe('Update Database Schema', function () {
            var updateDatabaseSchema = update.__get__('updateDatabaseSchema'),
                getVersionTasksStub;

            beforeEach(function () {
                getVersionTasksStub = sandbox.stub(schema.versioning, 'getUpdateDatabaseTasks');
            });

            it('should not do anything if there are no tasks', function (done) {
                getVersionTasksStub.returns([]);

                updateDatabaseSchema(['001'], loggerStub).then(function () {
                    getVersionTasksStub.calledOnce.should.be.true();
                    loggerStub.info.called.should.be.false();
                    loggerStub.warn.called.should.be.false();
                    done();
                }).catch(done);
            });

            it('should call the tasks if they are provided', function (done) {
                var task1Stub = sandbox.stub().returns(new Promise.resolve()),
                    task2Stub = sandbox.stub().returns(new Promise.resolve());

                getVersionTasksStub.returns([task1Stub, task2Stub]);

                updateDatabaseSchema(['001'], loggerStub).then(function () {
                    getVersionTasksStub.calledOnce.should.be.true();
                    task1Stub.calledOnce.should.be.true();
                    task2Stub.calledOnce.should.be.true();
                    loggerStub.info.calledTwice.should.be.true();

                    sinon.assert.callOrder(getVersionTasksStub, loggerStub.info, loggerStub.info,  task1Stub, task2Stub);

                    done();
                }).catch(done);
            });
        });
    });

    describe('Init', function () {
        var defaultVersionStub, databaseVersionStub, errorStub, updateStub, populateStub, fixSecretStub,
            resetLog, resetUpdate, resetPopulate, resetFixSecret;

        beforeEach(function () {
            defaultVersionStub = sandbox.stub(schema.versioning, 'getDefaultDatabaseVersion');
            databaseVersionStub = sandbox.stub(schema.versioning, 'getDatabaseVersion');
            errorStub = sandbox.stub(errors, 'logErrorAndExit');
            updateStub = sandbox.stub();
            populateStub = sandbox.stub();
            fixSecretStub = sandbox.stub();

            resetLog = migration.__set__('logger', loggerStub);
            resetUpdate = migration.__set__('update', updateStub);
            resetPopulate = migration.__set__('populate', populateStub);
            resetFixSecret = migration.__set__('fixClientSecret', fixSecretStub);
        });

        afterEach(function () {
            resetLog();
            resetUpdate();
            resetPopulate();
            resetFixSecret();
        });

        it('should do an UPDATE if default version is higher', function (done) {
            // Setup
            defaultVersionStub.returns('005');
            databaseVersionStub.returns(new Promise.resolve('004'));

            // Execute
            migration.init().then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                updateStub.calledOnce.should.be.true();
                updateStub.calledWith('004', '005', loggerStub).should.be.true();

                errorStub.called.should.be.false();
                populateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should do an UPDATE if default version is significantly higher', function (done) {
            // Setup
            defaultVersionStub.returns('010');
            databaseVersionStub.returns(new Promise.resolve('004'));

            // Execute
            migration.init().then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                updateStub.calledOnce.should.be.true();
                updateStub.calledWith('004', '010', loggerStub).should.be.true();

                errorStub.called.should.be.false();
                populateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should do FIX SECRET if versions are the same', function (done) {
            // Setup
            defaultVersionStub.returns('004');
            databaseVersionStub.returns(new Promise.resolve('004'));

            // Execute
            migration.init().then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                fixSecretStub.called.should.be.true();

                errorStub.called.should.be.false();
                updateStub.called.should.be.false();
                populateStub.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should do an UPDATE even if versions are the same, when FORCE_MIGRATION set', function (done) {
            // Setup
            defaultVersionStub.returns('004');
            databaseVersionStub.returns(new Promise.resolve('004'));
            process.env.FORCE_MIGRATION = true;

            // Execute
            migration.init().then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                updateStub.calledOnce.should.be.true();
                updateStub.calledWith('004', '004', loggerStub).should.be.true();

                errorStub.called.should.be.false();
                populateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                delete process.env.FORCE_MIGRATION;
                done();
            }).catch(done);
        });

        it('should do a POPULATE if settings table does not exist', function (done) {
            // Setup
            defaultVersionStub.returns('004');
            databaseVersionStub.returns(new Promise.reject(new Error('Settings table does not exist')));

            // Execute
            migration.init().then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                populateStub.called.should.be.true();
                populateStub.calledWith(loggerStub, false).should.be.true();

                errorStub.called.should.be.false();
                updateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should do a POPULATE with TABLES ONLY if settings table does not exist & tablesOnly is set', function (done) {
            // Setup
            defaultVersionStub.returns('004');
            databaseVersionStub.returns(new Promise.reject(new Error('Settings table does not exist')));

            // Execute
            migration.init(true).then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                populateStub.called.should.be.true();
                populateStub.calledWith(loggerStub, true).should.be.true();

                errorStub.called.should.be.false();
                updateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should throw an error if the database version is higher than the default', function (done) {
            // Setup
            defaultVersionStub.returns('004');
            databaseVersionStub.returns(new Promise.resolve('010'));

            // Execute
            migration.init().then(function () {
                defaultVersionStub.calledOnce.should.be.true();
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.called.should.be.false();
                loggerStub.warn.called.should.be.false();
                errorStub.calledOnce.should.be.true();

                populateStub.called.should.be.false();
                updateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                done();
            }).catch(done);
        });

        it('should throw an error if the database version returns an error other than settings not existing', function (done) {
            // Setup
            defaultVersionStub.returns('004');
            databaseVersionStub.returns(new Promise.reject(new Error('Something went wrong')));

            // Execute
            migration.init().then(function () {
                databaseVersionStub.calledOnce.should.be.true();
                loggerStub.info.called.should.be.false();
                loggerStub.warn.called.should.be.false();
                errorStub.calledOnce.should.be.true();

                defaultVersionStub.calledOnce.should.be.false();
                populateStub.called.should.be.false();
                updateStub.called.should.be.false();
                fixSecretStub.called.should.be.false();

                done();
            }).catch(done);
        });
    });

    describe('Logger', function () {
        var logger, errorsInfoStub, errorsWarnStub;

        beforeEach(function () {
            logger = migration.__get__('logger');
            errorsInfoStub = sandbox.stub(errors, 'logComponentInfo');
            errorsWarnStub = sandbox.stub(errors, 'logComponentWarn');
        });

        it('should output an info message prefixed with "Migrations"', function () {
            logger.info('Stuff');

            errorsInfoStub.calledOnce.should.be.true();
            errorsInfoStub.calledWith('Migrations', 'Stuff').should.be.true();
            errorsWarnStub.called.should.be.false();
        });

        it('should output a warn message prefixed with "Skipped Migrations"', function () {
            logger.warn('Stuff');

            errorsWarnStub.calledOnce.should.be.true();
            errorsWarnStub.calledWith('Skipping Migrations', 'Stuff').should.be.true();
            errorsInfoStub.called.should.be.false();
        });
    });

    // TODO: move this to 005!!
    describe('FixClientSecret', function () {
        var fixClientSecret, queryStub, clientForgeStub, clientEditStub, toStringStub, cryptoStub;

        beforeEach(function () {
            fixClientSecret = migration.__get__('fixClientSecret');
            queryStub = {
                query: sandbox.stub().returnsThis(),
                fetch: sandbox.stub()
            };

            models.init();
            toStringStub = {toString: sandbox.stub().returns('TEST')};
            cryptoStub = sandbox.stub(crypto, 'randomBytes').returns(toStringStub);
            clientForgeStub = sandbox.stub(models.Clients, 'forge').returns(queryStub);
            clientEditStub = sandbox.stub(models.Client, 'edit');
        });

        it('should do nothing if there are no incorrect secrets', function (done) {
            // Setup
            queryStub.fetch.returns(new Promise.resolve({models: []}));

            // Execute
            fixClientSecret().then(function () {
                clientForgeStub.calledOnce.should.be.true();
                clientEditStub.called.should.be.false();
                toStringStub.toString.called.should.be.false();
                cryptoStub.called.should.be.false();
                done();
            }).catch(done);
        });

        it('should try to fix any incorrect secrets', function (done) {
            // Setup
            queryStub.fetch.returns(new Promise.resolve({models: [{id: 1}]}));

            // Execute
            fixClientSecret().then(function () {
                clientForgeStub.calledOnce.should.be.true();
                clientEditStub.called.should.be.true();
                toStringStub.toString.called.should.be.false();
                cryptoStub.called.should.be.false();
                done();
            }).catch(done);
        });

        it('should try to create a new secret, if the mode is not testing', function (done) {
            // Setup
            var envTemp = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            queryStub.fetch.returns(new Promise.resolve({models: [{id: 1}]}));

            // Execute
            fixClientSecret().then(function () {
                clientForgeStub.calledOnce.should.be.true();
                clientEditStub.called.should.be.true();
                toStringStub.toString.called.should.be.true();
                cryptoStub.calledOnce.should.be.true();

                // reset
                process.env.NODE_ENV = envTemp;
                done();
            }).catch(done);
        });
    });
});
