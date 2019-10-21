var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    moment = require('moment'),
    ObjectId = require('bson-objectid'),
    assert = require('assert'),
    _ = require('lodash'),
    validator = require('validator'),

    // Stuff we are testing
    db = require('../../../server/data/db'),
    models = require('../../../server/models'),
    importer = require('../../../server/data/importer'),
    dataImporter = importer.importers[1],
    importOptions = {
        returnImportedData: true
    },

    knex = db.knex;

const exportedLatestBody = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1504269105806,
                version: '2.0.0'
            },
            data: {
                app_fields: [],
                app_settings: [],
                apps: [],
                brute: [],
                invites: [],
                migrations: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_tags: [],
                posts_authors: [],
                roles: [],
                roles_users: [],
                settings: [],
                subscribers: [],
                tags: [],
                users: []
            }
        }]
    });
};

const exportedPreviousBody = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1504269105806,
                version: '1.20.0'
            },
            data: {
                app_fields: [],
                app_settings: [],
                apps: [],
                brute: [],
                invites: [],
                migrations: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_tags: [],
                posts_authors: [],
                roles: [],
                roles_users: [],
                settings: [],
                subscribers: [],
                tags: [],
                users: []
            }
        }]
    });
};

const exportedLegacyBody = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1504269105806,
                version: '300'
            },
            data: {
                app_fields: [],
                app_settings: [],
                apps: [],
                brute: [],
                invites: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_tags: [],
                roles: [],
                roles_users: [],
                settings: [],
                subscribers: [],
                tags: [],
                users: []
            }
        }]
    });
};

