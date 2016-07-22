var testUtils       = require('../../utils'),
    should          = require('should'),
    moment          = require('moment'),
    _               = require('lodash'),
    Promise         = require('bluebird'),
    sinon           = require('sinon'),

    // Stuff we are testing
    sequence        = require('../../../server/utils/sequence'),
    ghostBookshelf  = require('../../../server/models/base'),
    PostModel       = require('../../../server/models/post').Post,
    TagModel        = require('../../../server/models/tag').Tag,
    events          = require('../../../server/events'),
    errors          = require('../../../server/errors'),
    DataGenerator   = testUtils.DataGenerator,
    context         = testUtils.context.owner,

    configUtils = require('../../utils/configUtils'),

    sandbox         = sinon.sandbox.create();

describe('Post Model', function () {
    var eventSpy;

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(function () {
        eventSpy = sandbox.spy(events, 'emit');
    });

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

        function extractFirstPost(posts) {
            return _.filter(posts, {id: 1})[0];
        }

        function checkFirstPostData(firstPost) {
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
        }

        describe('findAll', function () {
            beforeEach(function () {
                configUtils.set({theme: {
                    permalinks: '/:slug/'
                }});
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
                        });

                        // the first post in the result is not always the post at
                        // position 0 in the fixture data so we need to use extractFirstPost
                        // to get the post with id: 1
                        checkFirstPostData(extractFirstPost(posts));

                        done();
                    }).catch(done);
            });
        });

        describe('findPage', function () {
            beforeEach(function () {
                configUtils.set({theme: {
                    permalinks: '/:slug/'
                }});
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

                        // the first post in the result is not always the post at
                        // position 0 in the fixture data so we need to use extractFirstPost
                        // to get the post with id: 1
                        checkFirstPostData(extractFirstPost(results.posts));

                        done();
                    }).catch(done);
            });

            it('returns computed fields when columns are asked for explicitly', function (done) {
                PostModel.findPage({columns: ['id', 'slug', 'url', 'markdown']}).then(function (results) {
                    should.exist(results);

                    var post = extractFirstPost(results.posts);

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

                    var post = extractFirstPost(results.posts);

                    post.id.should.equal(1);
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
                configUtils.set({theme: {
                    permalinks: '/:slug/'
                }});
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
                var firstPost = 1;

                PostModel.findOne({id: firstPost})
                    .then(function (result) {
                        should.exist(result);
                        firstPost = result.toJSON();
                        firstPost.url.should.equal('/html-ipsum/');

                        done();
                    }).catch(done);
            });

            it('can findOne, returning a dated permalink', function (done) {
                var firstPost = 1;

                configUtils.set({theme: {
                    permalinks: '/:year/:month/:day/:slug/'
                }});

                PostModel.findOne({id: firstPost})
                    .then(function (result) {
                        should.exist(result);
                        firstPost = result.toJSON();

                        // published_at of post 1 is 2015-01-01 00:00:00
                        // default blog TZ is UTC
                        firstPost.url.should.equal('/2015/01/01/html-ipsum/');

                        done();
                    }).catch(done);
            });
        });

        describe('edit', function () {
            it('can change title', function (done) {
                var postId = 1;

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
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.published.edited').should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

                    done();
                }).catch(done);
            });

            it('can change title to number', function (done) {
                var postId = 1;

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

            it('can change markdown to number', function (done) {
                var postId = 1;

                PostModel.findOne({id: postId}).then(function (results) {
                    should.exist(results);
                    var post = results.toJSON();
                    post.title.should.not.equal('123');
                    return PostModel.edit({markdown: 123}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.markdown.should.equal('123');
                    done();
                }).catch(done);
            });

            it('can publish draft post', function (done) {
                var postId = 4;

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
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.published').should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

                    done();
                }).catch(done);
            });

            it('can unpublish published post', function (done) {
                var postId = 1;

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
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.unpublished').should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

                    done();
                }).catch(done);
            });

            it('draft -> scheduled without published_at update', function (done) {
                PostModel.findOne({status: 'draft'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('draft');

                    return PostModel.edit({
                        status: 'scheduled'
                    }, _.extend({}, context, {id: post.id}));
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('draft -> scheduled: invalid published_at update', function (done) {
                PostModel.findOne({status: 'draft'}).then(function (results) {
                    var post;

                    should.exist(results);
                    post = results.toJSON();
                    post.status.should.equal('draft');

                    return PostModel.edit({
                        status: 'scheduled',
                        published_at: '328432423'
                    }, _.extend({}, context, {id: post.id}));
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
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
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.scheduled').should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

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
                    eventSpy.callCount.should.eql(2);
                    eventSpy.firstCall.calledWith('post.unscheduled').should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

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
                        published_at: moment().add(20, 'days')
                    }, _.extend({}, context, {id: post.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');
                    eventSpy.callCount.should.eql(2);
                    eventSpy.firstCall.calledWith('post.rescheduled').should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

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
                    eventSpy.callCount.should.eql(1);
                    eventSpy.firstCall.calledWith('post.edited').should.be.true();

                    done();
                }).catch(done);
            });

            it('published -> scheduled and expect update of published_at', function (done) {
                var postId = 1;

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
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('can convert draft post to page and back', function (done) {
                var postId = 4;

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
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.deleted').should.be.true();
                    eventSpy.secondCall.calledWith('page.added').should.be.true();

                    return PostModel.edit({page: 0}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    edited.attributes.page.should.equal(false);
                    eventSpy.callCount.should.equal(4);
                    eventSpy.thirdCall.calledWith('page.deleted').should.be.true();
                    eventSpy.lastCall.calledWith('post.added').should.be.true();
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
                    eventSpy.callCount.should.be.eql(3);
                    eventSpy.firstCall.calledWith('post.deleted').should.be.true();
                    eventSpy.secondCall.calledWith('page.added').should.be.true();
                    eventSpy.thirdCall.calledWith('page.scheduled').should.be.true();

                    return PostModel.edit({page: 0}, _.extend({}, context, {id: edited.id}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('scheduled');
                    edited.attributes.page.should.equal(false);
                    eventSpy.callCount.should.equal(7);
                    eventSpy.getCall(3).calledWith('page.unscheduled').should.be.true();
                    eventSpy.getCall(4).calledWith('page.deleted').should.be.true();
                    eventSpy.getCall(5).calledWith('post.added').should.be.true();
                    eventSpy.getCall(6).calledWith('post.scheduled').should.be.true();
                    done();
                }).catch(done);
            });

            it('can convert published post to page and back', function (done) {
                var postId = 1;

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

                    eventSpy.callCount.should.equal(4);
                    eventSpy.firstCall.calledWith('post.unpublished').should.be.true();
                    eventSpy.secondCall.calledWith('post.deleted').should.be.true();
                    eventSpy.thirdCall.calledWith('page.added').should.be.true();
                    eventSpy.lastCall.calledWith('page.published').should.be.true();

                    return PostModel.edit({page: 0}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('published');
                    edited.attributes.page.should.equal(false);

                    eventSpy.callCount.should.equal(8);
                    eventSpy.getCall(4).calledWith('page.unpublished').should.be.true();
                    eventSpy.getCall(5).calledWith('page.deleted').should.be.true();
                    eventSpy.getCall(6).calledWith('post.added').should.be.true();
                    eventSpy.getCall(7).calledWith('post.published').should.be.true();
                    done();
                }).catch(done);
            });

            it('can change type and status at the same time', function (done) {
                var postId = 4;

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
                    eventSpy.calledThrice.should.be.true();
                    eventSpy.firstCall.calledWith('post.deleted').should.be.true();
                    eventSpy.secondCall.calledWith('page.added').should.be.true();
                    eventSpy.thirdCall.calledWith('page.published').should.be.true();

                    return PostModel.edit({page: 0, status: 'draft'}, _.extend({}, context, {id: postId}));
                }).then(function (edited) {
                    should.exist(edited);
                    edited.attributes.status.should.equal('draft');
                    edited.attributes.page.should.equal(false);
                    eventSpy.callCount.should.equal(6);
                    eventSpy.getCall(3).calledWith('page.unpublished').should.be.true();
                    eventSpy.getCall(4).calledWith('page.deleted').should.be.true();
                    eventSpy.getCall(5).calledWith('post.added').should.be.true();
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
                var postId = 4;

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
        });

        describe('add', function () {
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
                    createdPost.get('markdown').should.equal(newPost.markdown, 'markdown is correct');
                    createdPost.has('html').should.equal(true);
                    createdPost.get('html').should.equal(newPostDB.html);
                    createdPost.get('slug').should.equal(newPostDB.slug + '-2');
                    (!!createdPost.get('featured')).should.equal(false);
                    (!!createdPost.get('page')).should.equal(false);
                    createdPost.get('language').should.equal('en_US');
                    // testing for nulls
                    (createdPost.get('image') === null).should.equal(true);
                    (createdPost.get('meta_title') === null).should.equal(true);
                    (createdPost.get('meta_description') === null).should.equal(true);

                    createdPost.get('created_at').should.be.above(new Date(0).getTime());
                    createdPost.get('created_by').should.equal(1);
                    createdPost.get('author_id').should.equal(1);
                    createdPost.has('author').should.equal(false);
                    createdPost.get('created_by').should.equal(createdPost.get('author_id'));
                    createdPost.get('updated_at').should.be.above(new Date(0).getTime());
                    createdPost.get('updated_by').should.equal(1);
                    should.equal(createdPost.get('published_at'), null);
                    should.equal(createdPost.get('published_by'), null);

                    createdPostUpdatedDate = createdPost.get('updated_at');

                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();

                    // Set the status to published to check that `published_at` is set.
                    return createdPost.save({status: 'published'}, context);
                }).then(function (publishedPost) {
                    publishedPost.get('published_at').should.be.instanceOf(Date);
                    publishedPost.get('published_by').should.equal(1);
                    publishedPost.get('updated_at').should.be.instanceOf(Date);
                    publishedPost.get('updated_by').should.equal(1);
                    publishedPost.get('updated_at').should.not.equal(createdPostUpdatedDate);

                    eventSpy.calledThrice.should.be.true();
                    eventSpy.secondCall.calledWith('post.published').should.be.true();
                    eventSpy.thirdCall.calledWith('post.edited').should.be.true();

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

            it('can add, with markdown being a number', function (done) {
                var newPost = testUtils.DataGenerator.forModel.posts[2];

                newPost.markdown = 123;

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
                    markdown: 'This is some content'
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    new Date(newPost.get('published_at')).getTime().should.equal(previousPublishedAtDate.getTime());

                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();
                    eventSpy.secondCall.calledWith('post.published').should.be.true();

                    done();
                }).catch(done);
            });

            it('add draft post without published_at -> we expect no auto insert of published_at', function (done) {
                PostModel.add({
                    status: 'draft',
                    title: 'draft 1',
                    markdown: 'This is some content'
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    should.not.exist(newPost.get('published_at'));
                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();
                    done();
                }).catch(done);
            });

            it('add draft post with published_at -> we expect published_at to exist', function (done) {
                PostModel.add({
                    status: 'draft',
                    published_at: moment().toDate(),
                    title: 'draft 1',
                    markdown: 'This is some content'
                }, context).then(function (newPost) {
                    should.exist(newPost);
                    should.exist(newPost.get('published_at'));
                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();
                    done();
                }).catch(done);
            });

            it('add scheduled post without published_at -> we expect an error', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    title: 'scheduled 1',
                    markdown: 'This is some content'
                }, context).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                    eventSpy.called.should.be.false();
                    done();
                });
            });

            it('add scheduled post with published_at not in future-> we expect an error', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    published_at: moment().subtract(1, 'minute'),
                    title: 'scheduled 1',
                    markdown: 'This is some content'
                }, context).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                    eventSpy.called.should.be.false();
                    done();
                });
            });

            it('add scheduled post with published_at 1 minutes in future -> we expect an error', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    published_at: moment().add(1, 'minute'),
                    title: 'scheduled 1',
                    markdown: 'This is some content'
                }, context).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    eventSpy.called.should.be.false();
                    done();
                });
            });

            it('add scheduled post with published_at 10 minutes in future -> we expect success', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    published_at: moment().add(10, 'minute'),
                    title: 'scheduled 1',
                    markdown: 'This is some content'
                }, context).then(function (post) {
                    should.exist(post);
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();
                    eventSpy.secondCall.calledWith('post.scheduled').should.be.true();
                    done();
                }).catch(done);
            });

            it('add scheduled page with published_at 10 minutes in future -> we expect success', function (done) {
                PostModel.add({
                    status: 'scheduled',
                    page: 1,
                    published_at: moment().add(10, 'minute'),
                    title: 'scheduled 1',
                    markdown: 'This is some content'
                }, context).then(function (post) {
                    should.exist(post);
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('page.added').should.be.true();
                    eventSpy.secondCall.calledWith('page.scheduled').should.be.true();
                    done();
                }).catch(done);
            });

            it('can add default title, if it\'s missing', function (done) {
                PostModel.add({
                    markdown: 'Content'
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
                        markdown: 'Test Content'
                    };

                PostModel.add(newPost, context).then(function (createdPost) {
                    return new PostModel({id: createdPost.id}).fetch();
                }).then(function (createdPost) {
                    should.exist(createdPost);
                    createdPost.get('title').should.equal(untrimmedCreateTitle.trim());

                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();

                    return createdPost.save({title: untrimmedUpdateTitle}, context);
                }).then(function (updatedPost) {
                    updatedPost.get('title').should.equal(untrimmedUpdateTitle.trim());

                    eventSpy.calledTwice.should.be.true();
                    eventSpy.secondCall.calledWith('post.edited').should.be.true();

                    done();
                }).catch(done);
            });

            it('can generate a non conflicting slug', function (done) {
                // Create 12 posts with the same title
                sequence(_.times(12, function (i) {
                    return function () {
                        return PostModel.add({
                            title: 'Test Title',
                            markdown: 'Test Content ' + (i + 1)
                        }, context);
                    };
                })).then(function (createdPosts) {
                    // Should have created 12 posts
                    createdPosts.length.should.equal(12);
                    eventSpy.callCount.should.equal(12);

                    // Should have unique slugs and contents
                    _(createdPosts).each(function (post, i) {
                        var num = i + 1;

                        // First one has normal title
                        if (num === 1) {
                            post.get('slug').should.equal('test-title');
                            return;
                        }

                        post.get('slug').should.equal('test-title-' + num);
                        post.get('markdown').should.equal('Test Content ' + num);
                        eventSpy.getCall(i).calledWith('post.added').should.be.true();
                    });

                    done();
                }).catch(done);
            });

            it('can generate slugs without duplicate hyphens', function (done) {
                var newPost = {
                    title: 'apprehensive  titles  have  too  many  spaces—and m-dashes  —  –  and also n-dashes  ',
                    markdown: 'Test Content 1'
                };

                PostModel.add(newPost, context).then(function (createdPost) {
                    createdPost.get('slug').should.equal('apprehensive-titles-have-too-many-spaces-and-m-dashes-and-also-n-dashes');
                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();

                    done();
                }).catch(done);
            });

            it('can generate a safe slug when a reserved keyword is used', function (done) {
                var newPost = {
                    title: 'rss',
                    markdown: 'Test Content 1'
                };

                PostModel.add(newPost, context).then(function (createdPost) {
                    createdPost.get('slug').should.not.equal('rss');
                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.added').should.be.true();

                    done();
                });
            });

            it('can generate slugs without non-ascii characters', function (done) {
                var newPost = {
                    title: 'भुते धडकी भरवणारा आहेत',
                    markdown: 'Test Content 1'
                };

                PostModel.add(newPost, context).then(function (createdPost) {
                    createdPost.get('slug').should.equal('bhute-dhddkii-bhrvnnaaraa-aahet');
                    done();
                }).catch(done);
            });

            it('detects duplicate slugs before saving', function (done) {
                var firstPost = {
                        title: 'First post',
                        markdown: 'First content 1'
                    },
                    secondPost = {
                        title: 'Second post',
                        markdown: 'Second content 1'
                    };

                // Create the first post
                PostModel.add(firstPost, context)
                    .then(function (createdFirstPost) {
                        // Store the slug for later
                        firstPost.slug = createdFirstPost.get('slug');
                        eventSpy.calledOnce.should.be.true();
                        eventSpy.firstCall.calledWith('post.added').should.be.true();

                        // Create the second post
                        return PostModel.add(secondPost, context);
                    }).then(function (createdSecondPost) {
                        // Store the slug for comparison later
                        secondPost.slug = createdSecondPost.get('slug');
                        eventSpy.calledTwice.should.be.true();
                        eventSpy.secondCall.calledWith('post.added').should.be.true();

                        // Update with a conflicting slug from the first post
                        return createdSecondPost.save({
                            slug: firstPost.slug
                        }, context);
                    }).then(function (updatedSecondPost) {
                        // Should have updated from original
                        updatedSecondPost.get('slug').should.not.equal(secondPost.slug);
                        // Should not have a conflicted slug from the first
                        updatedSecondPost.get('slug').should.not.equal(firstPost.slug);

                        eventSpy.calledThrice.should.be.true();
                        eventSpy.thirdCall.calledWith('post.edited').should.be.true();

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
            it('published post', function (done) {
                // We're going to try deleting post id 1 which also has tag id 1
                var firstItemData = {id: 1};

                // Test that we have the post we expect, with exactly one tag
                PostModel.findOne(firstItemData, {include: ['tags']}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(firstItemData.id);
                    post.status.should.equal('published');
                    post.tags.should.have.length(2);
                    post.tags[0].id.should.equal(firstItemData.id);

                    // Destroy the post
                    return results.destroy();
                }).then(function (response) {
                    var deleted = response.toJSON();

                    should.equal(deleted.author, undefined);

                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('post.unpublished').should.be.true();
                    eventSpy.secondCall.calledWith('post.deleted').should.be.true();

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
                // We're going to try deleting post id 4 which also has tag id 4
                var firstItemData = {id: 4, status: 'draft'};

                // Test that we have the post we expect, with exactly one tag
                PostModel.findOne(firstItemData, {include: ['tags']}).then(function (results) {
                    var post;
                    should.exist(results);
                    post = results.toJSON();
                    post.id.should.equal(firstItemData.id);
                    post.tags.should.have.length(1);
                    post.tags[0].id.should.equal(firstItemData.id);

                    // Destroy the post
                    return results.destroy(firstItemData);
                }).then(function (response) {
                    var deleted = response.toJSON();

                    should.equal(deleted.author, undefined);

                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('post.deleted').should.be.true();

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
                // We're going to try deleting page id 6 which also has tag id 1
                var firstItemData = {id: 6};

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

                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('page.unpublished').should.be.true();
                    eventSpy.secondCall.calledWith('page.deleted').should.be.true();

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
                // We're going to try deleting post id 4 which also has tag id 4
                var firstItemData = {id: 7, status: 'draft'};

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

                    eventSpy.calledOnce.should.be.true();
                    eventSpy.firstCall.calledWith('page.deleted').should.be.true();

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
    });

    describe('Multiauthor Posts', function () {
        before(testUtils.teardown);
        afterEach(testUtils.teardown);
        beforeEach(testUtils.setup('posts:mu'));

        it('can destroy multiple posts by author', function (done) {
            // We're going to delete all posts by user 1
            var authorData = {id: 1};

            PostModel.findAll({context:{internal:true}}).then(function (found) {
                // There are 50 posts to begin with
                found.length.should.equal(50);
                return PostModel.destroyByAuthor(authorData);
            }).then(function (results) {
                // User 1 has 13 posts in the database
                results.length.should.equal(13);
                return PostModel.findAll({context:{internal:true}});
            }).then(function (found) {
                // Only 37 should remain
                found.length.should.equal(37);
                done();
            }).catch(done);
        });
    });

    describe('Post tag handling', function () {
        beforeEach(testUtils.setup());

        describe('Post with tags', function () {
            var postJSON,
                tagJSON,
                editOptions,
                createTag = testUtils.DataGenerator.forKnex.createTag;

            beforeEach(function (done) {
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
                    done();
                });
            });

            it('should create the test data correctly', function (done) {
                // creates a test tag
                should.exist(tagJSON);
                tagJSON.should.be.an.Array().with.lengthOf(3);
                tagJSON.should.have.enumerable(0).with.property('name', 'existing tag a');
                tagJSON.should.have.enumerable(1).with.property('name', 'existing-tag-b');
                tagJSON.should.have.enumerable(2).with.property('name', 'existing_tag_c');

                // creates a test post with an array of tags in the correct order
                should.exist(postJSON);
                postJSON.title.should.eql('HTML Ipsum');
                should.exist(postJSON.tags);
                postJSON.tags.should.be.an.Array().and.have.lengthOf(3);
                postJSON.tags.should.have.enumerable(0).with.property('name', 'tag1');
                postJSON.tags.should.have.enumerable(1).with.property('name', 'tag2');
                postJSON.tags.should.have.enumerable(2).with.property('name', 'tag3');

                done();
            });

            describe('Adding brand new tags', function () {
                it('can add a single tag to the end of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a single tag to the end of the array
                    newJSON.tags.push(createTag({name: 'tag4'}));

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(4);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.property('name', 'tag4');

                        done();
                    }).catch(done);
                });

                it('can add a single tag to the beginning of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a single tag to the beginning of the array
                    newJSON.tags = [createTag({name: 'tag4'})].concat(postJSON.tags);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(4);
                        updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag4');
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });

                        done();
                    }).catch(done);
                });
            });

            describe('Adding pre-existing tags', function () {
                it('can add a single tag to the end of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a single pre-existing tag to the end of the array
                    newJSON.tags.push(tagJSON[0]);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(4);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });

                        done();
                    }).catch(done);
                });

                it('can add a single tag to the beginning of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add an existing tag to the beginning of the array
                    newJSON.tags = [tagJSON[0]].concat(postJSON.tags);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(4);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });

                        done();
                    }).catch(done);
                });

                it('can add a single tag to the middle of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a single pre-existing tag to the middle of the array
                    newJSON.tags = postJSON.tags.slice(0, 1).concat([tagJSON[0]]).concat(postJSON.tags.slice(1));

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(4);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });

                        done();
                    }).catch(done);
                });
            });

            describe('Removing tags', function () {
                it('can remove a single tag from the end of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Remove a single tag from the end of the array
                    newJSON.tags = postJSON.tags.slice(0, -1);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(2);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });

                        done();
                    }).catch(done);
                });

                it('can remove a single tag from the beginning of the tags array', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Remove a single tag from the beginning of the array
                    newJSON.tags = postJSON.tags.slice(1);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(2);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });

                        done();
                    }).catch(done);
                });

                it('can remove all tags', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Remove all the tags
                    newJSON.tags = [];

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(0);

                        done();
                    }).catch(done);
                });
            });

            describe('Reordering tags', function () {
                it('can reorder the first tag to be the last', function (done) {
                    var newJSON = _.cloneDeep(postJSON),
                        firstTag = [postJSON.tags[0]];

                    // Reorder the tags, so that the first tag is moved to the end
                    newJSON.tags = postJSON.tags.slice(1).concat(firstTag);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(3);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });

                        done();
                    }).catch(done);
                });

                it('can reorder the last tag to be the first', function (done) {
                    var newJSON = _.cloneDeep(postJSON),
                        lastTag = [postJSON.tags[2]];

                    // Reorder the tags, so that the last tag is moved to the beginning
                    newJSON.tags = lastTag.concat(postJSON.tags.slice(0, -1));

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(3);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });

                        done();
                    }).catch(done);
                });
            });

            describe('Edit post', function () {
                // These tests are for #6920
                it('can edit a post SAFELY when tags are not included', function (done) {
                    var postId = postJSON.id,
                        toJSONOpts = {include: ['tags']},
                        startTags;

                    // Step 1, fetch a post with its tags, just to see what tags we have
                    PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                        var post = results.toJSON(toJSONOpts);
                        should.exist(results);
                        post.title.should.not.equal('new title');
                        post.tags.should.have.lengthOf(3);

                        // Save a copy of these tags to test later
                        startTags = _.cloneDeep(post.tags);

                        // Step 2, edit a single property of the post... we aren't doing anything with tags here...
                        return PostModel.edit({title: 'new title'}, _.extend({}, context, {id: postId}));
                    }).then(function (edited) {
                        should.exist(edited);
                        var post = edited.toJSON(toJSONOpts);

                        post.title.should.equal('new title');
                        // edit didn't include tags, so they should be blank
                        should.not.exist(post.tags);

                        // Step 3, request the same post again, including tags... they should still be present
                        return PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                            var post = results.toJSON(toJSONOpts);
                            post.tags.should.have.lengthOf(3);
                            post.tags.should.eql(startTags);

                            done();
                        });
                    }).catch(done);
                });

                it('can edit a post SAFELY when tags is undefined', function (done) {
                    var postId = postJSON.id,
                        toJSONOpts = {include: ['tags']},
                        startTags;

                    // Step 1, fetch a post with its tags, just to see what tags we have
                    PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                        var post = results.toJSON(toJSONOpts);
                        should.exist(results);
                        post.title.should.not.equal('new title');
                        post.tags.should.have.lengthOf(3);

                        // Save a copy of these tags to test later
                        startTags = _.cloneDeep(post.tags);

                        // Step 2, edit a single property of the post... we aren't doing anything with tags here...
                        return PostModel.edit({title: 'new title', tags: undefined}, _.extend({}, context, {id: postId}));
                    }).then(function (edited) {
                        should.exist(edited);
                        var post = edited.toJSON(toJSONOpts);

                        post.title.should.equal('new title');
                        // edit didn't include tags, so they should be blank
                        should.not.exist(post.tags);

                        // Step 3, request the same post again, including tags... they should still be present
                        return PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                            var post = results.toJSON(toJSONOpts);
                            post.tags.should.have.lengthOf(3);
                            post.tags.should.eql(startTags);

                            done();
                        });
                    }).catch(done);
                });

                it('can edit a post SAFELY when tags is null', function (done) {
                    var postId = postJSON.id,
                        toJSONOpts = {include: ['tags']},
                        startTags;

                    // Step 1, fetch a post with its tags, just to see what tags we have
                    PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                        var post = results.toJSON(toJSONOpts);
                        should.exist(results);
                        post.title.should.not.equal('new title');
                        post.tags.should.have.lengthOf(3);

                        // Save a copy of these tags to test later
                        startTags = _.cloneDeep(post.tags);

                        // Step 2, edit a single property of the post... we aren't doing anything with tags here...
                        return PostModel.edit({title: 'new title', tags: null}, _.extend({}, context, {id: postId}));
                    }).then(function (edited) {
                        should.exist(edited);
                        var post = edited.toJSON(toJSONOpts);

                        post.title.should.equal('new title');
                        // edit didn't include tags, so they should be blank
                        should.not.exist(post.tags);

                        // Step 3, request the same post again, including tags... they should still be present
                        return PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                            var post = results.toJSON(toJSONOpts);
                            post.tags.should.have.lengthOf(3);
                            post.tags.should.eql(startTags);

                            done();
                        });
                    }).catch(done);
                });

                it('can remove all tags when sent an empty array', function (done) {
                    var postId = postJSON.id,
                        toJSONOpts = {include: ['tags']};

                    // Step 1, fetch a post with its tags, just to see what tags we have
                    PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                        var post = results.toJSON(toJSONOpts);
                        should.exist(results);
                        post.title.should.not.equal('new title');
                        post.tags.should.have.lengthOf(3);

                        // Step 2, edit a single property of the post... we aren't doing anything with tags here...
                        return PostModel.edit({title: 'new title', tags: []}, _.extend({}, context, {id: postId}));
                    }).then(function (edited) {
                        should.exist(edited);
                        var post = edited.toJSON(toJSONOpts);

                        post.title.should.equal('new title');
                        // edit didn't include tags, so they should be blank
                        should.not.exist(post.tags);

                        // Step 3, request the same post again, including tags... they should be gone
                        return PostModel.findOne({id: postId}, {withRelated: ['tags']}).then(function (results) {
                            var post = results.toJSON(toJSONOpts);
                            // Tags should be gone
                            post.tags.should.eql([]);

                            done();
                        });
                    }).catch(done);
                });
            });

            describe('Combination updates', function () {
                it('can add a combination of new and pre-existing tags', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Push a bunch of new and existing tags to the end of the array
                    newJSON.tags.push({name: 'tag4'});
                    newJSON.tags.push({name: 'existing tag a'});
                    newJSON.tags.push({name: 'tag5'});
                    newJSON.tags.push({name: 'existing-tag-b'});
                    newJSON.tags.push({name: 'bob'});
                    newJSON.tags.push({name: 'existing_tag_c'});

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(9);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.property('name', 'tag4');
                        updatedPost.tags.should.have.enumerable(4).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(5).with.property('name', 'tag5');
                        updatedPost.tags.should.have.enumerable(6).with.properties({
                            name: 'existing-tag-b',
                            id: tagJSON[1].id
                        });
                        updatedPost.tags.should.have.enumerable(7).with.property('name', 'bob');
                        updatedPost.tags.should.have.enumerable(8).with.properties({
                            name: 'existing_tag_c',
                            id: tagJSON[2].id
                        });

                        done();
                    }).catch(done);
                });

                it('can reorder the first tag to be the last and add a tag to the beginning', function (done) {
                    var newJSON = _.cloneDeep(postJSON),
                        firstTag = [postJSON.tags[0]];

                    // Add a new tag to the beginning, and move the original first tag to the end
                    newJSON.tags = [tagJSON[0]].concat(postJSON.tags.slice(1)).concat(firstTag);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(4);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });

                        done();
                    }).catch(done);
                });

                it('can reorder the first tag to be the last, remove the original last tag & add a tag to the beginning', function (done) {
                    var newJSON = _.cloneDeep(postJSON),
                        firstTag = [newJSON.tags[0]];

                    // And an existing tag to the beginning of the array, move the original first tag to the end and remove the original last tag
                    newJSON.tags = [tagJSON[0]].concat(newJSON.tags.slice(1, -1)).concat(firstTag);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(3);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });

                        done();
                    }).catch(done);
                });

                it('can reorder original tags, remove one, and add new and existing tags', function (done) {
                    var newJSON = _.cloneDeep(postJSON),
                        firstTag = [newJSON.tags[0]];

                    // Reorder original 3 so that first is at the end
                    newJSON.tags = newJSON.tags.slice(1).concat(firstTag);

                    // add an existing tag in the middle
                    newJSON.tags = newJSON.tags.slice(0, 1).concat({name: 'existing-tag-b'}).concat(newJSON.tags.slice(1));

                    // add a brand new tag in the middle
                    newJSON.tags = newJSON.tags.slice(0, 3).concat({name: 'betty'}).concat(newJSON.tags.slice(3));

                    // Add some more tags to the end
                    newJSON.tags.push({name: 'bob'});
                    newJSON.tags.push({name: 'existing tag a'});

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(7);

                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'tag2',
                            id: postJSON.tags[1].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'existing-tag-b',
                            id: tagJSON[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'tag3',
                            id: postJSON.tags[2].id
                        });
                        updatedPost.tags.should.have.enumerable(3).with.property('name', 'betty');
                        updatedPost.tags.should.have.enumerable(4).with.properties({
                            name: 'tag1',
                            id: postJSON.tags[0].id
                        });
                        updatedPost.tags.should.have.enumerable(5).with.property('name', 'bob');
                        updatedPost.tags.should.have.enumerable(6).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });

                        done();
                    }).catch(done);
                });
            });
        });

        describe('Posts with NO tags', function () {
            var postJSON,
                tagJSON,
                editOptions,
                createTag = testUtils.DataGenerator.forKnex.createTag;

            beforeEach(function (done) {
                tagJSON = [];

                var post = _.cloneDeep(testUtils.DataGenerator.forModel.posts[0]),
                    extraTag1 = createTag({name: 'existing tag a'}),
                    extraTag2 = createTag({name: 'existing-tag-b'}),
                    extraTag3 = createTag({name: 'existing_tag_c'});

                return Promise.props({
                    post: PostModel.add(post, _.extend({}, context, {withRelated: ['tags']})),
                    tag1: TagModel.add(extraTag1, context),
                    tag2: TagModel.add(extraTag2, context),
                    tag3: TagModel.add(extraTag3, context)
                }).then(function (result) {
                    postJSON = result.post.toJSON({include: ['tags']});
                    tagJSON.push(result.tag1.toJSON());
                    tagJSON.push(result.tag2.toJSON());
                    tagJSON.push(result.tag3.toJSON());
                    editOptions = _.extend({}, context, {id: postJSON.id, withRelated: ['tags']});

                    done();
                }).catch(done);
            });

            it('should create the test data correctly', function () {
                // creates two test tags
                should.exist(tagJSON);
                tagJSON.should.be.an.Array().with.lengthOf(3);
                tagJSON.should.have.enumerable(0).with.property('name', 'existing tag a');
                tagJSON.should.have.enumerable(1).with.property('name', 'existing-tag-b');
                tagJSON.should.have.enumerable(2).with.property('name', 'existing_tag_c');

                // creates a test post with no tags
                should.exist(postJSON);
                postJSON.title.should.eql('HTML Ipsum');
                should.exist(postJSON.tags);
            });

            describe('Adding brand new tags', function () {
                it('can add a single tag', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a single tag to the end of the array
                    newJSON.tags.push(createTag({name: 'tag1'}));

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(1);
                        updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag1');

                        done();
                    }).catch(done);
                });

                it('can add multiple tags', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a bunch of tags to the end of the array
                    newJSON.tags.push(createTag({name: 'tag1'}));
                    newJSON.tags.push(createTag({name: 'tag2'}));
                    newJSON.tags.push(createTag({name: 'tag3'}));
                    newJSON.tags.push(createTag({name: 'tag4'}));
                    newJSON.tags.push(createTag({name: 'tag5'}));

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(5);
                        updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag1');
                        updatedPost.tags.should.have.enumerable(1).with.property('name', 'tag2');
                        updatedPost.tags.should.have.enumerable(2).with.property('name', 'tag3');
                        updatedPost.tags.should.have.enumerable(3).with.property('name', 'tag4');
                        updatedPost.tags.should.have.enumerable(4).with.property('name', 'tag5');

                        done();
                    }).catch(done);
                });

                it('can add multiple tags with conflicting slugs', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add conflicting tags to the end of the array
                    newJSON.tags.push({name: 'C'});
                    newJSON.tags.push({name: 'C++'});
                    newJSON.tags.push({name: 'C#'});

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(3);
                        updatedPost.tags.should.have.enumerable(0).with.properties({name: 'C', slug: 'c'});
                        updatedPost.tags.should.have.enumerable(1).with.properties({name: 'C++', slug: 'c-2'});
                        updatedPost.tags.should.have.enumerable(2).with.properties({name: 'C#', slug: 'c-3'});

                        done();
                    }).catch(done);
                });
            });

            describe('Adding pre-existing tags', function () {
                it('can add a single tag', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a single pre-existing tag
                    newJSON.tags.push(tagJSON[0]);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(1);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });

                        done();
                    }).catch(done);
                });

                it('can add multiple tags', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add many preexisting tags
                    newJSON.tags.push(tagJSON[0]);
                    newJSON.tags.push(tagJSON[1]);
                    newJSON.tags.push(tagJSON[2]);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(3);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'existing-tag-b',
                            id: tagJSON[1].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'existing_tag_c',
                            id: tagJSON[2].id
                        });

                        done();
                    }).catch(done);
                });

                it('can add multiple tags in wrong order', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add tags to the array
                    newJSON.tags.push(tagJSON[2]);
                    newJSON.tags.push(tagJSON[0]);
                    newJSON.tags.push(tagJSON[1]);

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(3);
                        updatedPost.tags.should.have.enumerable(0).with.properties({
                            name: 'existing_tag_c',
                            id: tagJSON[2].id
                        });
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.properties({
                            name: 'existing-tag-b',
                            id: tagJSON[1].id
                        });

                        done();
                    }).catch(done);
                });
            });

            describe('Adding combinations', function () {
                it('can add a combination of new and pre-existing tags', function (done) {
                    var newJSON = _.cloneDeep(postJSON);

                    // Add a bunch of new and existing tags to the array
                    newJSON.tags.push({name: 'tag1'});
                    newJSON.tags.push({name: 'existing tag a'});
                    newJSON.tags.push({name: 'tag3'});
                    newJSON.tags.push({name: 'existing-tag-b'});
                    newJSON.tags.push({name: 'tag5'});
                    newJSON.tags.push({name: 'existing_tag_c'});

                    // Edit the post
                    return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                        updatedPost = updatedPost.toJSON({include: ['tags']});

                        updatedPost.tags.should.have.lengthOf(6);
                        updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag1');
                        updatedPost.tags.should.have.enumerable(1).with.properties({
                            name: 'existing tag a',
                            id: tagJSON[0].id
                        });
                        updatedPost.tags.should.have.enumerable(2).with.property('name', 'tag3');
                        updatedPost.tags.should.have.enumerable(3).with.properties({
                            name: 'existing-tag-b',
                            id: tagJSON[1].id
                        });
                        updatedPost.tags.should.have.enumerable(4).with.property('name', 'tag5');
                        updatedPost.tags.should.have.enumerable(5).with.properties({
                            name: 'existing_tag_c',
                            id: tagJSON[2].id
                        });

                        done();
                    }).catch(done);
                });
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
