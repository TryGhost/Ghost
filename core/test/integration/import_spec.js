/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var testUtils   = require('../utils/index'),
    should      = require('should'),
    sinon       = require('sinon'),
    when        = require('when'),
    assert      = require('assert'),
    _           = require('lodash'),
    rewire      = require('rewire'),

    // Stuff we are testing
    config          = rewire('../../server/config'),
    configUpdate    = config.__get__('updateConfig'),
    defaultConfig   = rewire('../../../config.example')[process.env.NODE_ENV],
    migration       = rewire('../../server/data/migration'),
    versioning      = require('../../server/data/versioning'),
    exporter        = require('../../server/data/export'),
    importer        = require('../../server/data/import'),
    Importer000     = require('../../server/data/import/000'),
    Importer001     = require('../../server/data/import/001'),
    Importer002     = require('../../server/data/import/002'),
    Importer003     = require('../../server/data/import/003'),

    knex,
    sandbox = sinon.sandbox.create();

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
            configUpdate(newConfig);
            knex = config.database.knex;
        });

        it('resolves 000', function (done) {
            var importStub = sandbox.stub(Importer000, 'importData', function () {
                    return when.resolve();
                }),
                fakeData = { test: true };

            importer('000', fakeData).then(function () {
                importStub.calledWith(fakeData).should.equal(true);

                importStub.restore();

                done();
            }).catch(done);
        });

        it('resolves 001', function (done) {
            var importStub = sandbox.stub(Importer001, 'importData', function () {
                    return when.resolve();
                }),
                fakeData = { test: true };

            importer('001', fakeData).then(function () {
                importStub.calledWith(fakeData).should.equal(true);

                importStub.restore();

                done();
            }).catch(done);
        });

        it('resolves 002', function (done) {
            var importStub = sandbox.stub(Importer002, 'importData', function () {
                    return when.resolve();
                }),
                fakeData = { test: true };

            importer('002', fakeData).then(function () {
                importStub.calledWith(fakeData).should.equal(true);

                importStub.restore();

                done();
            }).catch(done);
        });

        it('resolves 003', function (done) {
            var importStub = sandbox.stub(Importer003, 'importData', function () {
                    return when.resolve();
                }),
                fakeData = { test: true };

            importer('003', fakeData).then(function () {
                importStub.calledWith(fakeData).should.equal(true);

                importStub.restore();

                done();
            }).catch(done);
        });
    });

    describe('000', function () {

        beforeEach(testUtils.setup('owner', 'settings'));

        should.exist(Importer000);

        it('imports data from 000', function (done) {
            var exportData,
                versioningStub = sandbox.stub(versioning, 'getDatabaseVersion', function () {
                    return when.resolve('000');
                });

            testUtils.fixtures.loadExportFixture('export-000').then(function (exported) {
                exportData = exported;

                return importer('000', exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
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

                versioningStub.restore();

                done();
            }).catch(done);
        });
    });

    describe('001', function () {

        beforeEach(testUtils.setup('owner', 'settings'));

        should.exist(Importer001);

        it('safely imports data from 001', function (done) {
            var exportData,
                timestamp = 1349928000000;

            testUtils.fixtures.loadExportFixture('export-001').then(function (exported) {
                exportData = exported;

                // Modify timestamp data for testing
                exportData.data.posts[0].created_at = timestamp;
                exportData.data.posts[0].updated_at = timestamp;
                exportData.data.posts[0].published_at = timestamp;

                return importer('001', exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
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
                users[0].bio.should.equal(exportData.data.users[0].bio);

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

                //change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer('001', exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {

                error[0].message.should.eql('Value in [posts.title] exceeds maximum length of 150 characters.');
                error[0].type.should.eql('ValidationError');

                when.all([
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
                //change to blank settings key
                exportData.data.settings[3].key = null;
                return importer('001', exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {

                error[0].message.should.eql('Value in [settings.key] cannot be blank.');
                error[0].type.should.eql('ValidationError');

                when.all([
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

        beforeEach(testUtils.setup('owner', 'settings'));

        should.exist(Importer002);

        it('safely imports data from 002', function (done) {
            var exportData,
                timestamp = 1349928000000;

            testUtils.fixtures.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;

                // Modify timestamp data for testing
                exportData.data.posts[0].created_at = timestamp;
                exportData.data.posts[0].updated_at = timestamp;
                exportData.data.posts[0].published_at = timestamp;

                return importer('002', exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
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
                users[0].bio.should.equal(exportData.data.users[0].bio);

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
            }).catch(function (error) {
                done(new Error(error));
            });
        });

        it('doesn\'t import invalid post data from 002', function (done) {
            var exportData;


            testUtils.fixtures.loadExportFixture('export-002').then(function (exported) {
                exportData = exported;

                //change title to 151 characters
                exportData.data.posts[0].title = new Array(152).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return importer('002', exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {

                error[0].message.should.eql('Value in [posts.title] exceeds maximum length of 150 characters.');
                error[0].type.should.eql('ValidationError');

                when.all([
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
                //change to blank settings key
                exportData.data.settings[3].key = null;
                return importer('002', exportData);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }, function (error) {

                error[0].message.should.eql('Value in [settings.key] cannot be blank.');
                error[0].type.should.eql('ValidationError');

                when.all([
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
        knex = config.database.knex;

        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        should.exist(Importer003);

        it('safely imports data from 003 (single user)', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003').then(function (exported) {
                exportData = exported;
                return importer('003', exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
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
                users[0].bio.should.equal(exportData.data.users[0].bio);
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

        it('safely imports data from 003 (multi user)', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-mu').then(function (exported) {
                exportData = exported;
                return importer('003', exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('settings').select(),
                    knex('tags').select(),
                    knex('roles_users').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);
                var user2,
                    user3;

                importedData.length.should.equal(5, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    settings = importedData[2],
                    tags = importedData[3],
                    roles_users = importedData[4];

                // we imported 2 users, the original user should be untouched
                users.length.should.equal(3, 'There should only be three users');
                users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                users[0].password.should.equal(testUtils.DataGenerator.Content.users[0].password);

                // the other two users should have the imported data, but they get inserted in different orders
                user2 = _.find(users, function (user) {
                    return user.name === 'Josephine Bloggs';
                });
                user3 = _.find(users, function (user) {
                    return user.name === 'Smith Wellingsworth';
                });
                user2.email.should.equal(exportData.data.users[0].email);
                user3.email.should.equal(exportData.data.users[1].email);

                roles_users.length.should.equal(2, 'There should be 3 role relations');

                _.each(roles_users, function (roleUser) {
                    if (roleUser.user_id === user2.id) {
                        roleUser.role_id.should.equal(1, 'Josephine should be an admin');
                    }

                    if (roleUser.user_id === user3.id) {
                        roleUser.role_id.should.equal(3, 'Smith should be an author by default');
                    }
                });

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
                return importer('003', exportData);
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
            });
        });

        it('handles database errors nicely', function (done) {
            var exportData;
            testUtils.fixtures.loadExportFixture('export-003-dbErrors').then(function (exported) {
                exportData = exported;
                return importer('003', exportData);
            }).catch(function (response) {
                response.length.should.equal(3);
                response[0].type.should.equal('DataImportError');
                response[0].message.should.eql(
                    'Duplicate entry found. Multiple values of "tagging-things" found for tags.slug.'
                );
                response[1].type.should.equal('DataImportError');
                response[1].message.should.eql(
                    'Duplicate entry found. Multiple values of "tagging-things" found for tags.slug.'
                );
                response[2].type.should.equal('DataImportError');
                response[2].message.should.eql(
                    'Duplicate entry found. Multiple values of "test-ghost-post" found for posts.slug.'
                );
                done();
            });
        });

        it('doesn\'t import invalid tags data from 003', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-nullTags').then(function (exported) {
                exportData = exported;

                exportData.data.tags.length.should.be.above(1);
                exportData.data.posts_tags.length.should.be.above(1);

                return importer('003', exportData);
            }).then(function () {
                done(new Error('Allowed import of invalid tags data'));
            }).catch(function (response) {
                response.length.should.equal(4);
                response[0].type.should.equal('ValidationError');
                response[0].message.should.eql('Value in [tags.uuid] cannot be blank.');
                response[1].type.should.equal('ValidationError');
                response[1].message.should.eql('Validation (isUUID) failed for uuid');
                response[2].type.should.equal('ValidationError');
                response[2].message.should.eql('Value in [tags.name] cannot be blank.');
                response[3].type.should.equal('ValidationError');
                response[3].message.should.eql('Value in [tags.slug] cannot be blank.');
                done();
            });
        });

        it('doesn\'t import invalid posts data from 003', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-nullPosts').then(function (exported) {
                exportData = exported;

                exportData.data.posts.length.should.be.above(1);

                return importer('003', exportData);
            }).then(function () {
                done(new Error('Allowed import of invalid tags data'));
            }).catch(function (response) {
                response.length.should.equal(6);
                done();
            });
        });
    });
});
