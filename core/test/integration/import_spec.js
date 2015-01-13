/*globals describe, before, beforeEach, afterEach, after, it */
/*jshint expr:true*/
var testUtils   = require('../utils/index'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    assert      = require('assert'),
    _           = require('lodash'),
    rewire      = require('rewire'),
    validator   = require('validator'),

    // Stuff we are testing
    config          = rewire('../../server/config'),
    defaultConfig   = rewire('../../../config.example')[process.env.NODE_ENV],
    migration       = rewire('../../server/data/migration'),
    exporter        = require('../../server/data/export'),
    importer        = require('../../server/data/import'),
    DataImporter    = require('../../server/data/import/data-importer'),

    knex,
    sandbox = sinon.sandbox.create();

// Tests in here do an import for each test
describe('Import', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });

    should.exist(exporter);
    should.exist(importer);

    describe('Resolves', function () {
        beforeEach(testUtils.setup());
        beforeEach(function () {
            var newConfig = _.extend(config, defaultConfig);

            migration.__get__('config', newConfig);
            config.set(newConfig);
            knex = config.database.knex;
        });

        it('resolves DataImporter', function (done) {
            var importStub = sandbox.stub(DataImporter, 'importData', function () {
                    return Promise.resolve();
                }),
                fakeData = {test: true};

            importer.doImport(fakeData).then(function () {
                importStub.calledWith(fakeData).should.equal(true);

                importStub.restore();

                done();
            }).catch(done);
        });
    });

    describe('Sanitizes', function () {
        before(function ()  {
            knex = config.database.knex;
        });
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('import results have data and problems', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003').then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function (importResult) {
                should.exist(importResult);
                should.exist(importResult.data);
                should.exist(importResult.problems);

                done();
            }).catch(done);
        });

        it('removes duplicate posts', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-duplicate-posts').then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function (importResult) {
                should.exist(importResult.data.data.posts);

                importResult.data.data.posts.length.should.equal(1);

                importResult.problems.posts.length.should.equal(1);

                done();
            }).catch(done);
        });

        it('removes duplicate tags and updates associations', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-duplicate-tags').then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function (importResult) {
                should.exist(importResult.data.data.tags);
                should.exist(importResult.data.data.posts_tags);

                importResult.data.data.tags.length.should.equal(1);

                // Check we imported all posts_tags associations
                importResult.data.data.posts_tags.length.should.equal(2);
                // Check the post_tag.tag_id was updated when we removed duplicate tag
                _.all(importResult.data.data.posts_tags, function (postTag) {
                    return postTag.tag_id !== 2;
                });

                importResult.problems.tags.length.should.equal(1);

                done();
            }).catch(done);
        });
    });

    describe('DataImporter', function () {
        before(function ()  {
            knex = config.database.knex;
        });
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        should.exist(DataImporter);

        it('imports data from 000', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-000').then(function (exported) {
                exportData = exported;

                return importer.doImport(exportData);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(4, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    settings = importedData[2],
                    tags = importedData[3];

                // we always have 1 user, the owner user we added
                users.length.should.equal(1, 'There should only be one user');
                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                done();
            }).catch(done);
        });

        it('safely imports data, from 001', function (done) {
            var exportData,
                timestamp = 1349928000000;

            testUtils.fixtures.loadExportFixture('export-001').then(function (exported) {
                exportData = exported;

                // Modify timestamp data for testing
                exportData.data.posts[0].created_at = timestamp;
                exportData.data.posts[0].updated_at = timestamp;
                exportData.data.posts[0].published_at = timestamp;

                return importer.doImport(exportData);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
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
                should.not.exist(users[0].bio, 'bio is not imported');

                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                // activeTheme should NOT have been overridden
                _.findWhere(settings, {key: 'activeTheme'}).value.should.equal('casper', 'Wrong theme');

                // email address should have been overridden
                exportEmail = _.findWhere(exportData.data.settings, {key: 'email'}).value;
                _.findWhere(settings, {key: 'email'}).value.should.equal(exportEmail, 'Wrong email in settings');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistent for all DBs.
                assert.equal(new Date(posts[0].created_at).getTime(), timestamp);
                assert.equal(new Date(posts[0].updated_at).getTime(), timestamp);
                assert.equal(new Date(posts[0].published_at).getTime(), timestamp);

                done();
            }).catch(done);
        });

        it('doesn\'t import invalid post data from 001', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001').then(function (exported) {
                exportData = exported;

                // change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer.doImport(exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error[0].message.should.eql('Value in [posts.title] exceeds maximum length of 150 characters.');
                error[0].type.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');

                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                    done();
                });
            }).catch(done);
        });

        it('doesn\'t import invalid settings data from 001', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001').then(function (exported) {
                exportData = exported;
                // change to blank settings key
                exportData.data.settings[3].key = null;
                return importer.doImport(exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error[0].message.should.eql('Value in [settings.key] cannot be blank.');
                error[0].type.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');

                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                    done();
                });
            }).catch(done);
        });
    });

    describe('002', function () {
        before(function ()  {
            knex = config.database.knex;
        });
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('safely imports data from 002', function (done) {
            var exportData,
                timestamp = 1349928000000;

            testUtils.fixtures.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;

                // Modify timestamp data for testing
                exportData.data.posts[0].created_at = timestamp;
                exportData.data.posts[0].updated_at = timestamp;
                exportData.data.posts[0].published_at = timestamp;

                return importer.doImport(exportData);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(4, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    settings = importedData[2],
                    tags = importedData[3],
                    exportEmail;

                // we always have 1 user, the owner user we added
                users.length.should.equal(1, 'There should only be one user');

                // user should still have the credentials from the original insert, not the import
                users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                users[0].password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                // but the name, slug, and bio should have been overridden
                users[0].name.should.equal(exportData.data.users[0].name);
                users[0].slug.should.equal(exportData.data.users[0].slug);
                should.not.exist(users[0].bio, 'bio is not imported');

                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                // activeTheme should NOT have been overridden
                _.findWhere(settings, {key: 'activeTheme'}).value.should.equal('casper', 'Wrong theme');

                // email address should have been overridden
                exportEmail = _.findWhere(exportData.data.settings, {key: 'email'}).value;
                _.findWhere(settings, {key: 'email'}).value.should.equal(exportEmail, 'Wrong email in settings');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistant for all DBs.
                assert.equal(new Date(posts[0].created_at).getTime(), timestamp);
                assert.equal(new Date(posts[0].updated_at).getTime(), timestamp);
                assert.equal(new Date(posts[0].published_at).getTime(), timestamp);

                done();
            }).catch(done);
        });

        it('doesn\'t import invalid post data from 002', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;

                // change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer.doImport(exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error[0].message.should.eql('Value in [posts.title] exceeds maximum length of 150 characters.');
                error[0].type.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the owner user we added
                    users.length.should.equal(1, 'There should only be one user');
                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                    done();
                });
            }).catch(done);
        });

        it('doesn\'t import invalid settings data from 002', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;
                // change to blank settings key
                exportData.data.settings[3].key = null;
                return importer.doImport(exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {
                error[0].message.should.eql('Value in [settings.key] cannot be blank.');
                error[0].type.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the owner user we added
                    users.length.should.equal(1, 'There should only be one user');
                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    // test settings
                    settings.length.should.be.above(0, 'Wrong number of settings');
                    _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                    done();
                });
            }).catch(done);
        });
    });

    describe('003', function () {
        before(function ()  {
            knex = config.database.knex;
        });
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('safely imports data from 003 (single user)', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003').then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(4, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    settings = importedData[2],
                    tags = importedData[3];

                // user should still have the credentials from the original insert, not the import
                users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                users[0].password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                // but the name, slug, and bio should have been overridden
                users[0].name.should.equal(exportData.data.users[0].name);
                users[0].slug.should.equal(exportData.data.users[0].slug);
                should.not.exist(users[0].bio, 'bio is not imported');

                // test posts
                posts.length.should.equal(1, 'Wrong number of posts');
                // test tags
                tags.length.should.equal(1, 'no new tags');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                done();
            }).catch(done);
        });

        it('handles validation errors nicely', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-badValidation').then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function () {
                done(new Error('Allowed import of duplicate data'));
            }).catch(function (response) {
                response.length.should.equal(5);
                response[0].type.should.equal('ValidationError');
                response[0].message.should.eql('Value in [posts.title] cannot be blank.');
                response[1].type.should.equal('ValidationError');
                response[1].message.should.eql('Value in [posts.slug] cannot be blank.');
                response[2].type.should.equal('ValidationError');
                response[2].message.should.eql('Value in [settings.key] cannot be blank.');
                response[3].type.should.equal('ValidationError');
                response[3].message.should.eql('Value in [tags.slug] cannot be blank.');
                response[4].type.should.equal('ValidationError');
                response[4].message.should.eql('Value in [tags.name] cannot be blank.');
                done();
            }).catch(done);
        });

        it('handles database errors nicely', function (done) {
            var exportData;
            testUtils.fixtures.loadExportFixture('export-003-dbErrors').then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function () {
                done(new Error('Allowed import of duplicate data'));
            }).catch(function (response) {
                response.length.should.be.above(0);
                response[0].type.should.equal('DataImportError');
                done();
            }).catch(done);
        });

        it('doesn\'t import posts with an invalid author', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-mu-unknownAuthor').then(function (exported) {
                exportData = exported;

                return importer.doImport(exportData);
            }).then(function () {
                done(new Error('Allowed import of unknown author'));
            }).catch(function (response) {
                response.length.should.equal(1);
                response[0].message.should.eql('Attempting to import data linked to unknown user id 2');
                response[0].type.should.equal('DataImportError');

                done();
            }).catch(done);
        });

        it('doesn\'t import invalid tags data from 003', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-nullTags').then(function (exported) {
                exportData = exported;

                exportData.data.tags.length.should.be.above(1);
                exportData.data.posts_tags.length.should.be.above(1);

                return importer.doImport(exportData);
            }).then(function () {
                done(new Error('Allowed import of invalid tags data'));
            }).catch(function (response) {
                response.length.should.equal(2);
                response[0].type.should.equal('ValidationError');
                response[0].message.should.eql('Value in [tags.name] cannot be blank.');
                response[1].type.should.equal('ValidationError');
                response[1].message.should.eql('Value in [tags.slug] cannot be blank.');
                done();
            }).catch(done);
        });

        it('doesn\'t import invalid posts data from 003', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-nullPosts').then(function (exported) {
                exportData = exported;

                exportData.data.posts.length.should.be.above(1);

                return importer.doImport(exportData);
            }).then(function () {
                done(new Error('Allowed import of invalid tags data'));
            }).catch(function (response) {
                response.length.should.equal(5, response);
                done();
            }).catch(done);
        });

        it('correctly sanitizes incorrect UUIDs', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-wrongUUID').then(function (exported) {
                exportData = exported;

                exportData.data.posts.length.should.be.above(0);

                return importer.doImport(exportData);
            }).then(function () {
                // Grab the data from tables
                return knex('posts').select();
            }).then(function (importedData) {
                should.exist(importedData);

                assert.equal(validator.isUUID(importedData[0].uuid), true, 'Old Ghost UUID NOT fixed');
                assert.equal(validator.isUUID(importedData[1].uuid), true, 'Empty UUID NOT fixed');
                assert.equal(validator.isUUID(importedData[2].uuid), true, 'Missing UUID NOT fixed');
                assert.equal(validator.isUUID(importedData[3].uuid), true, 'Malformed UUID NOT fixed');
                done();
            }).catch(done);
        });
    });
});

