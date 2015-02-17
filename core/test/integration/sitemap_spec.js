/*globals describe, before, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../utils/index'),
    _           = require('lodash'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    validator   = require('validator'),

    // Stuff we are testing
    SiteMapManager = require('../../server/data/sitemap/manager'),
    BaseGenerator = require('../../server/data/sitemap/base-generator'),
    PostGenerator = require('../../server/data/sitemap/post-generator'),
    PageGenerator = require('../../server/data/sitemap/page-generator'),
    TagGenerator = require('../../server/data/sitemap/tag-generator'),
    UserGenerator = require('../../server/data/sitemap/user-generator'),

    sandbox = sinon.sandbox.create();

describe('Sitemap', function () {
    var makeStubManager = function () {
        return new SiteMapManager({
            pages: {
                init: sandbox.stub().returns(Promise.resolve()),
                addUrl: sandbox.stub(),
                removeUrl: sandbox.stub(),
                updateUrl: sandbox.stub()
            },
            posts: {
                init: sandbox.stub().returns(Promise.resolve()),
                addUrl: sandbox.stub(),
                removeUrl: sandbox.stub(),
                updateUrl: sandbox.stub()
            },
            authors: {
                init: sandbox.stub().returns(Promise.resolve()),
                addUrl: sandbox.stub(),
                removeUrl: sandbox.stub(),
                updateUrl: sandbox.stub()
            },
            tags: {
                init: sandbox.stub().returns(Promise.resolve()),
                addUrl: sandbox.stub(),
                removeUrl: sandbox.stub(),
                updateUrl: sandbox.stub()
            },
            index: {
                init: sandbox.stub().returns(Promise.resolve()),
                addUrl: sandbox.stub(),
                removeUrl: sandbox.stub(),
                updateUrl: sandbox.stub()
            }
        });
    };

    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
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

        it('responds to calls before being initialized', function () {
            var manager = makeStubManager();

            manager.initialized.should.equal(false);

            manager.getIndexXml();
            manager.getSiteMapXml();
            manager.pageAdded();
            manager.pages.addUrl.called.should.equal(false);
            manager.pageEdited();
            manager.pageDeleted();
            manager.postAdded();
            manager.pages.addUrl.called.should.equal(false);
            manager.postEdited();
            manager.postDeleted();
            manager.userAdded();
            manager.pages.addUrl.called.should.equal(false);
            manager.userEdited();
            manager.userDeleted();
            manager.tagAdded();
            manager.pages.addUrl.called.should.equal(false);
            manager.tagEdited();
            manager.tagDeleted();
            manager.permalinksUpdated();

            manager.initialized.should.equal(false);
        });

        it('updates page site map', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'published'
                    }),
                    get: sandbox.stub().returns('published'),
                    updated: sandbox.stub().returns('published')
                };

            manager.init().then(function () {
                manager.pageAdded(fake);
                manager.pages.addUrl.called.should.equal(true);
                manager.pageEdited(fake);
                manager.pages.updateUrl.called.should.equal(true);
                manager.pageDeleted(fake);
                manager.pages.removeUrl.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('adds pages that were published', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'published'
                    }),
                    get: sandbox.stub().returns('published'),
                    updated: sandbox.stub().returns('draft')
                };

            manager.init().then(function () {
                manager.pageAdded = sandbox.stub();

                manager.pageEdited(fake);

                manager.pages.updateUrl.called.should.equal(false);
                manager.pageAdded.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('doesn\'t add draft pages', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'draft'
                    }),
                    get: sandbox.stub().returns('draft'),
                    updated: sandbox.stub().returns('draft')
                };

            manager.init().then(function () {
                manager.pageAdded(fake);

                manager.pages.addUrl.called.should.equal(false);

                done();
            }).catch(done);
        });

        it('deletes pages that were unpublished', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'draft'
                    }),
                    get: sandbox.stub().returns('draft'),
                    updated: sandbox.stub().returns('published')
                };

            manager.init().then(function () {
                manager.pageAdded = sandbox.stub();
                manager.pageDeleted = sandbox.stub();

                manager.pageEdited(fake);

                manager.pages.updateUrl.called.should.equal(false);
                manager.pageAdded.called.should.equal(false);
                manager.pageDeleted.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('updates post site map', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'published'
                    }),
                    get: sandbox.stub().returns('published'),
                    updated: sandbox.stub().returns('published')
                };

            manager.init().then(function () {
                manager.postAdded(fake);
                manager.posts.addUrl.called.should.equal(true);
                manager.postEdited(fake);
                manager.posts.updateUrl.called.should.equal(true);
                manager.postDeleted(fake);
                manager.posts.removeUrl.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('adds posts that were published', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'published'
                    }),
                    get: sandbox.stub().returns('published'),
                    updated: sandbox.stub().returns('draft')
                };

            manager.init().then(function () {
                manager.postAdded = sandbox.stub();

                manager.postEdited(fake);

                manager.posts.updateUrl.called.should.equal(false);
                manager.postAdded.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('doesn\'t add draft posts', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'draft'
                    }),
                    get: sandbox.stub().returns('draft'),
                    updated: sandbox.stub().returns('draft')
                };

            manager.init().then(function () {
                manager.postAdded(fake);
                manager.posts.addUrl.called.should.equal(false);

                done();
            }).catch(done);
        });

        it('deletes posts that were unpublished', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({
                        status: 'draft'
                    }),
                    get: sandbox.stub().returns('draft'),
                    updated: sandbox.stub().returns('published')
                };

            manager.init().then(function () {
                manager.postAdded = sandbox.stub();
                manager.postDeleted = sandbox.stub();

                manager.postEdited(fake);

                manager.posts.updateUrl.called.should.equal(false);
                manager.postAdded.called.should.equal(false);
                manager.postDeleted.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('updates authors site map', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({})
                };

            manager.init().then(function () {
                manager.userAdded(fake);
                manager.authors.addUrl.called.should.equal(true);
                manager.userEdited(fake);
                manager.authors.updateUrl.called.should.equal(true);
                manager.userDeleted(fake);
                manager.authors.removeUrl.called.should.equal(true);

                done();
            }).catch(done);
        });

        it('updates tags site map', function (done) {
            var manager = makeStubManager(),
                fake = {
                    toJSON: sandbox.stub().returns({})
                };

            manager.init().then(function () {
                manager.tagAdded(fake);
                manager.tags.addUrl.called.should.equal(true);
                manager.tagEdited(fake);
                manager.tags.updateUrl.called.should.equal(true);
                manager.tagDeleted(fake);
                manager.tags.removeUrl.called.should.equal(true);

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
