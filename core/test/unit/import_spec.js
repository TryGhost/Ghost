/*globals describe, beforeEach, it*/
var testUtils = require('../utils'),
    should    = require('should'),
    sinon     = require('sinon'),
    when      = require('when'),
    assert    = require('assert'),
    _         = require("lodash"),
    errors    = require('../../server/errorHandling'),

    // Stuff we are testing
    knex        = require("../../server/models/base").knex,
    migration   = require('../../server/data/migration'),
    exporter    = require('../../server/data/export'),
    importer    = require('../../server/data/import'),
    Importer000 = require('../../server/data/import/000'),
    Importer001 = require('../../server/data/import/001'),
    Importer002 = require('../../server/data/import/002'),
    Importer003 = require('../../server/data/import/003'),
    fixtures    = require('../../server/data/fixtures'),
    Settings    = require('../../server/models/settings').Settings;

describe("Import", function () {

    should.exist(exporter);
    should.exist(importer);

    var sandbox;

    beforeEach(function (done) {
        sandbox = sinon.sandbox.create();
        // clear database... we need to initialise it manually for each test
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("resolves 000", function (done) {
        var importStub = sandbox.stub(Importer000, "importData", function () {
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
        var importStub = sandbox.stub(Importer001, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("001", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    it("resolves 002", function (done) {
        var importStub = sandbox.stub(Importer002, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("002", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    it("resolves 003", function (done) {
        var importStub = sandbox.stub(Importer003, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("003", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    describe("000", function () {
        should.exist(Importer000);

        beforeEach(function (done) {
            // migrate to current version
            migration.migrateUpFreshDb().then(function () {
                return testUtils.insertDefaultUser();
            }).then(function () {
                done();
            }).then(null, done);
        });


        it("imports data from 000", function (done) {
            var exportData,
                migrationStub = sandbox.stub(migration, "getDatabaseVersion", function () {
                    return when.resolve("000");
                });

            testUtils.loadExportFixture('export-000').then(function (exported) {
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

                var users = importedData[0],
                    posts = importedData[1],
                    settings = importedData[2],
                    tags = importedData[3];

                // we always have 1 user, the default user we added
                users.length.should.equal(1, 'There should only be one user');
                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length + 1, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                migrationStub.restore();

                done();
            }).then(null, done);
        });
    });

    describe("001", function () {
        should.exist(Importer001);

        beforeEach(function (done) {
            // migrate to current version
            migration.migrateUpFreshDb().then(function () {
                return testUtils.insertDefaultUser();
            }).then(function () {
                done();
            }).then(null, done);
        });

        it("safely imports data from 001", function (done) {
            var exportData,
                timestamp = 1349928000000;

            testUtils.loadExportFixture('export-001').then(function (exported) {
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
                    tags = importedData[3],
                    exportEmail;

                // we always have 1 user, the default user we added
                users.length.should.equal(1, 'There should only be one user');

                // user should still have the credentials from the original insert, not the import
                users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                users[0].password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                // but the name, slug, and bio should have been overridden
                users[0].name.should.equal(exportData.data.users[0].name);
                users[0].slug.should.equal(exportData.data.users[0].slug);
                users[0].bio.should.equal(exportData.data.users[0].bio);

                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length + 1, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                // activeTheme should NOT have been overridden
                _.findWhere(settings, {key: "activeTheme"}).value.should.equal("casper", 'Wrong theme');

                // email address should have been overridden
                exportEmail = _.findWhere(exportData.data.settings, {key: "email"}).value;
                _.findWhere(settings, {key: "email"}).value.should.equal(exportEmail, 'Wrong email in settings');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistant for all DBs.
                assert.equal(new Date(posts[1].created_at).getTime(), timestamp);
                assert.equal(new Date(posts[1].updated_at).getTime(), timestamp);
                assert.equal(new Date(posts[1].published_at).getTime(), timestamp);

                done();
            }).then(null, done);
        });

        it("doesn't import invalid post data from 001", function (done) {
            var exportData;


            testUtils.loadExportFixture('export-001').then(function (exported) {
                exportData = exported;

                //change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer("001", exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error.should.eql('Error importing data: Value in [posts.title] exceeds maximum length of 150 characters.');

                when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');
                    // import no longer requires all data to be dropped, and adds posts
                    posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                    // test tags
                    tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                    done();
                });

            }).then(null, done);
        });

        it("doesn't import invalid settings data from 001", function (done) {
            var exportData;

            testUtils.loadExportFixture('export-001').then(function (exported) {
                exportData = exported;
                //change to blank settings key
                exportData.data.settings[3].key = null;
                return importer("001", exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error.should.eql('Error importing data: Value in [settings.key] cannot be blank.');

                when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');
                    // import no longer requires all data to be dropped, and adds posts
                    posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                    // test tags
                    tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                    done();
                });

            }).then(null, done);
        });
    });

    describe("002", function () {
        should.exist(Importer002);

        beforeEach(function (done) {
            // migrate to current version
            migration.migrateUpFreshDb().then(function () {
                return testUtils.insertDefaultUser();
            }).then(function () {
                done();
            }).then(null, done);
        });

        it("safely imports data from 002", function (done) {
            var exportData,
                timestamp = 1349928000000;

            testUtils.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;

                // Modify timestamp data for testing
                exportData.data.posts[0].created_at = timestamp;
                exportData.data.posts[0].updated_at = timestamp;
                exportData.data.posts[0].published_at = timestamp;

                return importer("002", exportData);
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
                    tags = importedData[3],
                    exportEmail;

                // we always have 1 user, the default user we added
                users.length.should.equal(1, 'There should only be one user');

                // user should still have the credentials from the original insert, not the import
                users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                users[0].password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                // but the name, slug, and bio should have been overridden
                users[0].name.should.equal(exportData.data.users[0].name);
                users[0].slug.should.equal(exportData.data.users[0].slug);
                users[0].bio.should.equal(exportData.data.users[0].bio);

                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length + 1, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                // activeTheme should NOT have been overridden
                _.findWhere(settings, {key: "activeTheme"}).value.should.equal("casper", 'Wrong theme');

                // email address should have been overridden
                exportEmail = _.findWhere(exportData.data.settings, {key: "email"}).value;
                _.findWhere(settings, {key: "email"}).value.should.equal(exportEmail, 'Wrong email in settings');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistant for all DBs.
                assert.equal(new Date(posts[1].created_at).getTime(), timestamp);
                assert.equal(new Date(posts[1].updated_at).getTime(), timestamp);
                assert.equal(new Date(posts[1].published_at).getTime(), timestamp);

                done();
            }).otherwise(function (error) {
                done(new Error(error));
            })
        });

        it("doesn't import invalid post data from 002", function (done) {
            var exportData;


            testUtils.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;

                //change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer("002", exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error.should.eql('Error importing data: Value in [posts.title] exceeds maximum length of 150 characters.');

                when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');
                    // import no longer requires all data to be dropped, and adds posts
                    posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                    // test tags
                    tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                    done();
                });

            }).then(null, done);
        });

        it("doesn't import invalid settings data from 002", function (done) {
            var exportData;

            testUtils.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;
                //change to blank settings key
                exportData.data.settings[3].key = null;
                return importer("002", exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error.should.eql('Error importing data: Value in [settings.key] cannot be blank.');

                when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select(),
                    knex("tags").select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');
                    // import no longer requires all data to be dropped, and adds posts
                    posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: "databaseVersion"}).value.should.equal("003", 'Wrong database version');

                    // test tags
                    tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                    done();
                });

            }).then(null, done);
        });
    });

    describe("003", function () {
        should.exist(Importer003);

        beforeEach(function (done) {
            // migrate to current version
            migration.migrateUpFreshDb().then(function () {
                return testUtils.insertDefaultUser();
            }).then(function () {
                done();
            }).then(null, done);
        });

        it("safely imports data from 003", function (done) {
            var exportData;

            testUtils.loadExportFixture('export-003').then(function (exported) {
                exportData = exported;
                return importer("003", exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex("apps").select(),
                    knex("app_settings").select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(2, 'Did not get data successfully');

                var apps = importedData[0],
                    app_settings = importedData[1];

                // test apps
                apps.length.should.equal(exportData.data.apps.length, 'imported apps');

                // test app settings
                // app_settings.length.should.equal(exportData.data.app_settings.length, 'imported app settings');

                done();
            }).then(null, done);
        });
    });
});
