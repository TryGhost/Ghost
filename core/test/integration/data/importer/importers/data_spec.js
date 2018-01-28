var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    Promise = require('bluebird'),
    moment = require('moment'),
    assert = require('assert'),
    _ = require('lodash'),
    validator = require('validator'),

    // Stuff we are testing
    db = require('../../../../../server/data/db'),
    models = require('../../../../../server/models'),
    exporter = require('../../../../../server/data/export'),
    importer = require('../../../../../server/data/importer'),
    dataImporter = importer.importers[1],
    importOptions = {
        returnImportedData: true
    },

    knex = db.knex,
    sandbox = sinon.sandbox.create();

// Tests in here do an import for each test
describe('Import', function () {
    before(testUtils.teardown);

    beforeEach(function () {
        sandbox.stub(importer, 'cleanUp');
    });

    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });

    should.exist(exporter);
    should.exist(importer);

    describe('Sanitizes', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('import results have data and problems', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function (importResult) {
                should.exist(importResult);
                should.exist(importResult.data);
                should.exist(importResult.problems);

                done();
            }).catch(done);
        });

        it('removes duplicate posts', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function (importResult) {
                should.exist(importResult.data.posts);
                importResult.data.posts.length.should.equal(1);
                importResult.problems.length.should.eql(3);

                done();
            }).catch(done);
        });

        it('removes duplicate tags and updates associations', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-duplicate-tags', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function (importResult) {
                should.exist(importResult.data.tags);
                should.exist(importResult.originalData.posts_tags);

                importResult.data.tags.length.should.equal(1);

                // Check we imported all posts_tags associations
                importResult.originalData.posts_tags.length.should.equal(2);

                // Check the post_tag.tag_id was updated when we removed duplicate tag
                _.every(importResult.originalData.posts_tags, function (postTag) {
                    return postTag.tag_id !== 2;
                });

                importResult.problems.length.should.equal(3);

                importResult.problems[2].message.should.equal('Theme not imported, please upload in Settings - Design');

                done();
            }).catch(done);
        });

        it('cares about invalid dates', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function (importResult) {
                should.exist(importResult.data.posts);
                importResult.data.posts.length.should.equal(1);
                importResult.problems.length.should.eql(3);

                moment(importResult.data.posts[0].created_at).isValid().should.eql(true);
                moment(importResult.data.posts[0].updated_at).format().should.eql('2013-10-18T23:58:44Z');
                moment(importResult.data.posts[0].published_at).format().should.eql('2013-12-29T11:58:30Z');
                moment(importResult.data.tags[0].updated_at).format().should.eql('2016-07-17T12:02:54Z');

                done();
            }).catch(done);
        });
    });

    describe('DataImporter', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('imports data from 000', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-000', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    models.Post.findPage(testUtils.context.internal),
                    knex('settings').select(),
                    knex('tags').select(),
                    knex('subscribers').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(5, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1].posts,
                    settings = importedData[2],
                    tags = importedData[3],
                    subscribers = importedData[4];

                subscribers.length.should.equal(2, 'There should be two subscribers');

                // we always have 1 user, the owner user we added
                users.length.should.equal(1, 'There should only be one user');

                // import no longer requires all data to be dropped, and adds posts
                posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');
                posts[0].status.should.eql('scheduled');
                posts[1].status.should.eql('published');

                // test settings
                settings.length.should.be.above(0, 'Wrong number of settings');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                done();
            }).catch(done);
        });

        it('safely imports data, from 001', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
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

                // active_theme should NOT have been overridden
                _.find(settings, {key: 'active_theme'}).value.should.equal('casper', 'Wrong theme');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistent for all DBs.
                assert.equal(moment(posts[0].created_at).valueOf(), 1388318310000);
                assert.equal(moment(posts[0].updated_at).valueOf(), 1388318310000);
                assert.equal(moment(posts[0].published_at).valueOf(), 1388404710000);

                done();
            }).catch(done);
        });

        it('doesn\'t import invalid settings data from 001', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001-invalid-setting', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }).catch(function (error) {
                error[0].message.should.eql('Value in [settings.key] cannot be blank.');
                error[0].errorType.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(3, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        tags = importedData[2];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');

                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    done();
                });
            });
        });
    });

    describe('002', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('safely imports data from 002', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-002', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    models.Post.findPage(testUtils.context.internal),
                    knex('settings').select(),
                    knex('tags').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(4, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1].posts,
                    settings = importedData[2],
                    tags = importedData[3];

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
                posts[0].comment_id.should.eql(exportData.data.posts[0].id.toString());

                // active_theme should NOT have been overridden
                _.find(settings, {key: 'active_theme'}).value.should.equal('casper', 'Wrong theme');

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                // Ensure imported post retains set timestamp
                // When in sqlite we are returned a unix timestamp number,
                // in MySQL we're returned a date object.
                // We pass the returned post always through the date object
                // to ensure the return is consistant for all DBs.
                assert.equal(moment(posts[0].created_at).valueOf(), 1419940710000);
                assert.equal(moment(posts[0].updated_at).valueOf(), 1420027110000);
                assert.equal(moment(posts[0].published_at).valueOf(), 1420027110000);

                done();
            }).catch(done);
        });
    });

    describe('003', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('safely imports data from 003 (single user)', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('tags').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(3, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    tags = importedData[2];

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

                done();
            }).catch(done);
        });

        it('handles validation errors nicely', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-badValidation', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done(new Error('Allowed import of duplicate data'));
            }).catch(function (response) {
                response.length.should.equal(4);

                // NOTE: a duplicated tag.slug is a warning
                response[0].errorType.should.equal('ValidationError');
                response[0].message.should.eql('Value in [tags.name] cannot be blank.');
                response[1].errorType.should.equal('ValidationError');
                response[1].message.should.eql('Value in [posts.title] cannot be blank.');
                response[2].errorType.should.equal('ValidationError');
                response[2].message.should.eql('Value in [tags.name] cannot be blank.');
                response[3].errorType.should.equal('ValidationError');
                response[3].message.should.eql('Value in [settings.key] cannot be blank.');
                done();
            }).catch(done);
        });

        it('handles database errors nicely: duplicated tag and posts slugs', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-dbErrors', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function (importedData) {
                importedData.data.posts.length.should.eql(1);

                importedData.problems.length.should.eql(3);
                importedData.problems[0].message.should.eql('Entry was not imported and ignored. Detected duplicated entry.');
                importedData.problems[0].help.should.eql('Tag');
                importedData.problems[1].message.should.eql('Entry was not imported and ignored. Detected duplicated entry.');
                importedData.problems[1].help.should.eql('Tag');
                importedData.problems[2].message.should.eql('Entry was not imported and ignored. Detected duplicated entry.');
                importedData.problems[2].help.should.eql('Post');
                done();
            }).catch(done);
        });

        it('does import posts with an invalid author', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-mu-unknownAuthor', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function (importedData) {
                // NOTE: we detect invalid author references as warnings, because ember can handle this
                // The owner can simply update the author reference in the UI
                importedData.problems.length.should.eql(3);
                importedData.problems[2].message.should.eql('Entry was imported, but we were not able to ' +
                    'update user reference field: published_by. The user does not exist, fallback to owner user.');
                importedData.problems[2].help.should.eql('Post');

                // Grab the data from tables
                return Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('tags').select()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(3, 'Did not get data successfully');

                var users = importedData[0],
                    posts = importedData[1],
                    tags = importedData[2];

                // user should still have the credentials from the original insert, not the import
                users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                users[0].password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                // but the name, slug, and bio should have been overridden
                users[0].name.should.equal('Joe Bloggs');
                users[0].slug.should.equal('joe-bloggs');
                should.not.exist(users[0].bio, 'bio is not imported');

                // test posts
                posts.length.should.equal(1, 'Wrong number of posts');

                // we fallback to owner user
                // NOTE: ember can handle unknown authors, but still a fallback to an existing user is better.
                posts[0].author_id.should.eql('1');

                // test tags
                tags.length.should.equal(0, 'no tags');

                done();
            }).catch(done);
        });

        it('doesn\'t import invalid tags data from 003', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-nullTags', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done(new Error('Allowed import of invalid tags data'));
            }).catch(function (response) {
                response.length.should.equal(2);
                response[0].errorType.should.equal('ValidationError');
                response[0].message.should.eql('Value in [tags.name] cannot be blank.');
                response[1].errorType.should.equal('ValidationError');
                response[1].message.should.eql('Value in [tags.name] cannot be blank.');
                done();
            }).catch(done);
        });

        it('doesn\'t import invalid posts data from 003', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-nullPosts', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done(new Error('Allowed import of invalid post data'));
            }).catch(function (response) {
                response.length.should.equal(2, response);

                response[0].errorType.should.equal('ValidationError');
                response[0].message.should.eql('Value in [posts.title] cannot be blank.');

                response[1].errorType.should.equal('ValidationError');
                response[1].message.should.eql('Value in [posts.status] cannot be blank.');

                done();
            }).catch(done);
        });

        it('correctly sanitizes incorrect UUIDs', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-003-wrongUUID', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
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

    describe('004: order', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('ensure post tag order is correct', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-004', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                // Grab the data from tables
                // NOTE: we have to return sorted data, sqlite can insert the posts in a different order
                return Promise.all([
                    models.Post.findPage({include: ['tags']}),
                    models.Tag.findAll()
                ]);
            }).then(function (importedData) {
                should.exist(importedData);

                importedData.length.should.equal(2, 'Did not get data successfully');

                var posts = importedData[0].posts,
                    tags = importedData[1];

                // test posts
                posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');
                posts[0].tags.length.should.eql(1);
                posts[0].tags[0].slug.should.eql(exportData.data.tags[0].slug);

                // has a specific sort_order
                posts[1].tags.length.should.eql(3);
                posts[1].tags[0].slug.should.eql(exportData.data.tags[2].slug);
                posts[1].tags[1].slug.should.eql(exportData.data.tags[0].slug);
                posts[1].tags[2].slug.should.eql(exportData.data.tags[1].slug);

                // sort_order property is missing (order depends on the posts_tags entries)
                posts[2].tags.length.should.eql(2);
                posts[2].tags[0].slug.should.eql(exportData.data.tags[1].slug);
                posts[2].tags[1].slug.should.eql(exportData.data.tags[0].slug);

                // test tags
                tags.length.should.equal(exportData.data.tags.length, 'no new tags');

                done();
            }).catch(done);
        });
    });

    describe('Validation', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('doesn\'t import a title which is too long', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001', {lts: true}).then(function (exported) {
                exportData = exported;

                // change title to 300 characters  (soft limit is 255)
                exportData.data.posts[0].title = new Array(300).join('a');
                exportData.data.posts[0].tags = 'Tag';
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }).catch(function (error) {
                error[0].message.should.eql('Value in [posts.title] exceeds maximum length of 255 characters.');
                error[0].errorType.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(3, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        tags = importedData[2];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');

                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    done();
                });
            }).catch(done);
        });

        it('doesn\'t import a tag when meta title too long', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001', {lts: true}).then(function (exported) {
                exportData = exported;

                // change meta_title to 305 characters  (soft limit is 300)
                exportData.data.tags[0].meta_title = new Array(305).join('a');
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }).catch(function (error) {
                error[0].message.should.eql('Value in [tags.meta_title] exceeds maximum length of 300 characters.');
                error[0].errorType.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(3, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        tags = importedData[2];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');

                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    done();
                });
            }).catch(done);
        });

        it('doesn\'t import a user user when bio too long', function (done) {
            var exportData;

            testUtils.fixtures.loadExportFixture('export-001', {lts: true}).then(function (exported) {
                exportData = exported;

                // change bio to 300 characters (soft limit is 200)
                exportData.data.users[0].bio = new Array(300).join('a');
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }).catch(function (error) {
                error[0].message.should.eql('Value in [users.bio] exceeds maximum length of 200 characters.');
                error[0].errorType.should.eql('ValidationError');

                Promise.all([
                    knex('users').select(),
                    knex('posts').select(),
                    knex('tags').select()
                ]).then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(3, 'Did not get data successfully');

                    var users = importedData[0],
                        posts = importedData[1],
                        tags = importedData[2];

                    // we always have 1 user, the default user we added
                    users.length.should.equal(1, 'There should only be one user');

                    // Nothing should have been imported
                    posts.length.should.equal(0, 'Wrong number of posts');
                    tags.length.should.equal(0, 'no new tags');

                    done();
                });
            }).catch(done);
        });
    });
});