// Tests in here do an import-per-describe, and then have several tests to check various bits of data
describe('Import (new test structure)', function () {
    before(testUtils.teardown);

    after(testUtils.teardown);

    describe('imports multi user data onto blank ghost install', function () {
        var exportData;

        before(function doImport(done) {
            knex = config.database.knex;

            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu');
            }).then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function () {
                done();
            }).catch(done);
        });
        after(testUtils.teardown);

        it('gets the right data', function (done) {
            var fetchImported = Promise.join(
                knex('posts').select(),
                knex('settings').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var posts,
                    settings,
                    tags,
                    post1,
                    post2,
                    post3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test posts, settings and tags
                posts = importedData[0];
                settings = importedData[1];
                tags = importedData[2];

                post1 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[0].slug;
                });
                post2 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[1].slug;
                });
                post3 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[2].slug;
                });

                // test posts
                posts.length.should.equal(3, 'Wrong number of posts');
                post1.title.should.equal(exportData.data.posts[0].title);
                post2.title.should.equal(exportData.data.posts[1].title);
                post3.title.should.equal(exportData.data.posts[2].title);

                // test tags
                tags.length.should.equal(3, 'should be 3 tags');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                done();
            }).catch(done);
        });

        it('imports users with correct roles and status', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('roles_users').select()
            );

            fetchImported.then(function (importedData) {
                var user1,
                    user2,
                    user3,
                    users,
                    rolesUsers;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(2, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                rolesUsers = importedData[1];

                // we imported 3 users
                // the original user should be untouched
                // the two news users should have been created
                users.length.should.equal(3, 'There should only be three users');

                // the owner user is first
                user1 = users[0];
                // the other two users should have the imported data, but they get inserted in different orders
                user2 = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                user3 = _.find(users, function (user) {
                    return user.name === exportData.data.users[2].name;
                });

                user1.email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                user1.password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                user1.status.should.equal('active');
                user2.email.should.equal(exportData.data.users[1].email);
                user3.email.should.equal(exportData.data.users[2].email);

                // Newly created users should have a status of locked
                user2.status.should.equal('locked');
                user3.status.should.equal('locked');

                // Newly created users should have created_at/_by and updated_at/_by set to when they were imported
                user2.created_by.should.equal(user1.id);
                user2.created_at.should.not.equal(exportData.data.users[1].created_at);
                user2.updated_by.should.equal(user1.id);
                user2.updated_at.should.not.equal(exportData.data.users[1].updated_at);
                user3.created_by.should.equal(user1.id);
                user3.created_at.should.not.equal(exportData.data.users[2].created_at);
                user3.updated_by.should.equal(user1.id);
                user3.updated_at.should.not.equal(exportData.data.users[2].updated_at);

                rolesUsers.length.should.equal(3, 'There should be 3 role relations');

                _.each(rolesUsers, function (roleUser) {
                    if (roleUser.user_id === user1.id) {
                        roleUser.role_id.should.equal(4, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === user2.id) {
                        roleUser.role_id.should.equal(1, 'Josephine should be an admin');
                    }
                    if (roleUser.user_id === user3.id) {
                        roleUser.role_id.should.equal(3, 'Smith should be an author by default');
                    }
                });

                done();
            }).catch(done);
        });

        it('imports posts & tags with correct authors, owners etc', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('posts').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var users, user1, user2, user3,
                    posts, post1, post2, post3,
                    tags, tag1, tag2, tag3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                posts = importedData[1];
                tags  = importedData[2];

                // Grab the users
                // the owner user is first
                user1 = users[0];
                // the other two users should have the imported data, but they get inserted in different orders
                user2 = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                user3 = _.find(users, function (user) {
                    return user.name === exportData.data.users[2].name;
                });
                post1 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[0].slug;
                });
                post2 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[1].slug;
                });
                post3 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[2].slug;
                });
                tag1 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[0].slug;
                });
                tag2 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[1].slug;
                });
                tag3 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[2].slug;
                });

                // Check the authors are correct
                post1.author_id.should.equal(user2.id);
                post2.author_id.should.equal(user3.id);
                post3.author_id.should.equal(user1.id);

                // Created by should be what was in the import file
                post1.created_by.should.equal(user1.id);
                post2.created_by.should.equal(user3.id);
                post3.created_by.should.equal(user1.id);

                // Updated by gets set to the current user
                post1.updated_by.should.equal(user1.id);
                post2.updated_by.should.equal(user1.id);
                post3.updated_by.should.equal(user1.id);

                // Published by should be what was in the import file
                post1.published_by.should.equal(user2.id);
                post2.published_by.should.equal(user3.id);
                post3.published_by.should.equal(user1.id);

                // Created by should be what was in the import file
                tag1.created_by.should.equal(user1.id);
                tag2.created_by.should.equal(user2.id);
                tag3.created_by.should.equal(user3.id);

                // Updated by gets set to the current user
                tag1.updated_by.should.equal(user1.id);
                tag2.updated_by.should.equal(user1.id);
                tag3.updated_by.should.equal(user1.id);

                done();
            }).catch(done);
        });
    });

    describe('imports multi user data with no owner onto blank ghost install', function () {
        var exportData;

        before(function doImport(done) {
            knex = config.database.knex;

            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu-noOwner');
            }).then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function () {
                done();
            }).catch(done);
        });
        after(testUtils.teardown);

        it('gets the right data', function (done) {
            var fetchImported = Promise.join(
                knex('posts').select(),
                knex('settings').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var posts,
                    settings,
                    tags,
                    post1,
                    post2,
                    post3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test posts, settings and tags
                posts = importedData[0];
                settings = importedData[1];
                tags = importedData[2];

                post1 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[0].slug;
                });
                post2 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[1].slug;
                });
                post3 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[2].slug;
                });

                // test posts
                posts.length.should.equal(3, 'Wrong number of posts');
                post1.title.should.equal(exportData.data.posts[0].title);
                post2.title.should.equal(exportData.data.posts[1].title);
                post3.title.should.equal(exportData.data.posts[2].title);

                // test tags
                tags.length.should.equal(3, 'should be 3 tags');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                done();
            }).catch(done);
        });

        it('imports users with correct roles and status', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('roles_users').select()
            );

            fetchImported.then(function (importedData) {
                var user1,
                    user2,
                    user3,
                    users,
                    rolesUsers;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(2, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                rolesUsers = importedData[1];

                // we imported 3 users
                // the original user should be untouched
                // the two news users should have been created
                users.length.should.equal(3, 'There should only be three users');

                // the owner user is first
                user1 = users[0];
                // the other two users should have the imported data, but they get inserted in different orders
                user2 = _.find(users, function (user) {
                    return user.name === exportData.data.users[0].name;
                });
                user3 = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });

                user1.email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                user1.password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                user1.status.should.equal('active');
                user2.email.should.equal(exportData.data.users[0].email);
                user3.email.should.equal(exportData.data.users[1].email);

                // Newly created users should have a status of locked
                user2.status.should.equal('locked');
                user3.status.should.equal('locked');

                // Newly created users should have created_at/_by and updated_at/_by set to when they were imported
                user2.created_by.should.equal(user1.id);
                user2.created_at.should.not.equal(exportData.data.users[0].created_at);
                user2.updated_by.should.equal(user1.id);
                user2.updated_at.should.not.equal(exportData.data.users[0].updated_at);
                user3.created_by.should.equal(user1.id);
                user3.created_at.should.not.equal(exportData.data.users[1].created_at);
                user3.updated_by.should.equal(user1.id);
                user3.updated_at.should.not.equal(exportData.data.users[1].updated_at);

                rolesUsers.length.should.equal(3, 'There should be 3 role relations');

                _.each(rolesUsers, function (roleUser) {
                    if (roleUser.user_id === user1.id) {
                        roleUser.role_id.should.equal(4, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === user2.id) {
                        roleUser.role_id.should.equal(1, 'Josephine should be an admin');
                    }
                    if (roleUser.user_id === user3.id) {
                        roleUser.role_id.should.equal(3, 'Smith should be an author by default');
                    }
                });

                done();
            }).catch(done);
        });

        it('imports posts & tags with correct authors, owners etc', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('posts').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var users, user1, user2, user3,
                    posts, post1, post2, post3,
                    tags, tag1, tag2, tag3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                posts = importedData[1];
                tags  = importedData[2];

                // Grab the users
                // the owner user is first
                user1 = users[0];
                // the other two users should have the imported data, but they get inserted in different orders
                user2 = _.find(users, function (user) {
                    return user.name === exportData.data.users[0].name;
                });
                user3 = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                post1 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[0].slug;
                });
                post2 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[1].slug;
                });
                post3 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[2].slug;
                });
                tag1 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[0].slug;
                });
                tag2 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[1].slug;
                });
                tag3 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[2].slug;
                });

                // Check the authors are correct
                post1.author_id.should.equal(user2.id);
                post2.author_id.should.equal(user3.id);
                post3.author_id.should.equal(user1.id);

                // Created by should be what was in the import file
                post1.created_by.should.equal(user1.id);
                post2.created_by.should.equal(user3.id);
                post3.created_by.should.equal(user1.id);

                // Updated by gets set to the current user
                post1.updated_by.should.equal(user1.id);
                post2.updated_by.should.equal(user1.id);
                post3.updated_by.should.equal(user1.id);

                // Published by should be what was in the import file
                post1.published_by.should.equal(user2.id);
                post2.published_by.should.equal(user3.id);
                post3.published_by.should.equal(user1.id);

                // Created by should be what was in the import file
                tag1.created_by.should.equal(user1.id);
                tag2.created_by.should.equal(user2.id);
                tag3.created_by.should.equal(user3.id);

                // Updated by gets set to the current user
                tag1.updated_by.should.equal(user1.id);
                tag2.updated_by.should.equal(user1.id);
                tag3.updated_by.should.equal(user1.id);

                done();
            }).catch(done);
        });
    });

    describe('imports multi user data onto existing data', function () {
        var exportData;

        before(function doImport(done) {
            knex = config.database.knex;

            // initialise the blog with some data
            testUtils.initFixtures('users:roles', 'posts', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu');
            }).then(function (exported) {
                exportData = exported;
                return importer.doImport(exportData);
            }).then(function () {
                done();
            }).catch(done);
        });
        after(testUtils.teardown);

        it('gets the right data', function (done) {
            var fetchImported = Promise.join(
                knex('posts').select(),
                knex('settings').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var posts,
                    settings,
                    tags,
                    post1,
                    post2,
                    post3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test posts, settings and tags
                posts = importedData[0];
                settings = importedData[1];
                tags = importedData[2];

                post1 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[0].slug;
                });
                post2 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[1].slug;
                });
                post3 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[2].slug;
                });

                // test posts
                posts.length.should.equal(
                    (exportData.data.posts.length + testUtils.DataGenerator.Content.posts.length),
                    'Wrong number of posts'
                );

                posts[0].title.should.equal(testUtils.DataGenerator.Content.posts[0].title);

                post1.title.should.equal(exportData.data.posts[0].title);
                post2.title.should.equal(exportData.data.posts[1].title);
                post3.title.should.equal(exportData.data.posts[2].title);

                // test tags
                tags.length.should.equal(
                    (exportData.data.tags.length + testUtils.DataGenerator.Content.tags.length),
                    'Wrong number of tags'
                );

                tags[0].name.should.equal(testUtils.DataGenerator.Content.tags[0].name);

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');
                _.findWhere(settings, {key: 'databaseVersion'}).value.should.equal('003', 'Wrong database version');

                done();
            }).catch(done);
        });

        it('imports users with correct roles and status', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('roles_users').select()
            );

            fetchImported.then(function (importedData) {
                var ownerUser,
                    newUser,
                    existingUser,
                    users,
                    rolesUsers;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(2, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                rolesUsers = importedData[1];

                // we imported 3 users, there were already 4 users, only one of the imported users is new
                users.length.should.equal(5, 'There should only be three users');

                // the owner user is first
                ownerUser = users[0];
                // the other two users should have the imported data, but they get inserted in different orders
                newUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                existingUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[2].name;
                });

                ownerUser.email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                ownerUser.password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                ownerUser.status.should.equal('active');
                newUser.email.should.equal(exportData.data.users[1].email);
                existingUser.email.should.equal(exportData.data.users[2].email);

                // Newly created users should have a status of locked
                newUser.status.should.equal('locked');
                // The already existing user should still have a status of active
                existingUser.status.should.equal('active');

                // Newly created users should have created_at/_by and updated_at/_by set to when they were imported
                newUser.created_by.should.equal(ownerUser.id);
                newUser.created_at.should.not.equal(exportData.data.users[1].created_at);
                newUser.updated_by.should.equal(ownerUser.id);
                newUser.updated_at.should.not.equal(exportData.data.users[1].updated_at);

                rolesUsers.length.should.equal(5, 'There should be 5 role relations');

                _.each(rolesUsers, function (roleUser) {
                    if (roleUser.user_id === ownerUser.id) {
                        roleUser.role_id.should.equal(4, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === newUser.id) {
                        roleUser.role_id.should.equal(1, 'New user should be an admin');
                    }
                    if (roleUser.user_id === existingUser.id) {
                        roleUser.role_id.should.equal(1, 'Existing user was an admin');
                    }
                });

                done();
            }).catch(done);
        });

        it('imports posts & tags with correct authors, owners etc', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('posts').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var users, ownerUser, newUser, existingUser,
                    posts, post1, post2, post3,
                    tags, tag1, tag2, tag3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                posts = importedData[1];
                tags  = importedData[2];

                // Grab the users
                // the owner user is first
                ownerUser = users[0];
                // the other two users should have the imported data, but they get inserted in different orders
                newUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                existingUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[2].name;
                });
                post1 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[0].slug;
                });
                post2 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[1].slug;
                });
                post3 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[2].slug;
                });
                tag1 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[0].slug;
                });
                tag2 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[1].slug;
                });
                tag3 = _.find(tags, function (tag) {
                    return tag.slug === exportData.data.tags[2].slug;
                });

                // Check the authors are correct
                post1.author_id.should.equal(newUser.id);
                post2.author_id.should.equal(existingUser.id);
                post3.author_id.should.equal(ownerUser.id);

                // Created by should be what was in the import file
                post1.created_by.should.equal(ownerUser.id);
                post2.created_by.should.equal(existingUser.id);
                post3.created_by.should.equal(ownerUser.id);

                // Updated by gets set to the current user
                post1.updated_by.should.equal(ownerUser.id);
                post2.updated_by.should.equal(ownerUser.id);
                post3.updated_by.should.equal(ownerUser.id);

                // Published by should be what was in the import file
                post1.published_by.should.equal(newUser.id);
                post2.published_by.should.equal(existingUser.id);
                post3.published_by.should.equal(ownerUser.id);

                // Created by should be what was in the import file
                tag1.created_by.should.equal(ownerUser.id);
                tag2.created_by.should.equal(newUser.id);
                tag3.created_by.should.equal(existingUser.id);

                // Updated by gets set to the current user
                tag1.updated_by.should.equal(ownerUser.id);
                tag2.updated_by.should.equal(ownerUser.id);
                tag3.updated_by.should.equal(ownerUser.id);

                done();
            }).catch(done);
        });
    });
});
