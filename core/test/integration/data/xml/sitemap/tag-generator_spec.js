var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    testUtils = require('../../../../utils'),
    events = require('../../../../../server/events'),
    models = require('../../../../../server/models'),
    SiteMapGenerator = require('../../../../../server/data/xml/sitemap/manager'),
    sandbox = sinon.sandbox.create(),
    sitemap;

should.equal(true, true);

describe('Integration: Tag Generator', function () {
    var publishedPostsWithTags = [],
        publicTagsWithConnectedPosts = {};

    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });

    before(testUtils.teardown);
    beforeEach(testUtils.setup('default', 'perms:init', 'posts', 'users'));

    beforeEach(function () {
        sitemap = new SiteMapGenerator();

        // do not initialise the other generators
        sandbox.stub(sitemap.authors, 'init').returns(Promise.resolve());
        sandbox.stub(sitemap.pages, 'init').returns(Promise.resolve());
        sandbox.stub(sitemap.posts, 'init').returns(Promise.resolve());

        return sitemap.init();
    });

    beforeEach(function () {
        publicTagsWithConnectedPosts = {};
        publishedPostsWithTags = [];

        return models.Post.findAll({status: 'published', include: ['tags']})
            .then(function (postModels) {
                // there are four posts, which have posts connected
                var publishedPostsWithTagsExpected = 4;

                _.each(postModels.models, function (postModel) {
                    if (postModel.related('tags').length) {
                        publishedPostsWithTags.push(postModel);
                        _.each(postModel.related('tags').models, function (tagModel) {
                            if (tagModel.get('visibility') === 'public') {
                                publicTagsWithConnectedPosts[tagModel.id] = tagModel;
                            }
                        });
                    }
                });

                publishedPostsWithTagsExpected.should.eql(publishedPostsWithTags.length);
            });
    });

    afterEach(function () {
        events.removeAllListeners();
    });

    it('initial tag state', function () {
        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length);
    });

    it('unpublish a post: expect removal of tag url', function (done) {
        var timeout;
        sandbox.spy(sitemap.tags, 'removeUrl');

        models.Post.edit({status: 'draft'}, {id: publishedPostsWithTags[3].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.removeUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length - 1);
                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('publish a new post with existing tag, which is already visible', function (done) {
        var timeout;
        sandbox.spy(sitemap.tags, 'addOrUpdateUrl');

        models.Post.add({status: 'draft'}, testUtils.context.internal)
            .then(function (postModel) {
                return models.Post.edit({
                    status: 'published',
                    tags: [{name: testUtils.DataGenerator.forKnex.tags[0].name}]
                }, {id: postModel.id});
            })
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.addOrUpdateUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length);
                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('tag get\'s deleted from tag management', function (done) {
        var timeout;
        sandbox.spy(sitemap.tags, 'removeUrl');

        models.Tag.destroy({id: testUtils.DataGenerator.forKnex.tags[0].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.removeUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length - 1);

                        _.each(publishedPostsWithTags, function (postModel) {
                            _.each(postModel.related('tags').models, function (tagModel) {
                                // should not appear in the sitemap anymore
                                if (tagModel.get('slug') === testUtils.DataGenerator.forKnex.tags[0].slug) {
                                    (sitemap.getSiteMapXml('tags').match(new RegExp(tagModel.get('slug'))) === null).should.eql(true);
                                } else {
                                    (sitemap.getSiteMapXml('tags').match(new RegExp(tagModel.get('slug'))) !== null).should.eql(true);
                                }
                            });
                        });

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('Tag name get\'s updated and has > 0 posts connected', function (done) {
        var timeout,
            newTagSlug = 'tag-slug-change',
            oldTagSlug = testUtils.DataGenerator.forKnex.tags[0].slug;

        (sitemap.getSiteMapXml('tags').match(new RegExp(oldTagSlug)) !== null).should.eql(true);

        sandbox.spy(sitemap.tags, 'addOrUpdateUrl');

        models.Tag.edit({slug: newTagSlug}, {id: testUtils.DataGenerator.forKnex.tags[0].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.addOrUpdateUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(oldTagSlug)) === null).should.eql(true);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(newTagSlug)) !== null).should.eql(true);

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('Tag name get\'s updated and has 0 posts connected', function (done) {
        var timeout,
            newTagSlug = 'tag-slug-change',
            oldTagSlug = testUtils.DataGenerator.forKnex.tags[3].slug;

        // not present in sitemap, correct
        (sitemap.getSiteMapXml('tags').match(new RegExp(oldTagSlug)) === null).should.eql(true);

        sandbox.spy(sitemap.tags, 'removeUrl');

        models.Tag.edit({slug: newTagSlug}, {id: testUtils.DataGenerator.forKnex.tags[3].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.removeUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(oldTagSlug)) === null).should.eql(true);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(newTagSlug)) === null).should.eql(true);

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('Tag was public and is now internal, has 1 post connected', function (done) {
        var timeout,
            affectedTagSlug = testUtils.DataGenerator.forKnex.tags[2].slug,
            connectedPosts = 0;

        // tag is public and present in sitemap, correct
        (sitemap.getSiteMapXml('tags').match(new RegExp(affectedTagSlug)) !== null).should.eql(true);

        _.each(publishedPostsWithTags, function (postModel) {
            _.each(postModel.related('tags').models, function (tagModel) {
                // should not appear in the sitemap anymore
                if (tagModel.get('slug') === affectedTagSlug) {
                    connectedPosts = connectedPosts + 1;
                }
            });
        });

        // has 1 post connected, correct
        connectedPosts.should.eql(1);

        sandbox.spy(sitemap.tags, 'removeUrl');

        models.Tag.edit({visibility: 'internal'}, {id: testUtils.DataGenerator.forKnex.tags[2].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.removeUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length - 1);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(affectedTagSlug)) === null).should.eql(true);

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('public tag get\'s detached from published post', function (done) {
        var timeout,
            affectedTagSlug = testUtils.DataGenerator.forKnex.tags[2].slug,
            connectedPosts = [];

        // tag is public and present in sitemap, correct
        (sitemap.getSiteMapXml('tags').match(new RegExp(affectedTagSlug)) !== null).should.eql(true);

        _.each(publishedPostsWithTags, function (postModel) {
            _.each(postModel.related('tags').models, function (tagModel) {
                // should not appear in the sitemap anymore
                if (tagModel.get('slug') === affectedTagSlug) {
                    connectedPosts.push(postModel);
                }
            });
        });

        // has 1 post connected, correct
        connectedPosts.length.should.eql(1);

        sandbox.spy(sitemap.tags, 'removeUrl');

        // detach all tags
        models.Post.edit({tags: []}, {id: connectedPosts[0].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.removeUrl.calledOnce) {
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length - 1);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(affectedTagSlug)) === null).should.eql(true);

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('public tag get\'s detached from published post, but has another post connection', function (done) {
        var timeout,
            affectedTagSlug = testUtils.DataGenerator.forKnex.tags[0].slug,
            connectedPosts = [];

        // tag is public and present in sitemap, correct
        (sitemap.getSiteMapXml('tags').match(new RegExp(affectedTagSlug)) !== null).should.eql(true);

        _.each(publishedPostsWithTags, function (postModel) {
            _.each(postModel.related('tags').models, function (tagModel) {
                // should not appear in the sitemap anymore
                if (tagModel.get('slug') === affectedTagSlug) {
                    connectedPosts.push(postModel);
                }
            });
        });

        // has 2 post connected, correct
        connectedPosts.length.should.eql(2);

        sandbox.spy(sitemap.tags, 'addOrUpdateUrl');
        sandbox.spy(sitemap.tags, 'removeUrl');

        // detach all tags from first post
        models.Post.edit({tags: []}, {id: connectedPosts[0].id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.tags.addOrUpdateUrl.calledOnce) {
                        sitemap.tags.removeUrl.called.should.eql(false);
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(affectedTagSlug)) !== null).should.eql(true);

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('public tag get\'s attached to published post, expect new tag url', function (done) {
        var timeout,
            newTag = {slug: 'hello-ghost', name: 'hello ghost'},
            connectedPosts = 0,
            addToPublishedPost = publishedPostsWithTags[0],
            existingTags = addToPublishedPost.related('tags').toJSON();

        // not present, as it's a new tag
        (sitemap.getSiteMapXml('tags').match(new RegExp(newTag.slug)) === null).should.eql(true);

        _.each(publishedPostsWithTags, function (postModel) {
            _.each(postModel.related('tags').models, function (tagModel) {
                if (tagModel.get('slug') === newTag.slug) {
                    connectedPosts.push(postModel);
                }
            });
        });

        // has 0 post connected, correct
        connectedPosts.should.eql(0);

        sandbox.spy(sitemap.tags, 'addOrUpdateUrl');
        sandbox.spy(sitemap.tags, 'removeUrl');

        // attach new post
        models.Post.edit({tags: [newTag].concat(existingTags)}, {id: addToPublishedPost.id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    // right now the sitemap generator does not compare existing tag url! see @TODO in base-generator
                    if (sitemap.tags.addOrUpdateUrl.callCount === existingTags.length + 1) {
                        sitemap.tags.removeUrl.called.should.eql(false);
                        sitemap.getSiteMapXml('tags').match(/<url>/gi).length.should.eql(Object.keys(publicTagsWithConnectedPosts).length + 1);
                        (sitemap.getSiteMapXml('tags').match(new RegExp(newTag.slug)) !== null).should.eql(true);

                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });
});