// Tests in here do an import-per-describe, and then have several tests to check various bits of data
describe('Import (new test structure)', function () {
    before(testUtils.teardown);

    describe('imports multi user data onto blank ghost install', function () {
        var exportData;

        before(function doImport(done) {
            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu', {lts: true});
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
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
                    tags,
                    post1,
                    post2,
                    post3,
                    post4;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test posts, settings and tags
                posts = importedData[0];
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
                post4 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[3].slug;
                });

                // test posts
                posts.length.should.equal(4, 'Wrong number of posts');
                post1.title.should.equal(exportData.data.posts[0].title);
                post2.title.should.equal(exportData.data.posts[1].title);
                post3.title.should.equal(exportData.data.posts[2].title);
                post4.title.should.equal(exportData.data.posts[3].title);

                // test tags
                tags.length.should.equal(3, 'should be 3 tags');

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
                    user1,
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

                // we imported 4 users
                // the original owner should be untouched
                // the two news users should have been created
                users.length.should.equal(4, 'There should only be 4 users');

                // the original owner user
                ownerUser = users[0];

                user1 = _.find(users, function (user) {
                    return user.name === exportData.data.users[0].name;
                });
                user2 = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                user3 = _.find(users, function (user) {
                    return user.name === exportData.data.users[2].name;
                });

                ownerUser.email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                ownerUser.password.should.equal(testUtils.DataGenerator.Content.users[0].password);
                ownerUser.status.should.equal('active');

                user1.email.should.equal(exportData.data.users[0].email);
                user2.email.should.equal(exportData.data.users[1].email);
                user3.email.should.equal(exportData.data.users[2].email);

                // Newly created users should have a status of locked
                user2.status.should.equal('locked');
                user3.status.should.equal('locked');

                // Newly created users should have created_at/_by and updated_at/_by set to when they were imported
                user2.created_by.should.equal(user1.id);
                user2.created_at.should.not.equal(exportData.data.users[1].created_at);
                user2.updated_by.should.equal(ownerUser.id);
                user2.updated_at.should.not.equal(exportData.data.users[1].updated_at);
                user3.created_by.should.equal(user1.id);
                user3.created_at.should.not.equal(exportData.data.users[2].created_at);
                user3.updated_by.should.equal(ownerUser.id);
                user3.updated_at.should.not.equal(exportData.data.users[2].updated_at);

                rolesUsers.length.should.equal(4, 'There should be 4 role relations');

                _.each(rolesUsers, function (roleUser) {
                    if (roleUser.user_id === ownerUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[3].id, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === user2.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'Josephine should be an admin');
                    }
                    if (roleUser.user_id === user3.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[2].id, 'Smith should be an author by default');
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
                var users, ownerUser, user1, user2, user3,
                    posts, post1, post2, post3, post4,
                    tags, tag1, tag2, tag3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                posts = importedData[1];
                tags = importedData[2];

                // Grab the users
                // the owner user is first
                // This is the owner which is present when the database get's created (not the imported owner)
                // The imported owner get's transformed into an administrator with a new id
                ownerUser = users[0];

                // Rachel the Machine (the imported owner)
                user1 = _.find(users, function (user) {
                    return user.name === exportData.data.users[0].name;
                });

                // Josephine Bloggs
                user2 = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });

                // Smith Wellingsworth
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
                post4 = _.find(posts, function (post) {
                    return post.slug === exportData.data.posts[3].slug;
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
                // This ensures that imported owner posts are getting imported with a new id
                post2.author_id.should.equal(user1.id);
                post3.author_id.should.equal(user3.id);
                post4.author_id.should.equal(user1.id);

                // Created by should be what was in the import file
                post1.created_by.should.equal(user1.id);
                post2.created_by.should.equal(user1.id);
                post3.created_by.should.equal(user3.id);

                // Updated by gets set to the current user
                post1.updated_by.should.equal(user1.id);
                post2.updated_by.should.equal(user1.id);
                post3.updated_by.should.equal(user3.id);

                // Published by should be what was in the import file
                post1.published_by.should.equal(user2.id);
                post2.published_by.should.equal(user1.id);
                post3.published_by.should.equal(user3.id);

                // Created by should be what was in the import file
                tag1.created_by.should.equal(user1.id);
                tag2.created_by.should.equal(user2.id);
                tag3.created_by.should.equal(user3.id);

                // Updated by gets set to the current user
                tag1.updated_by.should.equal(user1.id);
                tag2.updated_by.should.equal(user2.id);
                tag3.updated_by.should.equal(user1.id);

                done();
            }).catch(done);
        });
    });

    describe('imports multi user data with no owner onto blank ghost install', function () {
        var exportData;

        before(function doImport(done) {
            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu-noOwner', {lts: true});
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('gets the right data', function (done) {
            var fetchImported = Promise.join(
                knex('posts').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var posts,
                    tags,
                    post1,
                    post2,
                    post3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(2, 'Did not get data successfully');

                // Test posts, settings and tags
                posts = importedData[0];
                tags = importedData[1];

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
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[3].id, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === user2.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'Josephine should be an admin');
                    }
                    if (roleUser.user_id === user3.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[2].id, 'Smith should be an author by default');
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
                tags = importedData[2];

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
                post2.updated_by.should.equal(user3.id);
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
                tag2.updated_by.should.equal(user2.id);
                tag3.updated_by.should.equal(user1.id);

                done();
            }).catch(done);
        });
    });

    describe('imports multi user data onto existing data', function () {
        var exportData;

        before(function doImport(done) {
            // initialise the blog with some data
            testUtils.initFixtures('users:roles', 'posts', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu', {lts: true});
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('gets the right data', function (done) {
            var fetchImported = Promise.join(
                knex('posts').select(),
                knex('tags').select()
            );

            fetchImported.then(function (importedData) {
                var posts,
                    tags,
                    post1,
                    post2,
                    post3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(2, 'Did not get data successfully');

                // Test posts, settings and tags
                posts = importedData[0];
                tags = importedData[1];

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
                    importedOwnerUser,
                    users,
                    rolesUsers;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(2, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                rolesUsers = importedData[1];

                // we imported 3 users, there were already 3 users, only one of the imported users is new
                users.length.should.equal(6, 'There should only be 6 users');

                // the original owner user is first
                ownerUser = users[0];

                importedOwnerUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[0].name;
                });
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
                newUser.created_by.should.equal(importedOwnerUser.id);
                newUser.created_at.should.not.equal(exportData.data.users[1].created_at);
                newUser.updated_by.should.equal(ownerUser.id);
                newUser.updated_at.should.not.equal(exportData.data.users[1].updated_at);

                rolesUsers.length.should.equal(6, 'There should be 6 role relations');

                _.each(rolesUsers, function (roleUser) {
                    if (roleUser.user_id === ownerUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[3].id, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === importedOwnerUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'Imported owner should be an admin now.');
                    }
                    if (roleUser.user_id === newUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'New user should be an admin');
                    }
                    if (roleUser.user_id === existingUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'Existing user was an admin');
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
                var users, ownerUser, user2, user3, importedOwnerUser,
                    posts, post1, post2, post3,
                    tags, tag1, tag2, tag3;

                // General data checks
                should.exist(importedData);
                importedData.length.should.equal(3, 'Did not get data successfully');

                // Test the users and roles
                users = importedData[0];
                posts = importedData[1];
                tags = importedData[2];

                // Grab the users
                // the owner user is first
                ownerUser = users[0];

                importedOwnerUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[0].name;
                });
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
                post2.author_id.should.equal(importedOwnerUser.id);
                post3.author_id.should.equal(user3.id);

                // Created by should be what was in the import file
                post1.created_by.should.equal(importedOwnerUser.id);
                post2.created_by.should.equal(importedOwnerUser.id);
                post3.created_by.should.equal(user3.id);

                // Updated by gets set to the current user
                post1.updated_by.should.equal(importedOwnerUser.id);
                post2.updated_by.should.equal(importedOwnerUser.id);
                post3.updated_by.should.equal(user3.id);

                // Published by should be what was in the import file
                post1.published_by.should.equal(user2.id);
                post2.published_by.should.equal(importedOwnerUser.id);
                post3.published_by.should.equal(user3.id);

                // Created by should be what was in the import file
                tag1.created_by.should.equal(importedOwnerUser.id);
                tag2.created_by.should.equal(user2.id);
                tag3.created_by.should.equal(user3.id);

                // Updated by gets set to the current user
                tag1.updated_by.should.equal(importedOwnerUser.id);
                tag2.updated_by.should.equal(user2.id);
                tag3.updated_by.should.equal(importedOwnerUser.id);

                done();
            }).catch(done);
        });
    });

    describe('imports multi user data onto existing data without duplicate owners', function () {
        var exportData;

        before(function doImport(done) {
            // initialise the blog with some data
            testUtils.initFixtures('users:roles', 'posts', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-003-mu-multipleOwner', {lts: true});
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

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

                // the owner user is first
                ownerUser = users[0];

                // the other two users should have the imported data, but they get inserted in different orders
                newUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[1].name;
                });
                existingUser = _.find(users, function (user) {
                    return user.name === exportData.data.users[2].name;
                });

                // we imported 3 users, there were already 4 users, only one of the imported users is new
                users.length.should.equal(5, 'There should only be three users');

                rolesUsers.length.should.equal(5, 'There should be 5 role relations');

                _.each(rolesUsers, function (roleUser) {
                    if (roleUser.user_id === ownerUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[3].id, 'Original user should be an owner');
                    }
                    if (roleUser.user_id === newUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'New user should be downgraded from owner to admin');
                    }
                    if (roleUser.user_id === existingUser.id) {
                        roleUser.role_id.should.equal(testUtils.DataGenerator.Content.roles[0].id, 'Existing user was an admin');
                    }
                });

                done();
            }).catch(done);
        });
    });

    describe('lts: legacy fields', function () {
        var exportData;

        before(function doImport(done) {
            // initialise the blog with some data
            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-lts-legacy-fields', {lts: true});
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('ensure data is still imported and mapped correctly', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('posts').select(),
                knex('tags').select(),
                knex('settings').select()
            );

            fetchImported
                .then(function (importedData) {
                    should.exist(importedData);
                    importedData.length.should.equal(4);

                    var users = importedData[0],
                        posts = importedData[1],
                        tags = importedData[2],
                        settings = importedData[3],
                        firstPost = _.find(posts, {slug: exportData.data.posts[0].slug});

                    // Check length of of posts, tags and users
                    posts.length.should.equal(exportData.data.posts.length);
                    tags.length.should.equal(exportData.data.tags.length);
                    // Users include original user + joe bloggs' brother
                    users.length.should.equal(exportData.data.users.length + 1);

                    // Check feature image is correctly mapped for a post
                    firstPost.feature_image.should.eql('/content/images/2017/05/post-image.jpg');
                    // Check logo and cover images are correctly mapped for a user
                    users[1].cover_image.should.eql(exportData.data.users[0].cover);
                    users[1].profile_image.should.eql(exportData.data.users[0].image);
                    // Check feature image is correctly mapped for a tag
                    tags[0].feature_image.should.eql(exportData.data.tags[0].image);

                    // Check logo image is correctly mapped for a blog
                    settings[5].key.should.eql('logo');
                    settings[5].value.should.eql('/content/images/2017/05/bloglogo.jpeg');

                    // Check cover image is correctly mapped for a blog
                    settings[6].key.should.eql('cover_image');
                    settings[6].value.should.eql('/content/images/2017/05/blogcover.jpeg');

                    // Check default settings locale is not overwritten by defaultLang
                    settings[8].key.should.eql('default_locale');
                    settings[8].value.should.eql('en');

                    settings[17].key.should.eql('labs');
                    settings[17].value.should.eql('{"publicAPI":true}');

                    // Check post language is null
                    should(firstPost.locale).equal(null);
                    // Check post id has been inserted into amp column
                    should(firstPost.amp).equal(exportData.data.posts[0].id.toString());
                    // Check user language is null
                    should(users[1].locale).equal(null);

                    // Check mobiledoc is populated from markdown
                    JSON.parse(firstPost.mobiledoc).cards[0][1].markdown.should.eql(exportData.data.posts[0].markdown);

                    done();
                }).catch(done);
        });
    });

    describe('lts: style import with missing markdown or html values', function () {
        var exportData;

        before(function doImport(done) {
            // initialise the blog with some data
            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-lts-style-bad-markdown-html',
                    {lts: true}
                );
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('ensure images are mapped correctly and language is null', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('posts').select(),
                knex('tags').select(),
                knex('settings').select()
            );

            fetchImported.then(function (importedData) {
                should.exist(importedData);
                importedData.length.should.equal(4);

                var users = importedData[0],
                    posts = importedData[1],
                    tags = importedData[2],
                    settings = importedData[3],
                    firstPost = _.find(posts, {slug: exportData.data.posts[0].slug}),
                    secondPost = _.find(posts, {slug: exportData.data.posts[1].slug}),
                    thirdPost = _.find(posts, {slug: exportData.data.posts[2].slug}),
                    fourthPost = _.find(posts, {slug: exportData.data.posts[3].slug});

                // Check length of of posts, tags and users
                posts.length.should.equal(exportData.data.posts.length);
                tags.length.should.equal(exportData.data.tags.length);
                // Users include original user + joe bloggs' brother
                users.length.should.equal(exportData.data.users.length + 1);

                // Check feature image is correctly mapped for a post
                should(firstPost.feature_image).equal(null);
                // Check logo and cover images are correctly mapped for a user
                users[1].cover_image.should.eql(exportData.data.users[0].cover);
                users[1].profile_image.should.eql(exportData.data.users[0].image);
                // Check feature image is correctly mapped for a tag
                tags[0].feature_image.should.eql(exportData.data.tags[0].image);
                // Check logo image is correctly mapped for a blog
                settings[5].key.should.eql('logo');
                settings[5].value.should.eql('/content/images/2017/05/bloglogo.jpeg');
                // Check cover image is correctly mapped for a blog
                settings[6].key.should.eql('cover_image');
                settings[6].value.should.eql('/content/images/2017/05/blogcover.jpeg');

                // Check default settings locale is not overwritten by defaultLang
                settings[8].key.should.eql('default_locale');
                settings[8].value.should.eql('en');

                // Check post language is set to null
                should(firstPost.locale).equal(null);
                // Check user language is set to null
                should(users[1].locale).equal(null);

                // Check last_seen is mapped from last_login for user
                assert.equal(
                    moment(users[1].last_seen).valueOf(),
                    moment(exportData.data.users[0].last_login).valueOf()
                );
                // Check mobiledoc is populated from from html when mobiledoc is null & markdown is empty string
                JSON.parse(firstPost.mobiledoc).cards[0][1].markdown.should.eql(exportData.data.posts[0].html);
                // Check mobiledoc is populated from from html when mobiledoc is null & markdown is null
                JSON.parse(secondPost.mobiledoc).cards[0][1].markdown.should.eql(exportData.data.posts[1].html);
                // Check mobiledoc is null when markdown and mobiledoc are null and html is empty string
                should(thirdPost.mobiledoc).equal(null);
                // Check mobiledoc is null when markdown, mobiledoc are html are null
                should(fourthPost.mobiledoc).equal(null);

                done();
            }).catch(done);
        });

        it('ensure post without mobiledoc key uses markdown', function (done) {
            var fetchImported = Promise.resolve(knex('posts').select());

            fetchImported.then(function (importedData) {
                should.exist(importedData);
                importedData.length.should.equal(5);

                var posts = importedData,
                    fifthPost = _.find(posts, {slug: exportData.data.posts[4].slug});

                // Check mobiledoc is populated from from html when mobiledoc is null & markdown is empty string
                JSON.parse(fifthPost.mobiledoc).cards[0][1].markdown.should.eql(exportData.data.posts[4].markdown);

                done();
            }).catch(done);
        });
    });

    describe('lts: style import for user with a very long email address', function () {
        var exportData;

        before(function doImport(done) {
            // initialise the blog with some data
            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-lts-style-user-long-email',
                    {lts: true}
                );
            }).then(function (exported) {
                exportData = exported;
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('provides error message and does not import where lts email address is longer that 1.0.0 constraint', function (done) {
            testUtils.fixtures.loadExportFixture('export-lts-style-user-long-email', {lts: true}).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                (1).should.eql(0, 'Data import should not resolve promise.');
            }).catch(function (error) {
                error[0].message.should.eql('Value in [users.email] exceeds maximum length of 191 characters.');
                error[0].errorType.should.eql('ValidationError');

                Promise.resolve(knex('users').select()).then(function (users) {
                    should.exist(users);

                    users.length.should.equal(1, 'Did not get data successfully');
                    users[0].email.should.not.equal(exportData.data.users[0].email);

                    done();
                });
            });
        });
    });

    describe('lts: multiple roles attached', function () {
        var exportData;

        before(function doImport(done) {
            // initialise the blog with some data
            testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-lts-multiple-roles',
                    {lts: true}
                );
            }).then(function (exported) {
                exportData = exported;
                return dataImporter.doImport(exportData, importOptions);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('takes the latest role attached', function (done) {
            var fetchImported = Promise.join(
                knex('users').select(),
                knex('roles_users').select(),
                knex('roles').select()
            );

            fetchImported
                .then(function (importedData) {
                    should.exist(importedData);
                    importedData.length.should.equal(3);

                    var users = importedData[0],
                        rolesUsers = importedData[1],
                        roles = importedData[2];

                    users.length.should.equal(4);

                    // original owner, search the owner by slug
                    _.find(rolesUsers, {user_id: _.find(users, {slug: testUtils.DataGenerator.Content.users[0].slug}).id}).role_id.should.eql(_.find(roles, {name: 'Owner'}).id);

                    // first imported user, which was the original owner, now administator
                    _.find(rolesUsers, {user_id: _.find(users, {slug: exportData.data.users[0].slug}).id}).role_id.should.eql(_.find(roles, {name: 'Administrator'}).id);

                    // second imported users, which has two roles attached, but the last role is the owner role, now administraotr
                    _.find(rolesUsers, {user_id: _.find(users, {slug: exportData.data.users[1].slug}).id}).role_id.should.eql(_.find(roles, {name: 'Administrator'}).id);

                    // second imported users, which has two roles attached, but the last role is the editor role
                    _.find(rolesUsers, {user_id: _.find(users, {slug: exportData.data.users[2].slug}).id}).role_id.should.eql(_.find(roles, {name: 'Editor'}).id);

                    done();
                }).catch(done);
        });
    });

    describe('1.0: basic import test', function () {
        var exportData;

        before(function doImport() {
            // initialize the blog with some data
            return testUtils.initFixtures('roles', 'owner', 'settings').then(function () {
                return testUtils.fixtures.loadExportFixture('export-basic-test');
            }).then(function (exported) {
                exportData = exported.db[0];
                return dataImporter.doImport(exportData, importOptions);
            });
        });

        after(testUtils.teardown);

        it('keeps the value of the amp field', function () {
            return models.Post.findPage(_.merge({formats: 'amp'}, testUtils.context.internal)).then(function (response) {
                should.exist(response.posts);

                response.posts.length.should.eql(exportData.data.posts.length);
                response.posts[0].amp.should.eql(exportData.data.posts[1].id);
                response.posts[1].amp.should.eql(exportData.data.posts[0].amp);

                response.posts[0].comment_id.should.eql(response.posts[0].amp);
                response.posts[1].comment_id.should.eql(response.posts[1].amp);
            });
        });
    });
});
