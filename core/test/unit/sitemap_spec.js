/*globals describe, afterEach, it */
/*jshint expr:true*/
var _           = require('lodash'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    validator   = require('validator'),

    // Stuff we are testing
    events         = require('../../server/events'),
    SiteMapManager = require('../../server/data/xml/sitemap/manager'),
    BaseGenerator  = require('../../server/data/xml/sitemap/base-generator'),
    PostGenerator  = require('../../server/data/xml/sitemap/post-generator'),
    PageGenerator  = require('../../server/data/xml/sitemap/page-generator'),
    TagGenerator   = require('../../server/data/xml/sitemap/tag-generator'),
    UserGenerator  = require('../../server/data/xml/sitemap/user-generator'),

    sandbox = sinon.sandbox.create();

describe('Sitemap', function () {
    var makeStubManager = function () {
        var posts, pages, tags, authors;
        sandbox.stub(PostGenerator.prototype, 'refreshAll').returns(Promise.resolve());
        sandbox.stub(PageGenerator.prototype, 'refreshAll').returns(Promise.resolve());
        sandbox.stub(TagGenerator.prototype, 'refreshAll').returns(Promise.resolve());
        sandbox.stub(UserGenerator.prototype, 'refreshAll').returns(Promise.resolve());

        posts = new PostGenerator();
        pages = new PageGenerator();
        tags = new TagGenerator();
        authors = new UserGenerator();

        sandbox.spy(posts, 'init');
        sandbox.spy(pages, 'init');
        sandbox.spy(tags, 'init');
        sandbox.spy(authors, 'init');

        sandbox.stub(posts, 'addOrUpdateUrl');
        sandbox.stub(pages, 'addOrUpdateUrl');
        sandbox.stub(tags, 'addOrUpdateUrl');
        sandbox.stub(authors, 'addOrUpdateUrl');

        sandbox.stub(posts, 'removeUrl');
        sandbox.stub(pages, 'removeUrl');
        sandbox.stub(tags, 'removeUrl');
        sandbox.stub(authors, 'removeUrl');

        return new SiteMapManager({posts: posts, pages: pages, tags: tags, authors: authors});
    };

    afterEach(function () {
        sandbox.restore();
        events.removeAllListeners();
    });

    describe('SiteMapManager', function () {
        should.exist(SiteMapManager);

        it('can create a SiteMapManager instance', function () {
            var manager = makeStubManager();

            should.exist(manager);
        });

        it('can initialize', function (done) {
            var manager = makeStubManager();

            manager.initialized.should.equal(false);
            manager.init().then(function () {
                manager.posts.init.called.should.equal(true);
                manager.pages.init.called.should.equal(true);
                manager.authors.init.called.should.equal(true);
                manager.tags.init.called.should.equal(true);

                manager.initialized.should.equal(true);

                done();
            }).catch(done);
        });

        it('updates page site map correctly', function (done) {
            var manager = makeStubManager(),
                fake = sandbox.stub();

            manager.init().then(function () {
                events.on('page.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // page add events are ignored, as these are drafts
                    manager.pages.addOrUpdateUrl.called.should.equal(false);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.edited', function () {
                    // page edit events are ignored, as these are drafts
                    manager.pages.addOrUpdateUrl.called.should.equal(false);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.published', function () {
                    // page published events are when a url gets added
                    manager.pages.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.published.edited', function () {
                    // page published.edited events are when a url gets updated
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.deleted', function () {
                    // page deleted events are ignored, as unpublished will be called if the page was published
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.unpublished', function () {
                    // page unpublished events are when a url gets removed
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('page.added', fake);
                events.emit('page.edited', fake);
                events.emit('page.published', fake);
                events.emit('page.published.edited', fake);
                events.emit('page.deleted', fake);
                events.emit('page.unpublished', fake);

                done();
            }).catch(done);
        });

        it('updates post site map', function (done) {
            var manager = makeStubManager(),
                fake = sandbox.stub();

            manager.init().then(function () {
                events.on('post.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // post add events are ignored, as these are drafts
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.edited', function () {
                    // post edit events are ignored, as these are drafts
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.published', function () {
                    // post published events are when a url gets added
                    manager.posts.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.published.edited', function () {
                    // post published.edited events are when a url gets updated
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.deleted', function () {
                    // post deleted events are ignored, as unpublished will be called if the post was published
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.unpublished', function () {
                    // post unpublished events are when a url gets removed
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('post.added', fake);
                events.emit('post.edited', fake);
                events.emit('post.published', fake);
                events.emit('post.published.edited', fake);
                events.emit('post.deleted', fake);
                events.emit('post.unpublished', fake);

                done();
            }).catch(done);
        });

        it('doesn\'t add posts until they are published', function (done) {
            var manager = makeStubManager(),
                fake = sandbox.stub();

            manager.init().then(function () {
                events.on('post.added', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                events.on('post.edited', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                events.on('post.published', function () {
                    manager.posts.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                events.emit('post.added', fake);
                events.emit('post.edited', fake);
                events.emit('post.published', fake);

                done();
            }).catch(done);
        });

        it('deletes posts that were unpublished', function (done) {
            var manager = makeStubManager(),
                fake = sandbox.stub();

            manager.init().then(function () {
                events.on('post.unpublished', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('post.unpublished', fake);

                done();
            }).catch(done);
        });

        it('updates authors site map', function (done) {
            var manager = makeStubManager(),
                fake = sandbox.stub();

            manager.init().then(function () {
                events.on('user.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // user added is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.called.should.equal(false);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                events.on('user.edited', function () {
                    // user edited is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.called.should.equal(false);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                events.on('user.activated', function () {
                    // user activated is the point we know the user can be added
                    manager.authors.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                events.on('user.activated.edited', function () {
                    // user activated.edited means we can be sure the user is active
                    manager.authors.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                events.on('user.deleted', function () {
                    // user deleted is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                events.on('user.deactivated', function () {
                    // user deleted is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.authors.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('user.added', fake);
                events.emit('user.edited', fake);
                events.emit('user.activated', fake);
                events.emit('user.activated.edited', fake);
                events.emit('user.deleted', fake);
                events.emit('user.deactivated', fake);

                done();
            }).catch(done);
        });

        it('updates tags site map', function (done) {
            var manager = makeStubManager(),
                fake = sandbox.stub();

            manager.init().then(function () {
                events.on('tag.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    manager.tags.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.tags.removeUrl.called.should.equal(false);
                });
                events.on('tag.edited', function () {
                    manager.tags.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.tags.removeUrl.called.should.equal(false);
                });
                events.on('tag.deleted', function () {
                    manager.tags.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.tags.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('tag.added', fake);
                events.emit('tag.edited', fake);
                events.emit('tag.deleted', fake);

                done();
            }).catch(done);
        });
    });

    describe('Generators', function () {
        var stubPermalinks = function (generator) {
                sandbox.stub(generator, 'getPermalinksValue', function () {
                    return Promise.resolve({
                        id: 13,
                        uuid: 'ac6d6bb2-0b64-4941-b5ef-e69000bb738a',
                        key: 'permalinks',
                        value: '/:slug/',
                        type: 'blog'
                    });
                });

                return generator;
            },
            stubUrl = function (generator) {
                sandbox.stub(generator, 'getUrlForDatum', function (datum) {
                    return 'http://my-ghost-blog.com/url/' + datum.id;
                });
                sandbox.stub(generator, 'getUrlForImage', function (image) {
                    return 'http://my-ghost-blog.com/images/' + image;
                });

                return generator;
            },
            makeFakeDatum = function (id) {
                return {
                    id: id,
                    created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + id
                };
            };

        describe('BaseGenerator', function () {
            it('can initialize with empty siteMapContent', function (done) {
                var generator = new BaseGenerator();

                stubPermalinks(generator);

                generator.init().then(function () {
                    should.exist(generator.siteMapContent);

                    validator.contains(generator.siteMapContent, '<loc>').should.equal(false);

                    done();
                }).catch(done);
            });

            it('can initialize with non-empty siteMapContent', function (done) {
                var generator = new BaseGenerator();

                stubPermalinks(generator);
                stubUrl(generator);

                sandbox.stub(generator, 'getData', function () {
                    return Promise.resolve([
                        makeFakeDatum(100),
                        makeFakeDatum(200),
                        makeFakeDatum(300)
                    ]);
                });

                generator.init().then(function () {
                    var idxFirst,
                        idxSecond,
                        idxThird;

                    should.exist(generator.siteMapContent);

                    // TODO: We should validate the contents against the XSD:
                    // xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    // xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"

                    validator.contains(generator.siteMapContent,
                        '<loc>http://my-ghost-blog.com/url/100</loc>').should.equal(true);
                    validator.contains(generator.siteMapContent,
                        '<loc>http://my-ghost-blog.com/url/200</loc>').should.equal(true);
                    validator.contains(generator.siteMapContent,
                        '<loc>http://my-ghost-blog.com/url/300</loc>').should.equal(true);

                    // Validate order newest to oldest
                    idxFirst = generator.siteMapContent.indexOf('<loc>http://my-ghost-blog.com/url/300</loc>');
                    idxSecond = generator.siteMapContent.indexOf('<loc>http://my-ghost-blog.com/url/200</loc>');
                    idxThird = generator.siteMapContent.indexOf('<loc>http://my-ghost-blog.com/url/100</loc>');

                    idxFirst.should.be.below(idxSecond);
                    idxSecond.should.be.below(idxThird);

                    done();
                }).catch(done);
            });
        });

        describe('PostGenerator', function () {
            it('uses 0.9 priority for featured posts', function () {
                var generator = new PostGenerator();

                generator.getPriorityForDatum({
                    featured: true
                }).should.equal(0.9);
            });

            it('uses 0.8 priority for all other (non-featured) posts', function () {
                var generator = new PostGenerator();

                generator.getPriorityForDatum({
                    featured: false
                }).should.equal(0.8);
            });

            it('adds an image:image element if post has a cover image', function () {
                var generator = new PostGenerator(),
                    urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                        image: 'post-100.jpg'
                    })),
                    hasImage;

                hasImage = _.any(urlNode.url, function (node) {
                    return !_.isUndefined(node['image:image']);
                });

                hasImage.should.equal(true);
            });

            it('can initialize with non-empty siteMapContent', function (done) {
                var generator = new PostGenerator();

                stubPermalinks(generator);
                stubUrl(generator);

                sandbox.stub(generator, 'getData', function () {
                    return Promise.resolve([
                        _.extend(makeFakeDatum(100), {
                            image: 'post-100.jpg'
                        }),
                        makeFakeDatum(200),
                        _.extend(makeFakeDatum(300), {
                            image: 'post-300.jpg'
                        })
                    ]);
                });

                generator.init().then(function () {
                    var idxFirst,
                        idxSecond,
                        idxThird;

                    should.exist(generator.siteMapContent);

                    // TODO: We should validate the contents against the XSD:
                    // xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    // xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"

                    validator.contains(generator.siteMapContent,
                        '<loc>http://my-ghost-blog.com/url/100</loc>').should.equal(true);
                    validator.contains(generator.siteMapContent,
                        '<loc>http://my-ghost-blog.com/url/200</loc>').should.equal(true);
                    validator.contains(generator.siteMapContent,
                        '<loc>http://my-ghost-blog.com/url/300</loc>').should.equal(true);

                    validator.contains(generator.siteMapContent,
                        '<image:loc>http://my-ghost-blog.com/images/post-100.jpg</image:loc>')
                        .should.equal(true);
                    // This should NOT be present
                    validator.contains(generator.siteMapContent,
                        '<image:loc>http://my-ghost-blog.com/images/post-200.jpg</image:loc>')
                        .should.equal(false);
                    validator.contains(generator.siteMapContent,
                        '<image:loc>http://my-ghost-blog.com/images/post-300.jpg</image:loc>')
                        .should.equal(true);

                    // Validate order newest to oldest
                    idxFirst = generator.siteMapContent.indexOf('<loc>http://my-ghost-blog.com/url/300</loc>');
                    idxSecond = generator.siteMapContent.indexOf('<loc>http://my-ghost-blog.com/url/200</loc>');
                    idxThird = generator.siteMapContent.indexOf('<loc>http://my-ghost-blog.com/url/100</loc>');

                    idxFirst.should.be.below(idxSecond);
                    idxSecond.should.be.below(idxThird);

                    done();
                }).catch(done);
            });
        });

        describe('PageGenerator', function () {
            it('uses 1 priority for home page', function () {
                var generator = new PageGenerator();

                generator.getPriorityForDatum({
                    name: 'home'
                }).should.equal(1);
            });
            it('uses 0.8 priority for static pages', function () {
                var generator = new PageGenerator();

                generator.getPriorityForDatum({}).should.equal(0.8);
            });
        });

        describe('TagGenerator', function () {
            it('uses 0.6 priority for all tags', function () {
                var generator = new TagGenerator();

                generator.getPriorityForDatum({}).should.equal(0.6);
            });
        });

        describe('UserGenerator', function () {
            it('uses 0.6 priority for author links', function () {
                var generator = new UserGenerator();

                generator.getPriorityForDatum({}).should.equal(0.6);
            });
        });
    });
});
