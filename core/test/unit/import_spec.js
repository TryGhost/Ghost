/*globals describe, beforeEach, it*/
var testUtils = require('../utils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    assert = require('assert'),
    _ = require("underscore"),
    errors = require('../../server/errorHandling'),

    // Stuff we are testing
    knex = require("../../server/models/base").knex,
    migration = require('../../server/data/migration'),
    exporter = require('../../server/data/export'),
    importer = require('../../server/data/import'),
    Importer000 = require('../../server/data/import/000'),
    Importer001 = require('../../server/data/import/001'),
    fixtures = require('../../server/data/fixtures'),
    Settings = require('../../server/models/settings').Settings;

describe("Import", function () {

    should.exist(exporter);
    should.exist(importer);

    beforeEach(function (done) {
        // clear database... we need to initialise it manually for each test
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it("resolves 000", function (done) {
        var importStub = sinon.stub(Importer000, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("000", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    it("resolves 001", function (done) {
        var importStub = sinon.stub(Importer001, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("001", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    describe("000", function () {
        should.exist(Importer000);

        it("imports data from 001", function (done) {
            var exportData;
            var migrationStub = sinon.stub(migration, "getDatabaseVersion", function () {
                return when.resolve("000");
            });

            // migrate to current version
            migration.migrateUp().then(function () {
                // Load the fixtures
                return fixtures.populateFixtures();
            }).then(function () {
                // Initialise the default settings
                return Settings.populateDefaults();
            }).then(function () {
                // export the version 000 data ready to import
                // TODO: Should have static test data here?
                return exporter();
            }).then(function (exported) {
                exportData = exported;

                return importer("000", exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]);
            }).then(function (importedData) {

                should.exist(importedData);
                importedData.length.should.equal(4, 'Did not get data successfully');

                // we always have 0 users as there isn't one in fixtures
                importedData[0].length.should.equal(0, 'There should not be a user');
                // import no longer requires all data to be dropped, and adds posts
                importedData[1].length.should.equal(exportData.data.posts.length + 1, 'Wrong number of posts');

                // test settings
                importedData[2].length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(importedData[2], {key: "databaseVersion"}).value.should.equal("001", 'Wrong database version');

                // test tags
                importedData[3].length.should.equal(exportData.data.tags.length, 'no new tags');

                done();
            }).then(null, done);
        });
    });

    describe("001", function () {
        should.exist(Importer001);

        it("imports data from 001", function (done) {
            var exportData,
                timestamp = 1349928000000;

            // Migrate to version 001
            migration.migrateUp().then(function () {
                // Load the fixtures
                return fixtures.populateFixtures();
            }).then(function () {
                // Initialise the default settings
                return Settings.populateDefaults();
            }).then(function () {
                // export the version 000 data ready to import
                // TODO: Should have static test data here?
                return exporter();
            }).then(function (exported) {
                exportData = exported;

                // Modify timestamp data for testing
                exportData.data.posts[0].created_at = timestamp;
                exportData.data.posts[0].updated_at = timestamp;
                exportData.data.posts[0].published_at = timestamp;

                return importer("001", exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(4, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    settings = importedData[2],
                    tags = importedData[3];

                // we always have 0 users as there isn't one in fixtures
                users.length.should.equal(0, 'There should not be a user');
                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length + 1, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("001", 'Wrong database version');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistant for all DBs.
                assert.equal( new Date(posts[1].created_at).getTime(), timestamp);
                assert.equal( new Date(posts[1].updated_at).getTime(), timestamp);
                assert.equal( new Date(posts[1].published_at).getTime(), timestamp);

                done();
            }).then(null, done);
        });

        it("doesn't import invalid post data from 001", function (done) {
            var exportData;
            // migrate to current version
            migration.migrateUp().then(function () {
                // Load the fixtures
                return fixtures.populateFixtures();
            }).then(function () {
                // Initialise the default settings
                return Settings.populateDefaults();
            }).then(function () {
                // export the version 000 data ready to import
                // TODO: Should have static test data here?
                return exporter();
            }).then(function (exported) {
                exportData = exported;
                //change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer("001", exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error.should.eql('Error importing data: Post title maximum length is 150 characters.');

                when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]).then(function (importedData) {
                    should.exist(importedData);
                    importedData.length.should.equal(4, 'Did not get data successfully');

                    // we always have 0 users as there isn't one in fixtures
                    importedData[0].length.should.equal(0, 'There should not be a user');
                    // import no longer requires all data to be dropped, and adds posts
                    importedData[1].length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // test settings
                    importedData[2].length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(importedData[2], {key: "databaseVersion"}).value.should.equal("001", 'Wrong database version');

                    // test tags
                    importedData[3].length.should.equal(exportData.data.tags.length, 'no new tags');

                    done();
                });

            }).then(null, done);
        });
        it("doesn't import invalid settings data from 001", function (done) {
            var exportData;

            // migrate to current version
            migration.migrateUp().then(function () {
                // Load the fixtures
                return fixtures.populateFixtures();
            }).then(function () {
                // Initialise the default settings
                return Settings.populateDefaults();
            }).then(function () {
                // export the version 000 data ready to import
                // TODO: Should have static test data here?
                return exporter();
            }).then(function (exported) {
                exportData = exported;
                //change to blank settings key
                exportData.data.settings[3].key = null;
                return importer("001", exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error.should.eql('Error importing data: Setting key cannot be blank');
                when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]).then(function (importedData) {
                    should.exist(importedData);
                    importedData.length.should.equal(4, 'Did not get data successfully');

                    // we always have 0 users as there isn't one in fixtures
                    importedData[0].length.should.equal(0, 'There should not be a user');
                    // import no longer requires all data to be dropped, and adds posts
                    importedData[1].length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // test settings
                    importedData[2].length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(importedData[2], {key: "databaseVersion"}).value.should.equal("001", 'Wrong database version');

                    // test tags
                    importedData[3].length.should.equal(exportData.data.tags.length, 'no new tags');

                    done();
                });

            }).then(null, done);
        });
    });

});