// Tests in here do an import for each test
describe('Integration: Importer', function () {
    before(testUtils.teardown);

    beforeEach(function () {
        sinon.stub(importer, 'cleanUp');
    });

    afterEach(testUtils.teardown);
    afterEach(function () {
        sinon.restore();
    });

    should.exist(importer);

    describe('Empty database (except of owner user), general tests', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'settings'));

        it('ensure return structure', function () {
            let exportData;

            return dataImporter.doImport(exportedLatestBody().db[0], importOptions)
                .then(function (importResult) {
                    should.exist(importResult);
                    importResult.hasOwnProperty('data').should.be.true();
                    importResult.hasOwnProperty('problems').should.be.true();
                });
        });

        it('cares about invalid dates and date formats', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                created_at: '00-00-0000 00:00:00',
                updated_at: 'Fri, 18 Oct 2013 23:58:44 +0000',
                published_at: 1388318310783
            });

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                created_at: 1388318310000,
                updated_at: 1388318310000,
                published_at: 1388404710000,
                slug: 'post2'
            });

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                created_at: 1388318310000,
                updated_at: 1388318310000,
                published_at: 1388404710000,
                slug: 'post3'
            });

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({
                updated_at: '2016-07-17T12:02:54.000Z'
            });

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    should.exist(importResult.data.posts);
                    importResult.data.posts.length.should.equal(2);
                    importResult.problems.length.should.eql(1);

                    importResult.problems[0].message.should.eql('Date is in a wrong format and invalid. ' +
                        'It was replaced with the current timestamp.');
                    importResult.problems[0].help.should.eql('Post');

                    moment(importResult.data.posts[0].created_at).isValid().should.eql(true);
                    moment(importResult.data.posts[0].updated_at).format().should.eql('2013-10-18T23:58:44Z');
                    moment(importResult.data.posts[0].published_at).format().should.eql('2013-12-29T11:58:30Z');
                    moment(importResult.data.tags[0].updated_at).format().should.eql('2016-07-17T12:02:54Z');

                    // Ensure sqlite3 & mysql import of dates works as expected
                    assert.equal(moment(importResult.data.posts[1].created_at).valueOf(), 1388318310000);
                    assert.equal(moment(importResult.data.posts[1].updated_at).valueOf(), 1388318310000);
                    assert.equal(moment(importResult.data.posts[1].published_at).valueOf(), 1388404710000);
                });
        });

        it('warning that theme was not imported', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.settings[0] = testUtils.DataGenerator.forKnex.createSetting({
                key: 'active_theme',
                value: 'mytheme',
                type: 'theme'
            });

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    importResult.problems.length.should.eql(1);
                    importResult.problems[0].message.should.eql('Theme not imported, please upload in Settings - Design');
                    return models.Settings.findOne(_.merge({key: 'active_theme'}, testUtils.context.internal));
                })
                .then(function (result) {
                    result.attributes.value.should.eql('casper');
                });
        });

        it('removes duplicate users', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({
                name: 'Joe Bloggs',
                slug: 'joe-bloggs',
                email: 'jbloggs@example.com'
            });

            exportData.data.users[1] = testUtils.DataGenerator.forKnex.createUser();

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    should.exist(importResult.data.users);
                    importResult.data.users.length.should.equal(1);
                    importResult.problems.length.should.eql(1);

                    importResult.problems[0].message.should.eql('Entry was not imported and ignored. Detected duplicated entry.');
                    importResult.problems[0].help.should.eql('User');
                });
        });

        it('removes duplicate posts', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'same'
            });

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'same'
            });

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    should.exist(importResult.data.posts);
                    importResult.data.posts.length.should.equal(1);
                    importResult.problems.length.should.eql(1);

                    importResult.problems[0].message.should.eql('Entry was not imported and ignored. Detected duplicated entry.');
                    importResult.problems[0].help.should.eql('Post');
                });
        });

        it('does not treat posts without slug as duplicate', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = {
                title: 'duplicate title'
            };

            exportData.data.posts[1] = {
                title: 'duplicate title'
            };

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    should.exist(importResult.data.posts);
                    importResult.data.posts.length.should.equal(2);
                    importResult.problems.length.should.eql(0);

                    importResult.data.posts[0].title.should.equal('duplicate title');
                    importResult.data.posts[1].title.should.equal('duplicate title');

                    importResult.data.posts[0].slug.should.equal('duplicate-title');
                    importResult.data.posts[1].slug.should.equal('duplicate-title-2');
                });
        });

        it('can import user with missing allowed fields', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser();
            delete exportData.data.users[0].website;
            delete exportData.data.users[0].bio;
            delete exportData.data.users[0].accessibility;
            delete exportData.data.users[0].cover_image;

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    importResult.data.users[0].hasOwnProperty('website');
                    importResult.data.users[0].hasOwnProperty('bio');
                    importResult.data.users[0].hasOwnProperty('accessibility');
                    importResult.data.users[0].hasOwnProperty('cover_image');
                });
        });

        it('removes duplicate tags and updates associations', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost();

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'getting-started'
            });

            exportData.data.tags[1] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'getting-started'
            });

            exportData.data.posts_tags = [
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[0].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[1].id)
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    should.exist(importResult.data.tags);
                    should.exist(importResult.originalData.posts_tags);

                    importResult.data.tags.length.should.equal(1);

                    // Check we imported all posts_tags associations
                    importResult.originalData.posts_tags.length.should.equal(2);

                    // Check the post_tag.tag_id was updated when we removed duplicate tag
                    _.every(importResult.originalData.posts_tags, function (postTag) {
                        return postTag.tag_id !== 2;
                    });

                    importResult.problems.length.should.equal(1);

                    importResult.problems[0].message.should.eql('Entry was not imported and ignored. Detected duplicated entry.');
                    importResult.problems[0].help.should.eql('Tag');
                });
        });

        it('removes broken tags from post (not in db, not in file)', function () {
            let exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'welcome-to-ghost-2'
            });

            exportData.data.posts_tags = [
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, '100'),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, '200')
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage({withRelated: ['tags']})
                    ]);
                })
                .then(function (data) {
                    data[0].data.length.should.eql(1);
                    data[0].data[0].toJSON().slug.should.eql('welcome-to-ghost-2');
                    data[0].data[0].toJSON().tags.length.should.eql(0);
                });
        });

        it('imports post status', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({status: 'scheduled', slug: 'post1'});
            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({status: 'published', slug: 'post2'});

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return models.Post.findPage(testUtils.context.internal);
                })
                .then(function (result) {
                    result.data.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');
                    result.data[0].toJSON().status.should.eql('scheduled');
                    result.data[1].toJSON().status.should.eql('published');
                });
        });

        // @TODO: ensure permissions, roles etc are not imported (!)
        it('ensure complex JSON get\'s fully imported', function () {
            const exportData = exportedLatestBody().db[0];

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    // Grab the data from tables
                    return Promise.all([
                        knex('users').select(),
                        models.Post.findPage(testUtils.context.internal),
                        knex('settings').select(),
                        knex('tags').select()
                    ]);
                })
                .then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(4, 'Did not get data successfully');

                    const users = importedData[0],
                        posts = importedData[1].data,
                        settings = importedData[2],
                        tags = importedData[3];

                    // we always have 1 user, the owner user we added
                    users.length.should.equal(1, 'There should only be one user');

                    settings.length.should.be.above(0, 'Wrong number of settings');
                    posts.length.should.equal(exportData.data.posts.length, 'no new posts');
                    tags.length.should.equal(exportData.data.tags.length, 'no new tags');
                });
        });

        it('import owner, ensure original owner stays as is', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser();
            exportData.data.roles_users[0] = [
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, testUtils.DataGenerator.Content.roles[3].id)
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return models.User.findAll(Object.assign({withRelated: ['roles']}, testUtils.context.internal));
                })
                .then(function (result) {
                    result.models.length.should.eql(2);

                    result.models[0].get('email').should.equal(testUtils.DataGenerator.Content.users[0].email);
                    result.models[0].get('slug').should.equal(testUtils.DataGenerator.Content.users[0].slug);
                    result.models[0].get('name').should.equal(testUtils.DataGenerator.Content.users[0].name);

                    result.models[1].get('email').should.equal(exportData.data.users[0].email);
                    result.models[1].get('slug').should.equal(exportData.data.users[0].slug);
                    result.models[1].get('name').should.equal(exportData.data.users[0].name);

                    return models.User.isPasswordCorrect({
                        hashedPassword: result.models[0].get('password'),
                        plainPassword: testUtils.DataGenerator.Content.users[0].password
                    });
                });
        });

        it('imports comment_id correctly', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost();

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    importResult.problems.length.should.eql(0);
                    importResult.data.posts[0].comment_id.should.eql(exportData.data.posts[0].id.toString());
                });
        });

        it('handles validation errors nicely', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({slug: 'post1'});
            exportData.data.posts[0].title = null;

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({slug: 'post2'});
            exportData.data.posts[1].title = new Array(600).join('a');

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({slug: 'tag1'});
            exportData.data.tags[0].name = null;

            exportData.data.tags[1] = testUtils.DataGenerator.forKnex.createTag({slug: 'tag2'});
            exportData.data.tags[1].meta_title = new Array(305).join('a');

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser();
            exportData.data.users[0].bio = new Array(300).join('a');

            exportData.data.users[1] = testUtils.DataGenerator.forKnex.createUser({
                email: 'thisisareallylongemailaddressIamhappytobeusingacharactercounterbutIhavealongwaytogoyetImeanserioulsywhohasemailaddressthislongthereisnowaythiswillpassvalidationsonghost100andisarealedgecase'
            });

            exportData.data.settings[0] = testUtils.DataGenerator.forKnex.createSetting();
            exportData.data.settings[0].key = null;

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    (1).should.eql(0, 'Allowed import of duplicate data.');
                })
                .catch(function (response) {
                    response.length.should.equal(7);

                    // NOTE: a duplicated tag.slug is a warning
                    response[0].errorType.should.equal('ValidationError');
                    response[0].message.should.eql('Value in [users.bio] exceeds maximum length of 200 characters.');

                    response[1].errorType.should.equal('ValidationError');
                    response[1].message.should.eql('Validation (isEmail) failed for email');

                    response[2].errorType.should.equal('ValidationError');
                    response[2].message.should.eql('Value in [tags.name] cannot be blank.');

                    response[3].errorType.should.equal('ValidationError');
                    response[3].message.should.eql('Value in [tags.meta_title] exceeds maximum length of 300 characters.');

                    response[4].message.should.eql('Value in [posts.title] cannot be blank.');
                    response[4].errorType.should.eql('ValidationError');

                    response[5].errorType.should.equal('ValidationError');
                    response[5].message.should.eql('Value in [posts.title] exceeds maximum length of 255 characters.');

                    response[6].errorType.should.equal('ValidationError');
                    response[6].message.should.eql('Value in [settings.key] cannot be blank.');
                });
        });

        it('does import data with invalid user references', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({author_id: 2, published_by: 2});
            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser();
            exportData.data.users[0].updated_by = null;

            exportData.data.posts[0].created_by = exportData.data.users[0].id;

            return dataImporter.doImport(exportData, importOptions)
                .then(function (importedData) {
                    importedData.problems.length.should.eql(2);

                    importedData.problems[0].message.should.eql('Entry was imported, but we were not able to resolve the ' +
                        'following user references: updated_by. The user does not exist, fallback to owner user.');
                    importedData.problems[0].help.should.eql('User');

                    importedData.problems[1].message.should.eql('Entry was imported, but we were not able to ' +
                        'resolve the following user references: author_id, published_by. The user does not exist, fallback to owner user.');
                    importedData.problems[1].help.should.eql('Post');

                    // Grab the data from tables
                    return Promise.all([
                        models.User.findPage(testUtils.context.internal),
                        models.Post.findPage(testUtils.context.internal)
                    ]);
                })
                .then(function (importedData) {
                    should.exist(importedData);

                    importedData.length.should.equal(2, 'Did not get data successfully');

                    const users = importedData[0].data.map(model => model.toJSON());
                    const posts = importedData[1].data.map(model => model.toJSON());

                    posts.length.should.equal(1, 'Wrong number of posts');
                    users.length.should.equal(2, 'Wrong number of users');

                    // NOTE: we fallback to owner user for invalid user references

                    users[1].slug.should.eql(exportData.data.users[0].slug);
                    users[1].updated_by.should.eql(testUtils.DataGenerator.Content.users[0].id);

                    posts[0].slug.should.eql(exportData.data.posts[0].slug);
                    posts[0].author.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    posts[0].published_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    posts[0].created_by.should.eql(users[1].id);
                });
        });

        it('invalid uuid', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({uuid: '528258181e668', slug: 'post1'});
            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({uuid: '', slug: 'post2'});
            exportData.data.posts[2] = testUtils.DataGenerator.forKnex.createPost({slug: 'post3'});
            delete exportData.data.posts[2].uuid;
            exportData.data.posts[3] = testUtils.DataGenerator.forKnex.createPost({uuid: 'hey-i\'m-not-a-uuid-at-all', slug: 'post4'});

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return models.Post.findPage(testUtils.context.internal);
                }).then(function (result) {
                    assert.equal(validator.isUUID(result.data[0].toJSON().uuid), true, 'Old Ghost UUID NOT fixed');
                    assert.equal(validator.isUUID(result.data[1].toJSON().uuid), true, 'Empty UUID NOT fixed');
                    assert.equal(validator.isUUID(result.data[2].toJSON().uuid), true, 'Missing UUID NOT fixed');
                    assert.equal(validator.isUUID(result.data[3].toJSON().uuid), true, 'Malformed UUID NOT fixed');
                });
        });

        it('ensure post tag order is correct', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({slug: 'post1', published_at: moment().add(3, 'day').toDate()});
            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({slug: 'post2', published_at: moment().add(1, 'day').toDate()});
            exportData.data.posts[2] = testUtils.DataGenerator.forKnex.createPost({slug: 'post3', published_at: moment().add(2, 'day').toDate()});

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({slug: 'two'});
            exportData.data.tags[1] = testUtils.DataGenerator.forKnex.createTag({slug: 'one'});
            exportData.data.tags[2] = testUtils.DataGenerator.forKnex.createTag({slug: 'three'});

            exportData.data.posts_tags = [
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[0].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[1].id, exportData.data.tags[1].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[1].id, exportData.data.tags[0].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[2].id, exportData.data.tags[2].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[2].id, exportData.data.tags[0].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[2].id, exportData.data.tags[1].id)
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(Object.assign({withRelated: ['tags']}, testUtils.context.internal)),
                        models.Tag.findPage(Object.assign({order: 'slug ASC'}, testUtils.context.internal))
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON());
                    const tags = result[1].data.map(model => model.toJSON());

                    posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // post1
                    posts[0].slug.should.eql(exportData.data.posts[0].slug);
                    posts[0].tags.length.should.eql(1);
                    posts[0].tags[0].slug.should.eql(exportData.data.tags[0].slug);

                    // post3, has a specific sort_order
                    posts[1].slug.should.eql(exportData.data.posts[2].slug);
                    posts[1].tags.length.should.eql(3);
                    posts[1].tags[0].slug.should.eql(exportData.data.tags[2].slug);
                    posts[1].tags[1].slug.should.eql(exportData.data.tags[0].slug);
                    posts[1].tags[2].slug.should.eql(exportData.data.tags[1].slug);

                    // post2, sort_order property is missing (order depends on the posts_tags entries)
                    posts[2].slug.should.eql(exportData.data.posts[1].slug);
                    posts[2].tags.length.should.eql(2);
                    posts[2].tags[0].slug.should.eql(exportData.data.tags[1].slug);
                    posts[2].tags[1].slug.should.eql(exportData.data.tags[0].slug);

                    // test tags
                    tags.length.should.equal(exportData.data.tags.length, 'no new tags');
                });
        });

        it('import multiple users, tags, posts', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({email: 'user1@ghost.org', slug: 'user1'});
            exportData.data.users[1] = testUtils.DataGenerator.forKnex.createUser({email: 'user2@ghost.org', slug: 'user2', created_by: exportData.data.users[0].id});
            exportData.data.users[2] = testUtils.DataGenerator.forKnex.createUser({email: 'user3@ghost.org', slug: 'user3'});
            exportData.data.users[3] = testUtils.DataGenerator.forKnex.createUser({email: 'user4@ghost.org', slug: 'user4', updated_by: exportData.data.users[1].id});

            exportData.data.roles = [
                testUtils.DataGenerator.forKnex.createRole({name: 'Administrator'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Editor'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Author'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Owner'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Contributor'})
            ];

            exportData.data.roles_users = [
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, exportData.data.roles[0].id),
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[2].id, exportData.data.roles[2].id),
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[3].id, exportData.data.roles[4].id)
            ];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                title: 'title1',
                author_id: exportData.data.users[0].id,
                created_by: exportData.data.users[0].id,
                updated_by: exportData.data.users[1].id,
                published_by: exportData.data.users[1].id
            });
            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                title: 'title2',
                author_id: exportData.data.users[3].id,
                created_by: exportData.data.users[2].id,
                updated_by: exportData.data.users[0].id,
                published_by: exportData.data.users[1].id
            });
            exportData.data.posts[2] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post3',
                title: 'title3',
                author_id: exportData.data.users[0].id,
                created_by: exportData.data.users[3].id,
                updated_by: exportData.data.users[3].id,
                published_by: exportData.data.users[3].id
            });

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'tag1',
                created_by: exportData.data.users[3].id,
                updated_by: exportData.data.users[0].id
            });
            exportData.data.tags[1] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'tag2',
                created_by: exportData.data.users[1].id,
                updated_by: exportData.data.users[3].id
            });
            exportData.data.tags[2] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'tag3',
                created_by: exportData.data.users[2].id,
                updated_by: exportData.data.users[2].id
            });

            const postOptions = Object.assign({withRelated: ['tags']}, testUtils.context.internal);
            const tagOptions = Object.assign({order: 'slug ASC'}, testUtils.context.internal);
            const userOptions = Object.assign({withRelated: ['roles']}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(postOptions),
                        models.Tag.findPage(tagOptions),
                        models.User.findPage(userOptions)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(postOptions));
                    const tags = result[1].data.map(model => model.toJSON(tagOptions));
                    const users = result[2].data.map(model => model.toJSON(userOptions));

                    posts.length.should.equal(exportData.data.posts.length, 'Wrong number of posts');

                    // findPage returns the posts in correct order (latest created post is the first)
                    posts[0].title.should.equal(exportData.data.posts[2].title);
                    posts[1].title.should.equal(exportData.data.posts[1].title);
                    posts[2].title.should.equal(exportData.data.posts[0].title);

                    posts[0].slug.should.equal(exportData.data.posts[2].slug);
                    posts[1].slug.should.equal(exportData.data.posts[1].slug);
                    posts[2].slug.should.equal(exportData.data.posts[0].slug);

                    posts[0].author.should.equal(users[1].id);
                    posts[1].author.should.equal(users[4].id);
                    posts[2].author.should.equal(users[1].id);

                    posts[0].created_by.should.equal(users[4].id);
                    posts[1].created_by.should.equal(users[3].id);
                    posts[2].created_by.should.equal(users[1].id);

                    posts[0].updated_by.should.equal(users[4].id);
                    posts[1].updated_by.should.equal(users[1].id);
                    posts[2].updated_by.should.equal(users[2].id);

                    posts[0].published_by.should.equal(users[4].id);
                    posts[1].published_by.should.equal(users[2].id);
                    posts[2].published_by.should.equal(users[2].id);

                    tags.length.should.equal(exportData.data.tags.length, 'Wrong number of tags');

                    tags[0].created_by.should.equal(users[4].id);
                    tags[1].created_by.should.equal(users[2].id);
                    tags[2].created_by.should.equal(users[3].id);

                    tags[0].updated_by.should.equal(users[1].id);
                    tags[1].updated_by.should.equal(users[4].id);
                    tags[2].updated_by.should.equal(users[3].id);

                    // 4 imported users + 1 owner user
                    users.length.should.equal(exportData.data.users.length + 1, 'Wrong number of users');

                    users[0].email.should.equal(testUtils.DataGenerator.Content.users[0].email);
                    users[1].email.should.equal(exportData.data.users[0].email);
                    users[2].email.should.equal(exportData.data.users[1].email);
                    users[3].email.should.equal(exportData.data.users[2].email);
                    users[4].email.should.equal(exportData.data.users[3].email);

                    users[0].status.should.equal('active');
                    users[1].status.should.equal('locked');
                    users[2].status.should.equal('locked');
                    users[3].status.should.equal('locked');
                    users[4].status.should.equal('locked');

                    users[1].created_at.toISOString().should.equal(moment(exportData.data.users[0].created_at).startOf('seconds').toISOString());
                    users[2].created_at.toISOString().should.equal(moment(exportData.data.users[1].created_at).startOf('seconds').toISOString());
                    users[3].created_at.toISOString().should.equal(moment(exportData.data.users[2].created_at).startOf('seconds').toISOString());
                    users[4].created_at.toISOString().should.equal(moment(exportData.data.users[3].created_at).startOf('seconds').toISOString());

                    users[1].updated_at.toISOString().should.equal(moment(exportData.data.users[0].updated_at).startOf('seconds').toISOString());
                    users[2].updated_at.toISOString().should.equal(moment(exportData.data.users[1].updated_at).startOf('seconds').toISOString());
                    users[3].updated_at.toISOString().should.equal(moment(exportData.data.users[2].updated_at).startOf('seconds').toISOString());
                    users[4].updated_at.toISOString().should.equal(moment(exportData.data.users[3].updated_at).startOf('seconds').toISOString());

                    users[1].created_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    users[1].updated_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    users[2].created_by.should.eql(users[1].id);
                    users[2].updated_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    users[3].created_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    users[3].updated_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    users[4].created_by.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    users[4].updated_by.should.eql(users[2].id);

                    users[0].roles[0].id.should.eql(testUtils.DataGenerator.Content.roles[3].id);
                    users[1].roles[0].id.should.eql(testUtils.DataGenerator.Content.roles[0].id);
                    users[2].roles[0].id.should.eql(testUtils.DataGenerator.Content.roles[2].id);
                    users[3].roles[0].id.should.eql(testUtils.DataGenerator.Content.roles[2].id);
                    users[4].roles[0].id.should.eql(testUtils.DataGenerator.Content.roles[4].id);
                });
        });

        it('can handle if user has multiple roles attached', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({
                email: 'user1@ghost.org',
                slug: 'user1'
            });

            exportData.data.roles = [
                testUtils.DataGenerator.forKnex.createRole({name: 'Administrator'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Editor'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Author'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Owner'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Contributor'})
            ];

            exportData.data.roles_users = [
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, exportData.data.roles[0].id),
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, exportData.data.roles[4].id)
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.User.findPage(Object.assign({withRelated: ['roles']}, testUtils.context.internal))
                    ]);
                }).then(function (result) {
                    const users = result[0].data.map(model => model.toJSON());

                    users.length.should.eql(2);
                    users[1].slug.should.eql(exportData.data.users[0].slug);
                    users[1].slug.should.eql(exportData.data.users[0].slug);
                    users[1].roles.length.should.eql(1);
                    users[1].roles[0].id.should.eql(testUtils.DataGenerator.Content.roles[4].id);
                });
        });

        it('can handle related tags with missing optional fields', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost();

            // NOTE: not including slug, description etc. fields as the only required field
            // to handle the import of tags is 'name'
            exportData.data.tags[0] = {
                id: ObjectId.generate(),
                name: 'first tag'
            };
            exportData.data.tags[1] = {
                id: ObjectId.generate(),
                name: 'second tag'
            };
            exportData.data.tags[2] = {
                id: ObjectId.generate(),
                name: 'third tag'
            };

            exportData.data.posts_tags = [
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[0].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[1].id),
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[2].id)
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function (imported) {
                    imported.problems.length.should.eql(0);

                    return Promise.all([
                        models.Tag.findPage(Object.assign({order: 'slug ASC'}, testUtils.context.internal)),
                        models.Post.findPage(Object.assign({withRelated: ['tags']}, testUtils.context.internal))
                    ]);
                }).then(function (result) {
                    const tags = result[0].data.map(model => model.toJSON());
                    const posts = result[1].data.map(model => model.toJSON());

                    posts.length.should.eql(1);
                    tags.length.should.eql(3);

                    posts[0].tags.length.should.eql(3);
                    tags[0].name.should.eql('first tag');
                    tags[0].slug.should.eql('first-tag');
                    tags[1].name.should.eql('second tag');
                    tags[2].name.should.eql('third tag');
                });
        });

        it('can handle uppercase tags', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost();

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'TAG-1'
            });

            exportData.data.posts_tags = [
                testUtils.DataGenerator.forKnex.createPostsTags(exportData.data.posts[0].id, exportData.data.tags[0].id)
            ];

            return dataImporter.doImport(exportData, importOptions)
                .then(function (imported) {
                    imported.problems.length.should.eql(0);

                    return Promise.all([
                        models.Tag.findPage(Object.assign({order: 'slug ASC'}, testUtils.context.internal)),
                        models.Post.findPage(Object.assign({withRelated: ['tags']}, testUtils.context.internal))
                    ]);
                }).then(function (result) {
                    const tags = result[0].data.map(model => model.toJSON());
                    const posts = result[1].data.map(model => model.toJSON());

                    posts.length.should.eql(1);
                    tags.length.should.eql(1);

                    posts[0].tags.length.should.eql(1);
                    tags[0].slug.should.eql('tag-1');
                });
        });

        it('does not import settings: slack hook, permalinks', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.settings[0] = testUtils.DataGenerator.forKnex.createSetting({
                key: 'slack',
                value: '[{\\"url\\":\\"https://hook.slack.com\\"}]'
            });

            exportData.data.settings[1] = testUtils.DataGenerator.forKnex.createSetting({
                key: 'permalinks',
                value: '/:primary_author/:slug/'
            });

            return dataImporter.doImport(exportData, importOptions)
                .then(function (imported) {
                    imported.problems.length.should.eql(1);
                    return models.Settings.findOne(_.merge({key: 'slack'}, testUtils.context.internal));
                })
                .then(function (result) {
                    result.attributes.value.should.eql('[{"url":""}]');
                    return models.Settings.findOne(_.merge({key: 'permalinks'}, testUtils.context.internal));
                })
                .then((result) => {
                    result.attributes.value.should.eql('/:slug/');
                });
        });

        it('does import settings with string booleans', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.settings[0] = testUtils.DataGenerator.forKnex.createSetting({
                key: 'amp',
                value: 'true'
            });

            exportData.data.settings[1] = testUtils.DataGenerator.forKnex.createSetting({
                key: 'is_private',
                value: '0'
            });

            exportData.data.settings[2] = testUtils.DataGenerator.forKnex.createSetting({
                key: 'force_i18n',
                value: false
            });

            return dataImporter.doImport(exportData, importOptions)
                .then(function (imported) {
                    imported.problems.length.should.eql(0);
                    return models.Settings.findOne(_.merge({key: 'amp'}, testUtils.context.internal));
                })
                .then(function (result) {
                    result.attributes.value.should.eql(true);
                    return models.Settings.findOne(_.merge({key: 'is_private'}, testUtils.context.internal));
                })
                .then((result) => {
                    result.attributes.value.should.eql(false);
                    return models.Settings.findOne(_.merge({key: 'force_i18n'}, testUtils.context.internal));
                })
                .then((result) => {
                    result.attributes.value.should.eql(false);

                    return db
                        .knex('settings')
                        .where('key', 'amp');
                })
                .then((result) => {
                    result[0].value.should.eql('true');

                    return db
                        .knex('settings')
                        .where('key', 'is_private');
                })
                .then((result) => {
                    result[0].value.should.eql('false');

                    return db
                        .knex('settings')
                        .where('key', 'force_i18n');
                })
                .then((result) => {
                    result[0].value.should.eql('false');
                });
        });

        it('import comment_id', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                comment_id: ObjectId.generate()
            });

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({slug: 'post2'});

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(testUtils.context.internal)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON());

                    posts.length.should.eql(2);
                    posts[0].comment_id.should.eql(exportData.data.posts[1].id);
                    posts[1].comment_id.should.eql(exportData.data.posts[0].comment_id);
                });
        });

        it('ensure authors are imported correctly', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({email: 'user1@ghost.org', slug: 'user1'});
            exportData.data.users[1] = testUtils.DataGenerator.forKnex.createUser({email: 'user2@ghost.org', slug: 'user2'});
            exportData.data.users[2] = testUtils.DataGenerator.forKnex.createUser({email: 'user3@ghost.org', slug: 'user3'});
            exportData.data.users[3] = testUtils.DataGenerator.forKnex.createUser({email: 'user4@ghost.org', slug: 'user4'});
            exportData.data.users[4] = testUtils.DataGenerator.forKnex.createUser({email: 'user4@ghost.org', slug: 'user4'});
            exportData.data.users[5] = testUtils.DataGenerator.forKnex.createUser({
                email: testUtils.DataGenerator.Content.users[0].email,
                slug: 'user5'
            });

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                author_id: testUtils.DataGenerator.Content.users[0].id
            });
            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                author_id: testUtils.DataGenerator.Content.users[0].id
            });
            exportData.data.posts[2] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post3',
                author_id: testUtils.DataGenerator.Content.users[0].id
            });

            exportData.data.posts_authors = [
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[0].id, exportData.data.users[1].id, 0),
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[0].id, exportData.data.users[1].id, 0),
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[0].id, exportData.data.users[0].id, 2),
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[0].id, exportData.data.users[2].id, 4),

                testUtils.DataGenerator.forKnex.createPostsAuthors('unknown', exportData.data.users[0].id, 1),

                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[2].id, exportData.data.users[3].id, 0),
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[2].id, ObjectId.generate(), 1),
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[2].id, exportData.data.users[4].id, 2),
                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[2].id, exportData.data.users[4].id, 2),

                testUtils.DataGenerator.forKnex.createPostsAuthors(exportData.data.posts[1].id, exportData.data.users[5].id)
            ];

            delete exportData.data.posts_authors[9].sort_order;

            return dataImporter.doImport(exportData, importOptions)
                .then(function (imported) {
                    // one user is a duplicate
                    imported.problems.length.should.eql(2);
                    imported.problems[0].context.should.match(/user4@ghost.org/);
                    imported.problems[1].context.should.match(/user5/);

                    return Promise.all([
                        models.Post.findPage(Object.assign({withRelated: ['authors']}, testUtils.context.internal)),
                        models.User.findPage(testUtils.context.internal)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON());
                    const users = result[1].data.map(model => model.toJSON());

                    // 2 duplicates, 1 owner, 4 imported users
                    users.length.should.eql(exportData.data.users.length - 2 + 1);
                    posts.length.should.eql(3);

                    // has 4 posts_authors relations, but 3 of them are invalid
                    posts[0].slug.should.eql(exportData.data.posts[2].slug);
                    posts[0].authors.length.should.eql(1);
                    posts[0].authors[0].id.should.eql(users[4].id);
                    posts[0].author.should.eql(users[4].id);

                    // no valid authors reference, use owner author_id
                    posts[1].slug.should.eql(exportData.data.posts[1].slug);
                    posts[1].authors.length.should.eql(1);
                    posts[1].author.should.eql(testUtils.DataGenerator.Content.users[0].id);
                    posts[1].authors[0].id.should.eql(testUtils.DataGenerator.Content.users[0].id);

                    posts[2].slug.should.eql(exportData.data.posts[0].slug);
                    posts[2].authors.length.should.eql(3);
                    posts[2].author.should.eql(users[2].id);
                    posts[2].authors.length.should.eql(3);
                    posts[2].authors[0].id.should.eql(users[2].id);
                    posts[2].authors[1].id.should.eql(users[1].id);
                    posts[2].authors[2].id.should.eql(users[3].id);
                });
        });

        it('import 2.0 Koenig post format', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    markups: [],
                    atoms: [],
                    cards: [
                        ['image', {
                            src: 'source',
                            cardWidth: 'wide'
                        }],
                        ['markdown', {
                            cardName: 'markdown',
                            markdown: '# Post Content'
                        }]
                    ],
                    sections: [[10,0],[10,1]]
                })
            });

            delete exportData.data.posts[0].html;

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    markups: [],
                    atoms: [],
                    cards: [
                        ['markdown', {
                            cardName: 'markdown',
                            markdown: '## Post Content'
                        }],
                        ['image', {
                            src: 'source2',
                            cardWidth: 'not-wide'
                        }]
                    ],
                    sections: [[10,0],[10,1]]
                }),
                html: '<div class="kg-post"><h2 id="postcontent">Post Content</h2></div>\n'
            });

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(2);

                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"## Post Content"}],["image",{"src":"source2","cardWidth":"not-wide"}]],"sections":[[10,0],[10,1]]}');
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h2 id="postcontent">Post Content</h2>\n<!--kg-card-end: markdown--><figure class="kg-card kg-image-card kg-width-not-wide"><img src="source2" class="kg-image"></figure>');

                    posts[1].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["image",{"src":"source","cardWidth":"wide"}],["markdown",{"cardName":"markdown","markdown":"# Post Content"}]],"sections":[[10,0],[10,1]]}');
                    posts[1].html.should.eql('<figure class="kg-card kg-image-card kg-width-wide"><img src="source" class="kg-image"></figure><!--kg-card-begin: markdown--><h1 id="postcontent">Post Content</h1>\n<!--kg-card-end: markdown-->');
                });
        });
    });

    describe('Existing database', function () {
        beforeEach(testUtils.teardown);
        beforeEach(testUtils.setup('users:roles', 'posts', 'settings'));

        it('import multiple users, tags, posts', function () {
            const exportData = exportedLatestBody().db[0];

            exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({
                email: 'user1@ghost.org',
                slug: 'user1'
            });
            exportData.data.users[1] = testUtils.DataGenerator.forKnex.createUser({
                email: 'user2@ghost.org',
                slug: 'user2',
                created_by: exportData.data.users[0].id
            });
            exportData.data.users[2] = testUtils.DataGenerator.forKnex.createUser({
                email: 'user3@ghost.org',
                slug: 'user3'
            });
            exportData.data.users[3] = testUtils.DataGenerator.forKnex.createUser({
                email: 'user4@ghost.org',
                slug: 'user4',
                updated_by: exportData.data.users[1].id
            });

            exportData.data.roles = [
                testUtils.DataGenerator.forKnex.createRole({name: 'Administrator'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Editor'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Author'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Owner'}),
                testUtils.DataGenerator.forKnex.createRole({name: 'Contributor'})
            ];

            exportData.data.roles_users = [
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, exportData.data.roles[0].id),
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[2].id, exportData.data.roles[2].id),
                testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[3].id, exportData.data.roles[4].id)
            ];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                title: 'title1',
                author_id: exportData.data.users[0].id,
                created_by: exportData.data.users[0].id,
                updated_by: exportData.data.users[1].id,
                published_by: exportData.data.users[1].id
            });
            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                title: 'title2',
                author_id: exportData.data.users[3].id,
                created_by: exportData.data.users[2].id,
                updated_by: exportData.data.users[0].id,
                published_by: exportData.data.users[1].id
            });
            exportData.data.posts[2] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post3',
                title: 'title3',
                author_id: exportData.data.users[0].id,
                created_by: exportData.data.users[3].id,
                updated_by: exportData.data.users[3].id,
                published_by: exportData.data.users[3].id
            });

            exportData.data.tags[0] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'tag1',
                created_by: exportData.data.users[3].id,
                updated_by: exportData.data.users[0].id
            });
            exportData.data.tags[1] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'tag2',
                created_by: exportData.data.users[1].id,
                updated_by: exportData.data.users[3].id
            });
            exportData.data.tags[2] = testUtils.DataGenerator.forKnex.createTag({
                slug: 'tag3',
                created_by: exportData.data.users[2].id,
                updated_by: exportData.data.users[2].id
            });

            const clonedImportOptions = _.cloneDeep(importOptions);

            const postOptions = Object.assign({withRelated: ['tags']}, testUtils.context.internal);
            const tagOptions = Object.assign({order: 'slug ASC'}, testUtils.context.internal);
            const userOptions = Object.assign({withRelated: ['roles']}, testUtils.context.internal);

            return dataImporter.doImport(exportData, clonedImportOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(postOptions),
                        models.Tag.findPage(tagOptions),
                        models.User.findPage(userOptions)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(postOptions));
                    const tags = result[1].data.map(model => model.toJSON(tagOptions));
                    const users = result[2].data.map(model => model.toJSON(userOptions));

                    posts.length.should.equal(exportData.data.posts.length + testUtils.DataGenerator.Content.posts.length, 'Wrong number of posts');
                    tags.length.should.equal(exportData.data.tags.length + testUtils.DataGenerator.Content.tags.length, 'Wrong number of tags');
                    // the test env only inserts the user defined in the `forKnex` array
                    users.length.should.equal(exportData.data.users.length + testUtils.DataGenerator.forKnex.users.length, 'Wrong number of users');
                });
        });
    });
});

