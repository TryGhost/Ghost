var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    moment = require('moment'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    sequence = require('../../../server/lib/promise/sequence'),
    settingsCache = require('../../../server/services/settings/cache'),
    ghostBookshelf = require('../../../server/models/base'),
    PostModel = require('../../../server/models/post').Post,
    TagModel = require('../../../server/models/tag').Tag,
    common = require('../../../server/lib/common'),
    configUtils = require('../../utils/configUtils'),
    DataGenerator = testUtils.DataGenerator,
    context = testUtils.context.owner,
    sandbox = sinon.sandbox.create(),
    markdownToMobiledoc = testUtils.DataGenerator.markdownToMobiledoc;

/**
 * IMPORTANT:
 * - do not spy the events unit, because when we only spy, all listeners get the event
 * - this can cause unexpected behaviour as the listeners execute code
 * - using rewire is not possible, because each model self registers it's model registry in bookshelf
 * - rewire would add 1 registry, a file who requires the models, tries to register the model another time
 */
describe('Post Model', function () {
    var eventsTriggered = {};

    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    afterEach(function () {
        sandbox.restore();
    });

    should.exist(TagModel);
    should.exist(PostModel);

    describe('Single author posts', function () {
        afterEach(function () {
            configUtils.restore();
        });

        beforeEach(testUtils.setup('owner', 'posts', 'apps'));

        function checkFirstPostData(firstPost, options) {
            options = options || {};

            should.not.exist(firstPost.author_id);
            firstPost.author.should.be.an.Object();
            firstPost.url.should.equal('/html-ipsum/');
            firstPost.fields.should.be.an.Array();
            firstPost.tags.should.be.an.Array();
            firstPost.author.name.should.equal(DataGenerator.Content.users[0].name);
            firstPost.fields[0].key.should.equal(DataGenerator.Content.app_fields[0].key);
            firstPost.created_at.should.be.an.instanceof(Date);
            firstPost.created_by.should.be.an.Object();
            firstPost.updated_by.should.be.an.Object();
            firstPost.published_by.should.be.an.Object();
            firstPost.created_by.name.should.equal(DataGenerator.Content.users[0].name);
            firstPost.updated_by.name.should.equal(DataGenerator.Content.users[0].name);
            firstPost.published_by.name.should.equal(DataGenerator.Content.users[0].name);
            firstPost.tags[0].name.should.equal(DataGenerator.Content.tags[0].name);
            firstPost.custom_excerpt.should.equal(DataGenerator.Content.posts[0].custom_excerpt);

            if (options.formats) {
                if (options.formats.indexOf('mobiledoc') !== -1) {
                    firstPost.mobiledoc.should.match(/HTML Ipsum Presents/);
                }

                if (options.formats.indexOf('html') !== -1) {
                    firstPost.html.should.match(/HTML Ipsum Presents/);
                }

                if (options.formats.indexOf('plaintext') !== -1) {
                    /**
                     * NOTE: this is null, not undefined, so it was returned
                     * The plaintext value is generated.
                     */
                    should.equal(firstPost.plaintext, null);
                }
            } else {
                firstPost.html.should.match(/HTML Ipsum Presents/);
                should.equal(firstPost.plaintext, undefined);
                should.equal(firstPost.mobiledoc, undefined);
                should.equal(firstPost.amp, undefined);
            }
        }

        describe('findAll', function () {
            beforeEach(function () {
                sandbox.stub(settingsCache, 'get').callsFake(function (key) {
                    return {
                        permalinks: '/:slug/'
                    }[key];
                });
            });

            it('can findAll', function (done) {
                PostModel.findAll().then(function (results) {
                    should.exist(results);
                    results.length.should.be.above(1);
                    done();
                }).catch(done);
            });

            it('can findAll, returning all related data', function (done) {
                PostModel.findAll({include: ['author', 'fields', 'tags', 'created_by', 'updated_by', 'published_by']})
                    .then(function (results) {
                        should.exist(results);
                        results.length.should.be.above(0);

                        var posts = results.models.map(function (model) {
                            return model.toJSON();
                        }), firstPost = _.find(posts, {title: testUtils.DataGenerator.Content.posts[0].title});

                        checkFirstPostData(firstPost);

                        done();
                    }).catch(done);
            });

            it('can findAll, use formats option', function (done) {
                var options = {
                    formats: ['mobiledoc', 'plaintext'],
                    include: ['author', 'fields', 'tags', 'created_by', 'updated_by', 'published_by']
                };

                PostModel.findAll(options)
                    .then(function (results) {
                        should.exist(results);
                        results.length.should.be.above(0);

                        var posts = results.models.map(function (model) {
                            return model.toJSON(options);
                        }), firstPost = _.find(posts, {title: testUtils.DataGenerator.Content.posts[0].title});

                        checkFirstPostData(firstPost, options);

                        done();
                    }).catch(done);
            });
        });

        describe('findPage', function () {
            beforeEach(function () {
                sandbox.stub(settingsCache, 'get').callsFake(function (key) {
                    return {
                        permalinks: '/:slug/'
                    }[key];
                });
            });

            it('can findPage (default)', function (done) {
                PostModel.findPage().then(function (results) {
                    should.exist(results);

                    results.meta.pagination.page.should.equal(1);
                    results.meta.pagination.limit.should.equal(15);
                    results.meta.pagination.pages.should.equal(1);
                    results.posts.length.should.equal(4);

                    done();
                }).catch(done);
            });

            it('can findPage, returning all related data', function (done) {
                PostModel.findPage({include: ['author', 'fields', 'tags', 'created_by', 'updated_by', 'published_by']})
                    .then(function (results) {
                        should.exist(results);

                        results.meta.pagination.page.should.equal(1);
                        results.meta.pagination.limit.should.equal(15);
                        results.meta.pagination.pages.should.equal(1);
                        results.posts.length.should.equal(4);

                        var firstPost = _.find(results.posts, {title: testUtils.DataGenerator.Content.posts[0].title});
                        checkFirstPostData(firstPost);

                        done();
                    }).catch(done);
            });

            it('returns computed fields when columns are asked for explicitly', function (done) {
                PostModel.findPage({columns: ['id', 'slug', 'url', 'mobiledoc']}).then(function (results) {
                    should.exist(results);

                    var post = _.find(results.posts, {slug: testUtils.DataGenerator.Content.posts[0].slug});
                    post.url.should.equal('/html-ipsum/');

                    // If a computed property is inadvertently passed into a "fetch" operation,
                    // there's a bug in bookshelf where the model will come back with it as
                    // a column enclosed in quotes.
                    should.not.exist(post['"url"']);

                    done();
                }).catch(done);
            });

            it('ignores columns that do not exist', function (done) {
                PostModel.findPage({columns: ['id', 'slug', 'doesnotexist']}).then(function (results) {
                    should.exist(results);

                    var post = _.find(results.posts, {slug: testUtils.DataGenerator.Content.posts[0].slug});
                    post.id.should.equal(testUtils.DataGenerator.Content.posts[0].id);
                    post.slug.should.equal('html-ipsum');
                    should.not.exist(post.doesnotexist);

                    done();
                }).catch(done);
            });

            it('can findPage, with various options', function (done) {
                testUtils.fixtures.insertMorePosts().then(function () {
                    return testUtils.fixtures.insertMorePostsTags();
                }).then(function () {
                    return PostModel.findPage({page: 2});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(2);
                    paginationResult.meta.pagination.limit.should.equal(15);
                    paginationResult.meta.pagination.pages.should.equal(4);
                    paginationResult.posts.length.should.equal(15);

                    return PostModel.findPage({page: 5});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(5);
                    paginationResult.meta.pagination.limit.should.equal(15);
                    paginationResult.meta.pagination.pages.should.equal(4);
                    paginationResult.posts.length.should.equal(0);

                    return PostModel.findPage({limit: 30});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(30);
                    paginationResult.meta.pagination.pages.should.equal(2);
                    paginationResult.posts.length.should.equal(30);

                    // Test both boolean formats
                    return PostModel.findPage({limit: 10, staticPages: true});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(10);
                    paginationResult.meta.pagination.pages.should.equal(1);
                    paginationResult.posts.length.should.equal(1);

                    // Test both boolean formats
                    return PostModel.findPage({limit: 10, staticPages: '1'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(10);
                    paginationResult.meta.pagination.pages.should.equal(1);
                    paginationResult.posts.length.should.equal(1);

                    // Test featured pages
                    return PostModel.findPage({limit: 10, filter: 'featured:true'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(10);
                    paginationResult.meta.pagination.pages.should.equal(6);
                    paginationResult.posts.length.should.equal(10);

                    // Test both boolean formats for featured pages
                    return PostModel.findPage({limit: 10, filter: 'featured:1'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(10);
                    paginationResult.meta.pagination.pages.should.equal(6);
                    paginationResult.posts.length.should.equal(10);

                    return PostModel.findPage({limit: 10, page: 2, status: 'all'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.pages.should.equal(11);

                    return PostModel.findPage({limit: 'all', status: 'all'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal('all');
                    paginationResult.meta.pagination.pages.should.equal(1);
                    paginationResult.posts.length.should.equal(108);

                    done();
                }).catch(done);
            });

            it('can findPage for tag, with various options', function (done) {
                testUtils.fixtures.insertMorePosts().then(function () {
                    return testUtils.fixtures.insertMorePostsTags();
                }).then(function () {
                    // Test tag filter
                    return PostModel.findPage({page: 1, filter: 'tags:bacon'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(15);
                    paginationResult.meta.pagination.pages.should.equal(1);
                    paginationResult.posts.length.should.equal(2);

                    return PostModel.findPage({page: 1, filter: 'tags:kitchen-sink'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(15);
                    paginationResult.meta.pagination.pages.should.equal(1);
                    paginationResult.posts.length.should.equal(2);

                    return PostModel.findPage({page: 1, filter: 'tags:injection'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(1);
                    paginationResult.meta.pagination.limit.should.equal(15);
                    paginationResult.meta.pagination.pages.should.equal(2);
                    paginationResult.posts.length.should.equal(15);

                    return PostModel.findPage({page: 2, filter: 'tags:injection'});
                }).then(function (paginationResult) {
                    paginationResult.meta.pagination.page.should.equal(2);
                    paginationResult.meta.pagination.limit.should.equal(15);
                    paginationResult.meta.pagination.pages.should.equal(2);
                    paginationResult.posts.length.should.equal(10);

                    done();
                }).catch(done);
            });

            it('can NOT findPage for a page that overflows the datatype', function (done) {
                PostModel.findPage({page: 5700000000055345439587894375457849375284932759842375894372589243758947325894375894275894275894725897432859724309})
                    .then(function (paginationResult) {
                        should.exist(paginationResult.meta);

                        paginationResult.meta.pagination.page.should.be.a.Number();

                        done();
                    }).catch(done);
            });
        });

        describe('findOne', function () {
            beforeEach(function () {
                sandbox.stub(settingsCache, 'get').callsFake(function (key) {
                    return {
                        permalinks: '/:slug/'
                    }[key];
                });
            });

            it('can findOne', function (done) {
                var firstPost;

                PostModel.findPage().then(function (results) {
                    should.exist(results);
                    should.exist(results.posts);
                    results.posts.length.should.be.above(0);
                    firstPost = results.posts[0];

                    return PostModel.findOne({slug: firstPost.slug});
                }).then(function (found) {
                    should.exist(found);
                    found.attributes.title.should.equal(firstPost.title);

                    done();
                }).catch(done);
            });

            it('can findOne, returning all related data', function (done) {
                var firstPost;

                PostModel.findOne({}, {include: ['author', 'fields', 'tags', 'created_by', 'updated_by', 'published_by']})
                    .then(function (result) {
                        should.exist(result);
                        firstPost = result.toJSON();

                        checkFirstPostData(firstPost);

                        done();
                    }).catch(done);
            });

            it('can findOne, returning a slug only permalink', function (done) {
                PostModel.findOne({id: testUtils.DataGenerator.Content.posts[0].id})
                    .then(function (result) {
                        should.exist(result);
                        var firstPost = result.toJSON();
                        firstPost.url.should.equal('/html-ipsum/');

                        done();
                    }).catch(done);
            });

            it('can findOne, returning a dated permalink', function (done) {
                settingsCache.get.restore();

                sandbox.stub(settingsCache, 'get').callsFake(function (key) {
                    return {
                        permalinks: '/:year/:month/:day/:slug/'
                    }[key];
                });

                PostModel.findOne({id: testUtils.DataGenerator.Content.posts[0].id})
                    .then(function (result) {
                        should.exist(result);
                        var firstPost = result.toJSON();

                        // published_at of post 1 is 2015-01-01 00:00:00
                        // default blog TZ is UTC
                        firstPost.url.should.equal('/2015/01/01/html-ipsum/');

                        done();
                    }).catch(done);
            });
        });

        describe('edit', function () {
            beforeEach(function () {
                eventsTriggered = {};

                sandbox.stub(common.events, 'emit').callsFake(function (eventName, eventObj) {
                    if (!eventsTriggered[eventName]) {
                        eventsTriggered[eventName] = [];
                    }

                    eventsTriggered[eventName].push(eventObj);
                });
            });

            it('can change title', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.title.should.not.equal('new title');

                    return PostModel.edit({title: 'new title'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.title.should.equal('new title');

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.published.edited']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('[failure] custom excerpt soft limit reached', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);

                    return PostModel.edit({
                        custom_excerpt: new Array(302).join('a')
                    }, _.extend({}, context, {id: postId}));
                }).then(function () {
                    done(new Error('expected validation error'));
                }).catch(function (err) {
                    (err[0] instanceof common.errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('[success] custom excerpt soft limit respected', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);

                    return PostModel.edit({
                        custom_excerpt: new Array(300).join('a')
                    }, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    edited.get('custom_excerpt').length.should.eql(299);
                    done();
                }).catch(done);
            });

            it('can change title to number', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    should.exist(results);
                    var post = results.toJSON();
                    post.title.should.not.equal('123');
                    return PostModel.edit({title: 123}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.title.should.equal('123');
                    done();
                }).catch(done);
            });

            it('converts html to plaintext', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    should.exist(results);
                    results.attributes.html.should.match(/HTML Ipsum Presents/);
                    should.not.exist(results.attributes.plaintext);
                    return PostModel.edit({updated_at: results.attributes.updated_at}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);

                    edited.attributes.html.should.match(/HTML Ipsum Presents/);
                    edited.attributes.plaintext.should.match(/HTML Ipsum Presents/);
                    done();
                }).catch(done);
            });

            it('can publish draft post', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[3].id;

                PostModel.findOne({id: postId, status: 'draft'}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('draft');

                    return PostModel.edit({status: 'published'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.published']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('can unpublish published post', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('published');

                    return PostModel.edit({status: 'draft'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.unpublished']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('draft -> scheduled without published_at update', function (done) {
                var post;

                PostModel.findOne({status: 'draft'}).then(function (results) {
                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('draft');

                    results.set('published_at', null);
                    return results.save();
                }).then(function () {
                    return PostModel.edit({
                        status: 'scheduled'
                    }, _.extend({}, context, {id: post.id}));
                }).then(function () {
                    done(new Error('expected error'));
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('draft -> scheduled: invalid published_at update', function (done) {
                PostModel.findOne({status: 'draft'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('draft');

                    // @TODO: add unit test for valid and invalid formats
                    return PostModel.edit({
                        status: 'scheduled',
                        published_at: '0000-00-00 00:00:00'
                    }, _.extend({}, context, {id: post.id}));
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    err.code.should.eql('DATE_INVALID');
                    done();
                });
            });

            it('draft -> scheduled: expect update of published_at', function (done) {
                var newPublishedAt = moment().add(1, 'day').toDate();

                PostModel.findOne({status: 'draft'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('draft');

                    return PostModel.edit({
                        status: 'scheduled',
                        published_at: newPublishedAt
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');

                    // mysql does not store ms
                    moment(edited.attributes.published_at).startOf('seconds').diff(moment(newPublishedAt).startOf('seconds')).should.eql(0);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.scheduled']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('scheduled -> draft: expect unschedule', function (done) {
                PostModel.findOne({status: 'scheduled'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('scheduled');

                    return PostModel.edit({
                        status: 'draft'
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.unscheduled']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('scheduled -> scheduled with updated published_at', function (done) {
                PostModel.findOne({status: 'scheduled'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('scheduled');

                    return PostModel.edit({
                        status: 'scheduled',
                        published_at: moment().add(20, 'days').toDate()
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.rescheduled']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('scheduled -> scheduled with unchanged published_at', function (done) {
                PostModel.findOne({status: 'scheduled'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('scheduled');

                    return PostModel.edit({
                        status: 'scheduled'
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('scheduled -> scheduled with unchanged published_at (within the 2 minutes window)', function (done) {
                var post;

                PostModel.findOne({status: 'scheduled'}).then(function (results) {
                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('scheduled');

                    results.set('published_at', moment().add(2, 'minutes').add(2, 'seconds').toDate());
                    return results.save();
                }).then(function () {
                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.edited']);
                    should.exist(eventsTriggered['post.rescheduled']);
                    eventsTriggered = {};

                    return Promise.delay(1000 * 3);
                }).then(function () {
                    return PostModel.edit({
                        status: 'scheduled'
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('published -> scheduled and expect update of published_at', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('published');

                    return PostModel.edit({
                        status: 'scheduled',
                        published_at: moment().add(1, 'day').toDate()
                    }, _.extend({}, context, {id: postId}));
                }).then(function () {
                    done(new Error('change status from published to scheduled is not allowed right now!'));
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('can convert draft post to page and back', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[3].id;

                PostModel.findOne({id: postId, status: 'draft'}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('draft');

                    return PostModel.edit({page: 1}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    edited.attributes.page.should.equal(true);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.deleted']);
                    should.exist(eventsTriggered['page.added']);

                    return PostModel.edit({page: 0}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    edited.attributes.page.should.equal(false);

                    Object.keys(eventsTriggered).length.should.eql(4);
                    should.exist(eventsTriggered['post.deleted']);
                    should.exist(eventsTriggered['page.added']);
                    should.exist(eventsTriggered['post.deleted']);
                    should.exist(eventsTriggered['post.added']);

                    done();
                }).catch(done);
            });

            it('can convert draft to schedule AND post to page and back', function (done) {
                PostModel.findOne({status: 'draft'}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('draft');

                    return PostModel.edit({
                        page: 1,
                        status: 'scheduled',
                        published_at: moment().add(10, 'days')
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');
                    edited.attributes.page.should.equal(true);

                    Object.keys(eventsTriggered).length.should.eql(3);
                    should.exist(eventsTriggered['post.deleted']);
                    should.exist(eventsTriggered['page.added']);
                    should.exist(eventsTriggered['page.scheduled']);

                    return PostModel.edit({page: 0}, _.extend({}, context, {id: edited.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');
                    edited.attributes.page.should.equal(false);

                    Object.keys(eventsTriggered).length.should.eql(7);
                    should.exist(eventsTriggered['page.unscheduled']);
                    should.exist(eventsTriggered['page.deleted']);
                    should.exist(eventsTriggered['post.added']);
                    should.exist(eventsTriggered['post.scheduled']);

                    done();
                }).catch(done);
            });

            it('can convert published post to page and back', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel.findOne({id: postId}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('published');

                    return PostModel.edit({page: 1}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');
                    edited.attributes.page.should.equal(true);

                    Object.keys(eventsTriggered).length.should.eql(4);
                    should.exist(eventsTriggered['post.unpublished']);
                    should.exist(eventsTriggered['post.deleted']);
                    should.exist(eventsTriggered['page.added']);
                    should.exist(eventsTriggered['page.published']);

                    return PostModel.edit({page: 0}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');
                    edited.attributes.page.should.equal(false);

                    Object.keys(eventsTriggered).length.should.eql(8);
                    should.exist(eventsTriggered['page.unpublished']);
                    should.exist(eventsTriggered['page.deleted']);
                    should.exist(eventsTriggered['post.added']);
                    should.exist(eventsTriggered['post.published']);

                    done();
                }).catch(done);
            });

            it('can change type and status at the same time', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[3].id;

                PostModel.findOne({id: postId, status: 'draft'}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('draft');

                    return PostModel.edit({page: 1, status: 'published'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');
                    edited.attributes.page.should.equal(true);

                    Object.keys(eventsTriggered).length.should.eql(3);
                    should.exist(eventsTriggered['post.deleted']);
                    should.exist(eventsTriggered['page.added']);
                    should.exist(eventsTriggered['page.published']);

                    return PostModel.edit({page: 0, status: 'draft'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    edited.attributes.page.should.equal(false);

                    Object.keys(eventsTriggered).length.should.eql(6);
                    should.exist(eventsTriggered['page.unpublished']);
                    should.exist(eventsTriggered['page.deleted']);
                    should.exist(eventsTriggered['post.added']);

                    done();
                }).catch(done);
            });

            it('can save a draft without setting published_by or published_at', function (done) {
                var newPost = testUtils.DataGenerator.forModel.posts[2],
                    postId;

                PostModel.add(newPost, context).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    postId = post.id;

                    post.status.should.equal('draft');
                    should.not.exist(post.published_by);
                    should.not.exist(post.published_at);

                    // Test changing an unrelated property
                    return PostModel.edit({title: 'Hello World'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    should.not.exist(edited.attributes.published_by);
                    should.not.exist(edited.attributes.published_at);

                    // Test changing status and published_by on its own
                    return PostModel.edit({published_by: 4}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    should.not.exist(edited.attributes.published_by);
                    should.not.exist(edited.attributes.published_at);

                    done();
                }).catch(done);
            });

            it('cannot override the published_by setting', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[3].id;

                PostModel.findOne({id: postId, status: 'draft'}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(postId);
                    post.status.should.equal('draft');

                    // Test changing status and published_by at the same time
                    return PostModel.edit({status: 'published', published_by: 4}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');
                    edited.attributes.published_by.should.equal(context.context.user);

                    // Test changing status and published_by on its own
                    return PostModel.edit({published_by: 4}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');
                    edited.attributes.published_by.should.equal(context.context.user);

                    done();
                }).catch(done);
            });

            it('send invalid published_at date', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel
                    .findOne({
                        id: postId
                    })
                    .then(function (results) {
                        var post;
                        should.exist(results);
                        post = results.toJSON();
                        post.id.should.equal(postId);

                        return PostModel.edit({published_at: '0000-00-00 00:00:00'}, _.extend({}, context, {id: postId}));
                    })
                    .then(function () {
                        done(new Error('This test should fail.'));
                    })
                    .catch(function (err) {
                        err.statusCode.should.eql(422);
                        done();
                    });
            });

            it('send empty date', function (done) {
                var postId = testUtils.DataGenerator.Content.posts[0].id;

                PostModel
                    .findOne({
                        id: postId
                    })
                    .then(function (results) {
                        var post;
                        should.exist(results);
                        post = results.toJSON();
                        post.id.should.equal(postId);

                        return PostModel.edit({created_at: ''}, _.extend({}, context, {id: postId}));
                    })
                    .then(function () {
                        done(new Error('This test should fail.'));
                    })
                    .catch(function (err) {
                        err.statusCode.should.eql(422);
                        done();
                    });
            });
        });

        describe('add', function () {
            beforeEach(function () {
                eventsTriggered = {};

                sandbox.stub(common.events, 'emit').callsFake(function (eventName, eventObj) {
                    if (!eventsTriggered[eventName]) {
                        eventsTriggered[eventName] = [];
                    }

                    eventsTriggered[eventName].push(eventObj);
                });
            });

            it('can add, defaults are all correct', function (done) {
                var createdPostUpdatedDate,
                    newPost = testUtils.DataGenerator.forModel.posts[2],
                    newPostDB = testUtils.DataGenerator.Content.posts[2];

                PostModel.add(newPost, context).then(function (createdPost) {
                    return new PostModel({id: createdPost.id}).fetch();
                }).then(function (createdPost) {
                    should.exist(createdPost);
                    createdPost.has('uuid').should.equal(true);
                    createdPost.get('status').should.equal('draft');
                    createdPost.get('title').should.equal(newPost.title, 'title is correct');
                    createdPost.get('mobiledoc').should.equal(newPost.mobiledoc, 'mobiledoc is correct');
                    createdPost.has('html').should.equal(true);
                    createdPost.get('html').should.equal(newPostDB.html);
                    createdPost.has('plaintext').should.equal(true);
                    createdPost.get('plaintext').should.match(/^testing/);
                    createdPost.get('slug').should.equal(newPostDB.slug + '-2');
                    (!!createdPost.get('featured')).should.equal(false);
                    (!!createdPost.get('page')).should.equal(false);

                    should.equal(createdPost.get('locale'), null);

                    // testing for nulls
                    (createdPost.get('feature_image') === null).should.equal(true);
                    (createdPost.get('meta_title') === null).should.equal(true);
                    (createdPost.get('meta_description') === null).should.equal(true);

                    createdPost.get('created_at').should.be.above(new Date(0).getTime());
                    createdPost.get('created_by').should.equal(testUtils.DataGenerator.Content.users[0].id);
                    createdPost.get('author_id').should.equal(testUtils.DataGenerator.Content.users[0].id);
                    createdPost.has('author').should.equal(false);
                    createdPost.get('created_by').should.equal(createdPost.get('author_id'));
                    createdPost.get('updated_at').should.be.above(new Date(0).getTime());
                    createdPost.get('updated_by').should.equal(testUtils.DataGenerator.Content.users[0].id);
                    should.equal(createdPost.get('published_at'), null);
                    should.equal(createdPost.get('published_by'), null);

                    createdPostUpdatedDate = createdPost.get('updated_at');

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    // Set the status to published to check that `published_at` is set.
                    return createdPost.save({status: 'published'}, context);
                }).then(function (publishedPost) {
                    publishedPost.get('published_at').should.be.instanceOf(Date);
                    publishedPost.get('published_by').should.equal(testUtils.DataGenerator.Content.users[0].id);
                    publishedPost.get('updated_at').should.be.instanceOf(Date);
                    publishedPost.get('updated_by').should.equal(testUtils.DataGenerator.Content.users[0].id);
                    publishedPost.get('updated_at').should.not.equal(createdPostUpdatedDate);

                    Object.keys(eventsTriggered).length.should.eql(3);
                    should.exist(eventsTriggered['post.published']);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('can add, with title being a number', function (done) {
                var newPost = testUtils.DataGenerator.forModel.posts[2];

                newPost.title = 123;

                PostModel.add(newPost, context).then(function (createdPost) {
                    should.exist(createdPost);
                    done();
                }).catch(done);
            });

            it('can add, with previous published_at date', function (done) {
                var previousPublishedAtDate = new Date(2013, 8, 21, 12);

                PostModel.add({
                    status: 'published',
                    published_at: previousPublishedAtDate,
                    title: 'published_at test',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    new Date(newPost.get('published_at')).getTime().should.equal(previousPublishedAtDate.getTime());

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.added']);
                    should.exist(eventsTriggered['post.published']);

                    done();
                }).catch(done);
            });

            it('add draft post without published_at -> we expect no auto insert of published_at', function (done) {
                PostModel.add({
                    status: 'draft',
                    title: 'draft 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    should.not.exist(newPost.get('published_at'));

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    done();
                }).catch(done);
            });

            it('add draft post with published_at -> we expect published_at to exist', function (done) {
                PostModel.add({
                    status: 'draft',
                    published_at: moment().toDate(),
                    title: 'draft 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    should.exist(newPost.get('published_at'));

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    done();
                }).catch(done);
            });

            it('add scheduled post without published_at -> we expect an error', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    title: 'scheduled 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).catch(function (err) {
                    should.exist(err);
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    Object.keys(eventsTriggered).length.should.eql(0);
                    done();
                });
            });

            it('add scheduled post with published_at not in future-> we expect an error', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    published_at: moment().subtract(1, 'minute'),
                    title: 'scheduled 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).catch(function (err) {
                    should.exist(err);
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    Object.keys(eventsTriggered).length.should.eql(0);
                    done();
                });
            });

            it('add scheduled post with published_at 1 minutes in future -> we expect an error', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    published_at: moment().add(1, 'minute'),
                    title: 'scheduled 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).catch(function (err) {
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    Object.keys(eventsTriggered).length.should.eql(0);
                    done();
                });
            });

            it('add scheduled post with published_at 10 minutes in future -> we expect success', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    published_at: moment().add(10, 'minute'),
                    title: 'scheduled 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).then(function (post) {
                    should.exist(post);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.added']);
                    should.exist(eventsTriggered['post.scheduled']);

                    done();
                }).catch(done);
            });

            it('add scheduled page with published_at 10 minutes in future -> we expect success', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    page: 1,
                    published_at: moment().add(10, 'minute'),
                    title: 'scheduled 1',
                    mobiledoc: markdownToMobiledoc('This is some content')
                }, context).then(function (post) {
                    should.exist(post);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['page.added']);
                    should.exist(eventsTriggered['page.scheduled']);

                    done();
                }).catch(done);
            });

            it('can add default title, if it\'s missing', function (done) {
                PostModel.add({
                    mobiledoc: markdownToMobiledoc('Content')
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    newPost.get('title').should.equal('(Untitled)');

                    done();
                }).catch(done);
            });

            it('can trim title', function (done) {
                var untrimmedCreateTitle = '  test trimmed create title  ',
                    untrimmedUpdateTitle = '  test trimmed update title  ',
                    newPost = {
                        title: untrimmedCreateTitle,
                        mobiledoc: markdownToMobiledoc('Test content')
                    };

                PostModel.add(newPost, context).then(function (createdPost) {
                    return new PostModel({id: createdPost.id}).fetch();
                }).then(function (createdPost) {
                    should.exist(createdPost);
                    createdPost.get('title').should.equal(untrimmedCreateTitle.trim());

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    return createdPost.save({title: untrimmedUpdateTitle}, context);
                }).then(function (updatedPost) {
                    updatedPost.get('title').should.equal(untrimmedUpdateTitle.trim());

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.edited']);

                    done();
                }).catch(done);
            });

            it('can generate a non conflicting slug', function (done) {
                // Create 12 posts with the same title
                sequence(_.times(12, function (i) {
                    return function () {
                        return PostModel.add({
                            title: 'Test Title',
                            mobiledoc: markdownToMobiledoc('Test Content ' + (i + 1))
                        }, context);
                    };
                })).then(function (createdPosts) {
                    // Should have created 12 posts
                    createdPosts.length.should.equal(12);

                    // Should have unique slugs and contents
                    _(createdPosts).each(function (post, i) {
                        var num = i + 1;

                        // First one has normal title
                        if (num === 1) {
                            post.get('slug').should.equal('test-title');
                            return;
                        }

                        post.get('slug').should.equal('test-title-' + num);
                        JSON.parse(post.get('mobiledoc')).cards[0][1].markdown.should.equal('Test Content ' + num);

                        Object.keys(eventsTriggered).length.should.eql(1);
                        should.exist(eventsTriggered['post.added']);
                        eventsTriggered['post.added'].length.should.eql(12);
                    });

                    done();
                }).catch(done);
            });

            it('can generate slugs without duplicate hyphens', function (done) {
                var newPost = {
                    title: 'apprehensive  titles  have  too  many  spaces—and m-dashes  —  –  and also n-dashes  ',
                    mobiledoc: markdownToMobiledoc('Test Content 1')
                };

                PostModel.add(newPost, context).then(function (createdPost) {
                    createdPost.get('slug').should.equal('apprehensive-titles-have-too-many-spaces-and-m-dashes-and-also-n-dashes');

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    done();
                }).catch(done);
            });

            it('can generate a safe slug when a reserved keyword is used', function (done) {
                var newPost = {
                    title: 'rss',
                    mobiledoc: markdownToMobiledoc('Test Content 1')
                };

                PostModel.add(newPost, context).then(function (createdPost) {
                    createdPost.get('slug').should.not.equal('rss');

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    done();
                });
            });

            it('can generate slugs without non-ascii characters', function (done) {
                var newPost = {
                    title: 'भुते धडकी भरवणारा आहेत',
                    mobiledoc: markdownToMobiledoc('Test Content 1')
                };

                PostModel.add(newPost, context).then(function (createdPost) {
                    createdPost.get('slug').should.equal('bhute-dhddkii-bhrvnnaaraa-aahet');
                    done();
                }).catch(done);
            });

            it('detects duplicate slugs before saving', function (done) {
                var firstPost = {
                        title: 'First post',
                        mobiledoc: markdownToMobiledoc('First content 1')
                    },
                    secondPost = {
                        title: 'Second post',
                        mobiledoc: markdownToMobiledoc('Second content 1')
                    };

                // Create the first post
                PostModel.add(firstPost, context)
                    .then(function (createdFirstPost) {
                        // Store the slug for later
                        firstPost.slug = createdFirstPost.get('slug');

                        Object.keys(eventsTriggered).length.should.eql(1);
                        should.exist(eventsTriggered['post.added']);

                        // Create the second post
                        return PostModel.add(secondPost, context);
                    }).then(function (createdSecondPost) {
                    // Store the slug for comparison later
                    secondPost.slug = createdSecondPost.get('slug');

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.added']);

                    // Update with a conflicting slug from the first post
                    return createdSecondPost.save({
                        slug: firstPost.slug
                    }, context);
                }).then(function (updatedSecondPost) {
                    // Should have updated from original
                    updatedSecondPost.get('slug').should.not.equal(secondPost.slug);
                    // Should not have a conflicted slug from the first
                    updatedSecondPost.get('slug').should.not.equal(firstPost.slug);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.edited']);

                    return PostModel.findOne({
                        id: updatedSecondPost.id,
                        status: 'all'
                    });
                }).then(function (foundPost) {
                    // Should have updated from original
                    foundPost.get('slug').should.not.equal(secondPost.slug);
                    // Should not have a conflicted slug from the first
                    foundPost.get('slug').should.not.equal(firstPost.slug);

                    done();
                }).catch(done);
            });
        });

        describe('destroy', function () {
            beforeEach(function () {
                eventsTriggered = {};
                sandbox.stub(common.events, 'emit').callsFake(function (eventName, eventObj) {
                    if (!eventsTriggered[eventName]) {
                        eventsTriggered[eventName] = [];
                    }

                    eventsTriggered[eventName].push(eventObj);
                });
            });

            it('published post', function (done) {
                // We're going to try deleting post id 1 which has tag id 1
                var firstItemData = {id: testUtils.DataGenerator.Content.posts[0].id};

                // Test that we have the post we expect, with exactly one tag
                PostModel.findOne(firstItemData, {include: ['tags']}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(firstItemData.id);
                    post.status.should.equal('published');
                    post.tags.should.have.length(2);
                    post.tags[0].id.should.equal(testUtils.DataGenerator.Content.tags[0].id);

                    // Destroy the post
                    return results.destroy();
                }).then(function (response) {
                    var deleted = response.toJSON();

                    should.equal(deleted.author, undefined);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['post.unpublished']);
                    should.exist(eventsTriggered['post.deleted']);

                    // Double check we can't find the post again
                    return PostModel.findOne(firstItemData);
                }).then(function (newResults) {
                    should.equal(newResults, null);

                    // Double check we can't find any related tags
                    return ghostBookshelf.knex.select().table('posts_tags').where('post_id', firstItemData.id);
                }).then(function (postsTags) {
                    postsTags.should.be.empty();

                    done();
                }).catch(done);
            });

            it('draft post', function (done) {
                // We're going to try deleting post 4 which also has tag 4
                var firstItemData = {id: testUtils.DataGenerator.Content.posts[3].id, status: 'draft'};

                // Test that we have the post we expect, with exactly one tag
                PostModel.findOne(firstItemData, {include: ['tags']}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(firstItemData.id);
                    post.tags.should.have.length(1);
                    post.tags[0].id.should.equal(testUtils.DataGenerator.Content.tags[3].id);

                    // Destroy the post
                    return results.destroy(firstItemData);
                }).then(function (response) {
                    var deleted = response.toJSON();

                    should.equal(deleted.author, undefined);

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['post.deleted']);

                    // Double check we can't find the post again
                    return PostModel.findOne(firstItemData);
                }).then(function (newResults) {
                    should.equal(newResults, null);

                    // Double check we can't find any related tags
                    return ghostBookshelf.knex.select().table('posts_tags').where('post_id', firstItemData.id);
                }).then(function (postsTags) {
                    postsTags.should.be.empty();

                    done();
                }).catch(done);
            });

            it('published page', function (done) {
                // We're going to try deleting page 6 which has tag 1
                var firstItemData = {id: testUtils.DataGenerator.Content.posts[5].id};

                // Test that we have the post we expect, with exactly one tag
                PostModel.findOne(firstItemData, {include: ['tags']}).then(function (results) {
                    var page;
                    should.exist(results);
                    page = results.toJSON();
                    page.id.should.equal(firstItemData.id);
                    page.status.should.equal('published');
                    page.page.should.be.true();

                    // Destroy the page
                    return results.destroy(firstItemData);
                }).then(function (response) {
                    var deleted = response.toJSON();

                    should.equal(deleted.author, undefined);

                    Object.keys(eventsTriggered).length.should.eql(2);
                    should.exist(eventsTriggered['page.unpublished']);
                    should.exist(eventsTriggered['page.deleted']);

                    // Double check we can't find the post again
                    return PostModel.findOne(firstItemData);
                }).then(function (newResults) {
                    should.equal(newResults, null);

                    // Double check we can't find any related tags
                    return ghostBookshelf.knex.select().table('posts_tags').where('post_id', firstItemData.id);
                }).then(function (postsTags) {
                    postsTags.should.be.empty();

                    done();
                }).catch(done);
            });

            it('draft page', function (done) {
                // We're going to try deleting post 7 which has tag 4
                var firstItemData = {id: testUtils.DataGenerator.Content.posts[6].id, status: 'draft'};

                // Test that we have the post we expect, with exactly one tag
                PostModel.findOne(firstItemData, {include: ['tags']}).then(function (results) {
                    var page;
                    should.exist(results);
                    page = results.toJSON();
                    page.id.should.equal(firstItemData.id);

                    // Destroy the page
                    return results.destroy(firstItemData);
                }).then(function (response) {
                    var deleted = response.toJSON();

                    should.equal(deleted.author, undefined);

                    Object.keys(eventsTriggered).length.should.eql(1);
                    should.exist(eventsTriggered['page.deleted']);

                    // Double check we can't find the post again
                    return PostModel.findOne(firstItemData);
                }).then(function (newResults) {
                    should.equal(newResults, null);

                    // Double check we can't find any related tags
                    return ghostBookshelf.knex.select().table('posts_tags').where('post_id', firstItemData.id);
                }).then(function (postsTags) {
                    postsTags.should.be.empty();

                    done();
                }).catch(done);
            });
        });

        describe('Collision Protection', function () {
            it('update post title, but updated_at is out of sync', function (done) {
                var postToUpdate = {id: testUtils.DataGenerator.Content.posts[1].id};

                PostModel.findOne({id: postToUpdate.id, status: 'all'})
                    .then(function () {
                        return Promise.delay(1000);
                    })
                    .then(function () {
                        return PostModel.edit({
                            title: 'New Post Title',
                            updated_at: moment().subtract(1, 'day').format()
                        }, _.extend({}, context, {id: postToUpdate.id}));
                    })
                    .then(function () {
                        done(new Error('expected no success'));
                    })
                    .catch(function (err) {
                        err.code.should.eql('UPDATE_COLLISION');
                        done();
                    });
            });

            it('update post tags and updated_at is out of sync', function (done) {
                var postToUpdate = {id: testUtils.DataGenerator.Content.posts[1].id};

                PostModel.findOne({id: postToUpdate.id, status: 'all'})
                    .then(function () {
                        return Promise.delay(1000);
                    })
                    .then(function () {
                        return PostModel.edit({
                            tags: [{name: 'new-tag-1'}],
                            updated_at: moment().subtract(1, 'day').format()
                        }, _.extend({}, context, {id: postToUpdate.id}));
                    })
                    .then(function () {
                        done(new Error('expected no success'));
                    })
                    .catch(function (err) {
                        err.code.should.eql('UPDATE_COLLISION');
                        done();
                    });
            });

            it('update post tags and updated_at is NOT out of sync', function (done) {
                var postToUpdate = {id: testUtils.DataGenerator.Content.posts[1].id};

                PostModel.findOne({id: postToUpdate.id, status: 'all'})
                    .then(function () {
                        return Promise.delay(1000);
                    })
                    .then(function () {
                        return PostModel.edit({
                            tags: [{name: 'new-tag-1'}]
                        }, _.extend({}, context, {id: postToUpdate.id}));
                    })
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });

            it('update post with no changes, but updated_at is out of sync', function (done) {
                var postToUpdate = {id: testUtils.DataGenerator.Content.posts[1].id};

                PostModel.findOne({id: postToUpdate.id, status: 'all'})
                    .then(function () {
                        return Promise.delay(1000);
                    })
                    .then(function () {
                        return PostModel.edit({
                            updated_at: moment().subtract(1, 'day').format()
                        }, _.extend({}, context, {id: postToUpdate.id}));
                    })
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });

            it('update post with old post title, but updated_at is out of sync', function (done) {
                var postToUpdate = {
                    id: testUtils.DataGenerator.Content.posts[1].id,
                    title: testUtils.DataGenerator.forModel.posts[1].title
                };

                PostModel.findOne({id: postToUpdate.id, status: 'all'})
                    .then(function () {
                        return Promise.delay(1000);
                    })
                    .then(function () {
                        return PostModel.edit({
                            title: postToUpdate.title,
                            updated_at: moment().subtract(1, 'day').format()
                        }, _.extend({}, context, {id: postToUpdate.id}));
                    })
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });
        });
    });

    describe('Multiauthor Posts', function () {
        before(testUtils.teardown);
        afterEach(testUtils.teardown);
        beforeEach(testUtils.setup('posts:mu'));

        it('can destroy multiple posts by author', function (done) {
            // We're going to delete all posts by user 1
            var authorData = {id: testUtils.DataGenerator.Content.users[0].id};

            PostModel.findAll({context: {internal: true}}).then(function (found) {
                // There are 50 posts to begin with
                found.length.should.equal(50);
                return PostModel.destroyByAuthor(authorData);
            }).then(function (results) {
                // User 1 has 13 posts in the database
                results.length.should.equal(13);
                return PostModel.findAll({context: {internal: true}});
            }).then(function (found) {
                // Only 37 should remain
                found.length.should.equal(37);
                done();
            }).catch(done);
        });
    });

    describe('Post tag handling edge cases', function () {
        beforeEach(testUtils.setup());

        var postJSON,
            tagJSON,
            editOptions,
            createTag = testUtils.DataGenerator.forKnex.createTag;

        beforeEach(function () {
            tagJSON = [];

            var post = _.cloneDeep(testUtils.DataGenerator.forModel.posts[0]),
                postTags = [
                    createTag({name: 'tag1'}),
                    createTag({name: 'tag2'}),
                    createTag({name: 'tag3'})
                ],
                extraTags = [
                    createTag({name: 'existing tag a'}),
                    createTag({name: 'existing-tag-b'}),
                    createTag({name: 'existing_tag_c'})
                ];

            post.tags = postTags;
            post.status = 'published';

            return Promise.props({
                post: PostModel.add(post, _.extend({}, context, {withRelated: ['tags']})),
                tag1: TagModel.add(extraTags[0], context),
                tag2: TagModel.add(extraTags[1], context),
                tag3: TagModel.add(extraTags[2], context)
            }).then(function (result) {
                postJSON = result.post.toJSON({include: ['tags']});
                tagJSON.push(result.tag1.toJSON());
                tagJSON.push(result.tag2.toJSON());
                tagJSON.push(result.tag3.toJSON());
                editOptions = _.extend({}, context, {id: postJSON.id, withRelated: ['tags']});

                // reset the eventSpy here
                sandbox.restore();
            });
        });

        it('should create the test data correctly', function (done) {
            // creates a test tag
            should.exist(tagJSON);
            tagJSON.should.be.an.Array().with.lengthOf(3);

            tagJSON[0].name.should.eql('existing tag a');
            tagJSON[1].name.should.eql('existing-tag-b');
            tagJSON[2].name.should.eql('existing_tag_c');

            // creates a test post with an array of tags in the correct order
            should.exist(postJSON);
            postJSON.title.should.eql('HTML Ipsum');
            should.exist(postJSON.tags);
            postJSON.tags.should.be.an.Array().and.have.lengthOf(3);

            postJSON.tags[0].name.should.eql('tag1');
            postJSON.tags[1].name.should.eql('tag2');
            postJSON.tags[2].name.should.eql('tag3');

            done();
        });

        it('can edit slug of existing tag', function () {
            var newJSON = _.cloneDeep(postJSON);

            // Add an existing tag to the beginning of the array
            newJSON.tags = [{id: postJSON.tags[0].id, slug: 'eins'}];

            // Edit the post
            return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                updatedPost = updatedPost.toJSON({include: ['tags']});

                updatedPost.tags.should.have.lengthOf(1);
                updatedPost.tags[0].name.should.eql(postJSON.tags[0].name);
                updatedPost.tags[0].slug.should.eql('eins');
                updatedPost.tags[0].id.should.eql(postJSON.tags[0].id);
            });
        });

        it('can\'t edit dates and authors of existing tag', function () {
            var newJSON = _.cloneDeep(postJSON), updatedAtFormat;

            // Add an existing tag to the beginning of the array
            newJSON.tags = [{
                id: postJSON.tags[0].id,
                slug: 'eins',
                created_at: moment().add(2, 'days').format('YYYY-MM-DD HH:mm:ss'),
                updated_at: moment().add(2, 'days').format('YYYY-MM-DD HH:mm:ss'),
                created_by: 2,
                updated_by: 2
            }];

            // Edit the post
            return Promise.delay(1000)
                .then(function () {
                    return PostModel.edit(newJSON, editOptions);
                })
                .then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(1);
                    updatedPost.tags[0].should.have.properties({
                        name: postJSON.tags[0].name,
                        slug: 'eins',
                        id: postJSON.tags[0].id,
                        created_at: postJSON.tags[0].created_at,
                        created_by: postJSON.created_by,
                        updated_by: postJSON.updated_by
                    });

                    updatedAtFormat = moment(updatedPost.tags[0].updated_at).format('YYYY-MM-DD HH:mm:ss');
                    updatedAtFormat.should.not.eql(moment(postJSON.updated_at).format('YYYY-MM-DD HH:mm:ss'));
                    updatedAtFormat.should.not.eql(moment(newJSON.tags[0].updated_at).format('YYYY-MM-DD HH:mm:ss'));
                });
        });

        it('can reorder existing, added and deleted tags', function () {
            var newJSON = _.cloneDeep(postJSON),
                lastTag = [postJSON.tags[2]];

            // remove tag in the middle (tag1, tag2, tag3 -> tag1, tag3)
            newJSON.tags.splice(1, 1);

            // add a new one as first tag and reorder existing (tag4, tag3, tag1)
            newJSON.tags = [{name: 'tag4'}].concat([newJSON.tags[1]]).concat([newJSON.tags[0]]);

            // Edit the post
            return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                updatedPost = updatedPost.toJSON({include: ['tags']});

                updatedPost.tags.should.have.lengthOf(3);
                updatedPost.tags[0].should.have.properties({
                    name: 'tag4'
                });

                updatedPost.tags[1].should.have.properties({
                    name: 'tag3',
                    id: postJSON.tags[2].id
                });

                updatedPost.tags[2].should.have.properties({
                    name: 'tag1',
                    id: postJSON.tags[0].id
                });
            });
        });

        it('can add multiple tags with conflicting slugs', function () {
            var newJSON = _.cloneDeep(postJSON);

            // Add conflicting tags to the end of the array
            newJSON.tags = [];
            newJSON.tags.push({name: 'C'});
            newJSON.tags.push({name: 'C++'});
            newJSON.tags.push({name: 'C#'});

            // Edit the post
            return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                updatedPost = updatedPost.toJSON({include: ['tags']});

                updatedPost.tags.should.have.lengthOf(3);

                updatedPost.tags[0].should.have.properties({name: 'C', slug: 'c'});
                updatedPost.tags[1].should.have.properties({name: 'C++', slug: 'c-2'});
                updatedPost.tags[2].should.have.properties({name: 'C#', slug: 'c-3'});
            });
        });

        it('can handle lowercase/uppercase tags', function () {
            var newJSON = _.cloneDeep(postJSON);

            // Add conflicting tags to the end of the array
            newJSON.tags = [];
            newJSON.tags.push({name: 'test'});
            newJSON.tags.push({name: 'tEst'});

            // Edit the post
            return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                updatedPost = updatedPost.toJSON({include: ['tags']});

                updatedPost.tags.should.have.lengthOf(1);
            });
        });
    });

    // disabling sanitization until we can implement a better version
    // it('should sanitize the title', function (done) {
    //    new PostModel().fetch().then(function (model) {
    //        return model.set({'title': "</title></head><body><script>alert('blogtitle');</script>"}).save();
    //    }).then(function (saved) {
    //        saved.get('title').should.eql("&lt;/title&gt;&lt;/head>&lt;body&gt;[removed]alert&#40;'blogtitle'&#41;;[removed]");
    //        done();
    //    }).catch(done);
    // });
});
