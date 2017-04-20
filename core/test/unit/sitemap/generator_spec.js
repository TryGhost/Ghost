var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    validator = require('validator'),
    _ = require('lodash'),

    // Stuff we are testing
    api = require('../../../server/api'),
    utils = require('../../../server/utils'),
    BaseGenerator = require('../../../server/data/xml/sitemap/base-generator'),
    PostGenerator = require('../../../server/data/xml/sitemap/post-generator'),
    PageGenerator = require('../../../server/data/xml/sitemap/page-generator'),
    TagGenerator = require('../../../server/data/xml/sitemap/tag-generator'),
    UserGenerator = require('../../../server/data/xml/sitemap/user-generator'),

    sandbox = sinon.sandbox.create();

should.Assertion.add('ValidUrlNode', function (options) {
    // Check urlNode looks correct
    var urlNode = this.obj,
        flatNode;
    urlNode.should.be.an.Object().with.key('url');
    urlNode.url.should.be.an.Array();

    if (options.withImage) {
        urlNode.url.should.have.lengthOf(5);
    } else {
        urlNode.url.should.have.lengthOf(4);
    }

    /**
     * A urlNode looks something like:
     * { url:
     *   [ { loc: 'http://127.0.0.1:2369/author/' },
     *     { lastmod: '2014-12-22T11:54:00.100Z' },
     *     { changefreq: 'weekly' },
     *     { priority: 0.6 },
     *     { 'image:image': [
     *       { 'image:loc': 'post-100.jpg' },
     *       { 'image:caption': 'post-100.jpg' }
     *     ] }
     *  ] }
     */
    flatNode = _.extend.apply(_, urlNode.url);

    if (options.withImage) {
        flatNode.should.be.an.Object().with.keys('loc', 'lastmod', 'changefreq', 'priority', 'image:image');
    } else {
        flatNode.should.be.an.Object().with.keys('loc', 'lastmod', 'changefreq', 'priority');
    }
});