describe('1.0', function () {
    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('roles', 'owner', 'settings'));

    it('ensure amp field get\'s respected', function () {
        const exportData = exportedPreviousBody().db[0];

        exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
            slug: 'post1',
            amp: 2
        });

        exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
            slug: 'post2',
            amp: null
        });

        return dataImporter.doImport(exportData, importOptions)
            .then(function () {
                return Promise.all([
                    models.Post.findPage(testUtils.context.internal)
                ]);
            }).then(function (result) {
                const posts = result[0].data.map(model => model.toJSON());

                posts.length.should.eql(2);
                posts[0].comment_id.should.eql(exportData.data.posts[1].id);
                posts[1].comment_id.should.eql('2');
            });
    });

    describe('migrate mobiledoc/html', function () {
        it('invalid mobiledoc structure', function () {
            const exportData = exportedPreviousBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: 'test',
                mobiledoc: '{}'
            });

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2'
            });

            exportData.data.posts[1].mobiledoc = '{';
            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function (result) {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(2);
                    should(posts[0].html).eql(null);
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');

                    should(posts[1].html).eql(null);
                    posts[1].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');
                });
        });

        it('mobiledoc is null, html field is set', function () {
            const exportData = exportedPreviousBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: '<div><h1>This is my post content.</h1></div>'
            });

            exportData.data.posts[0].mobiledoc = null;

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    should(posts[0].html).eql(null);
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');
                });
        });

        it('mobiledoc and html is null', function () {
            const exportData = exportedPreviousBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1'
            });

            exportData.data.posts[0].mobiledoc = null;
            exportData.data.posts[0].html = null;

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    should(posts[0].html).eql(null);
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');
                });
        });

        it('mobiledoc is set and html is null', function () {
            const exportData = exportedPreviousBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1'
            });

            exportData.data.posts[0].html = null;

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h2 id="markdown">markdown</h2>\n<!--kg-card-end: markdown-->');
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"## markdown"}]],"sections":[[10,0]]}');
                });
        });

        it('post has "kg-card-markdown" class', function () {
            const exportData = exportedPreviousBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: '<div class="kg-card-markdown"><h1>This is my post content.</h1></div>',
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('# This is my post content')
            });

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h1 id="thisismypostcontent">This is my post content</h1>\n<!--kg-card-end: markdown-->');
                    posts[0].mobiledoc.should.eql(exportData.data.posts[0].mobiledoc);
                });
        });

        it('import old Koenig Beta post format', function () {
            const exportData = exportedPreviousBody().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    markups: [],
                    atoms: [],
                    cards: [
                        ['image', {
                            imageStyle: 'wide',
                            src: 'source'
                        }],
                        ['markdown', {
                            cardName: 'markdown',
                            markdown: '# Post Content'
                        }]
                    ],
                    sections: [[10,0],[10,1]]
                })
            });

            delete exportData.data.posts[0].html;

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    markups: [],
                    atoms: [],
                    cards: [
                        ['markdown', {
                            cardName: 'markdown',
                            markdown: '## Post Content'
                        }],
                        ['image', {
                            imageStyle: 'not-wide',
                            src: 'source2'
                        }]
                    ],
                    sections: [[10,0],[10,1]]
                }),
                html: '<div class="kg-post"><h2 id="postcontent">Post Content</h2></div>\n'
            });

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(2);

                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"## Post Content"}],["image",{"src":"source2","cardWidth":"not-wide"}]],"sections":[[10,0],[10,1]]}');
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h2 id="postcontent">Post Content</h2>\n<!--kg-card-end: markdown--><figure class="kg-card kg-image-card kg-width-not-wide"><img src="source2" class="kg-image"></figure>');

                    posts[1].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["image",{"src":"source","cardWidth":"wide"}],["markdown",{"cardName":"markdown","markdown":"# Post Content"}]],"sections":[[10,0],[10,1]]}');
                    posts[1].html.should.eql('<figure class="kg-card kg-image-card kg-width-wide"><img src="source" class="kg-image"></figure><!--kg-card-begin: markdown--><h1 id="postcontent">Post Content</h1>\n<!--kg-card-end: markdown-->');
                });
        });
    });
});

describe('LTS', function () {
    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('roles', 'owner', 'settings'));

    it('disallows importing LTS imports', function () {
        const exportData = exportedLegacyBody().db[0];

        return dataImporter.doImport(exportData, importOptions)
            .then(function () {
                '0'.should.eql(1, 'LTS import should fail');
            })
            .catch(function (err) {
                err.message.should.eql('Detected unsupported file structure.');
            });
    });
});