describe('Generators', function () {
    var stubUrl = function (generator) {
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
                created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + id,
                visibility: 'public'
            };
        },
        generator;

    afterEach(function () {
        sandbox.restore();
    });

    describe('BaseGenerator', function () {
        beforeEach(function () {
            generator = new BaseGenerator();
        });

        it('can initialize with empty siteMapContent', function (done) {
            generator.init().then(function () {
                should.exist(generator.siteMapContent);

                validator.contains(generator.siteMapContent, '<loc>').should.equal(false);

                done();
            }).catch(done);
        });

        it('can initialize with non-empty siteMapContent', function (done) {
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

                generator.siteMapContent.should.containEql('<loc>http://my-ghost-blog.com/url/100</loc>');
                generator.siteMapContent.should.containEql('<loc>http://my-ghost-blog.com/url/200</loc>');
                generator.siteMapContent.should.containEql('<loc>http://my-ghost-blog.com/url/300</loc>');

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
        beforeEach(function () {
            generator = new PostGenerator();
        });

        it('uses 0.9 priority for featured posts', function () {
            generator.getPriorityForDatum({
                featured: true
            }).should.equal(0.9);
        });

        it('uses 0.8 priority for all other (non-featured) posts', function () {
            generator.getPriorityForDatum({
                featured: false
            }).should.equal(0.8);
        });

        it('does not create a node for a post with visibility that is not public', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                visibility: 'private',
                page: false
            }));

            urlNode.should.be.false();
        });

        it('does not create a node for a page', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                page: true
            }));

            urlNode.should.be.false();
        });

        it('adds an image:image element if post has a cover image', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                feature_image: 'post-100.jpg',
                page: false
            }));

            urlNode.should.be.a.ValidUrlNode({withImage: true});
        });

        it('can initialize with non-empty siteMapContent', function (done) {
            stubUrl(generator);

            sandbox.stub(generator, 'getData', function () {
                return Promise.resolve([
                    _.extend(makeFakeDatum(100), {
                        feature_image: 'post-100.jpg',
                        page: false
                    }),
                    _.extend(makeFakeDatum(200), {
                        page: false
                    }),
                    _.extend(makeFakeDatum(300), {
                        feature_image: 'post-300.jpg',
                        page: false
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

                generator.siteMapContent.should.containEql('<loc>http://my-ghost-blog.com/url/100</loc>');
                generator.siteMapContent.should.containEql('<loc>http://my-ghost-blog.com/url/200</loc>');
                generator.siteMapContent.should.containEql('<loc>http://my-ghost-blog.com/url/300</loc>');

                generator.siteMapContent.should.containEql('<image:loc>http://my-ghost-blog.com/images/post-100.jpg</image:loc>');
                // This should NOT be present
                generator.siteMapContent.should.not.containEql('<image:loc>http://my-ghost-blog.com/images/post-200.jpg</image:loc>');
                generator.siteMapContent.should.containEql('<image:loc>http://my-ghost-blog.com/images/post-300.jpg</image:loc>');

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
        beforeEach(function () {
            generator = new PageGenerator();
        });

        it('has a home item even if pages are empty', function (done) {
            // Fake the api call to return no posts
            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({posts: []});
            });

            generator.init().then(function () {
                should.exist(generator.siteMapContent);

                generator.siteMapContent.should.containEql('<loc>' + utils.url.urlFor('home', true) + '</loc>');
                // <loc> should exist exactly one time
                generator.siteMapContent.indexOf('<loc>').should.eql(generator.siteMapContent.lastIndexOf('<loc>'));

                done();
            }).catch(done);
        });

        it('has a home item when pages are not empty', function (done) {
            // Fake the api call to return no posts
            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({
                    posts: [_.extend(makeFakeDatum(100), {
                        page: true,
                        url: 'magic'
                    })]
                });
            });

            generator.init().then(function () {
                should.exist(generator.siteMapContent);

                generator.siteMapContent.should.containEql('<loc>' + utils.url.urlFor('home', true) + '</loc>');
                generator.siteMapContent.should.containEql('<loc>' + utils.url.urlFor('page', {url: 'magic'}, true) + '</loc>');

                done();
            }).catch(done);
        });

        it('uses 1 priority for home page', function () {
            generator.getPriorityForDatum({
                name: 'home'
            }).should.equal(1);
        });
        it('uses 0.8 priority for static pages', function () {
            generator.getPriorityForDatum({}).should.equal(0.8);
        });

        it('does not create a node for a page with visibility that is not public', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                visibility: 'internal',
                page: true
            }));

            urlNode.should.be.false();
        });

        it('does not create a node for a post', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                page: false
            }));

            urlNode.should.be.false();
        });

        it('adds an image:image element if page has an image', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                feature_image: 'page-100.jpg',
                page: true
            }));

            urlNode.should.be.a.ValidUrlNode({withImage: true});
        });
    });

    describe('TagGenerator', function () {
        beforeEach(function () {
            generator = new TagGenerator();
        });

        it('uses 0.6 priority for all tags', function () {
            generator.getPriorityForDatum({}).should.equal(0.6);
        });

        it('does not create a node for a tag with visibility that is not public', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                visibility: 'internal'
            }));

            urlNode.should.be.false();
        });

        it('adds an image:image element if tag has an image', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                feature_image: 'tag-100.jpg'
            }));

            urlNode.should.be.a.ValidUrlNode({withImage: true});
        });
    });

    describe('UserGenerator', function () {
        beforeEach(function () {
            generator = new UserGenerator();
        });

        it('uses 0.6 priority for author links', function () {
            generator.getPriorityForDatum({}).should.equal(0.6);
        });

        it('does not create a node for invited users', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                cover: 'user-100.jpg',
                status: 'invited'
            }));

            urlNode.should.be.false();
        });

        it('does not create a node for a user with visibility that is not public', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                cover_image: 'user-100.jpg',
                status: 'active',
                visibility: 'notpublic'
            }));

            urlNode.should.be.false();
        });

        it('adds an image:image element if user has a cover image', function () {
            var urlNode = generator.createUrlNodeFromDatum(_.extend(makeFakeDatum(100), {
                cover_image: '/content/images/2016/01/user-100.jpg',
                status: 'active'
            }));

            urlNode.should.be.a.ValidUrlNode({withImage: true});
        });
    });
});
