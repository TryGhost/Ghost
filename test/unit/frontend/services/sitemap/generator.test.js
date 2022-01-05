const should = require('should');
const sinon = require('sinon');
const ObjectId = require('bson-objectid');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const urlUtils = require('../../../../../core/shared/url-utils');
const IndexGenerator = require('../../../../../core/frontend/services/sitemap/index-generator');
const PostGenerator = require('../../../../../core/frontend/services/sitemap/post-generator');
const PageGenerator = require('../../../../../core/frontend/services/sitemap/page-generator');
const TagGenerator = require('../../../../../core/frontend/services/sitemap/tag-generator');
const UserGenerator = require('../../../../../core/frontend/services/sitemap/user-generator');

should.Assertion.add('ValidUrlNode', function (options) {
    // Check urlNode looks correct
    /*eslint no-invalid-this: "off"*/
    let urlNode = this.obj;
    let flatNode;

    urlNode.should.be.an.Object().with.key('url');
    urlNode.url.should.be.an.Array();

    if (options.withImage) {
        urlNode.url.should.have.lengthOf(3);
    } else {
        urlNode.url.should.have.lengthOf(2);
    }

    /**
     * A urlNode looks something like:
     * { url:
     *   [ { loc: 'http://127.0.0.1:2369/author/' },
     *     { lastmod: '2014-12-22T11:54:00.100Z' },
     *     { 'image:image': [
     *       { 'image:loc': 'post-100.jpg' },
     *       { 'image:caption': 'post-100.jpg' }
     *     ] }
     *  ] }
     */
    flatNode = _.extend.apply(_, urlNode.url);

    if (options.withImage) {
        flatNode.should.be.an.Object().with.keys('loc', 'lastmod', 'image:image');
    } else {
        flatNode.should.be.an.Object().with.keys('loc', 'lastmod');
    }
});

describe('Generators', function () {
    let generator;

    afterEach(function () {
        sinon.restore();
    });

    it('max node setting results in the right number of nodes', function () {
        generator = new PostGenerator({maxPerPage: 5});

        for (let i = 0; i < 10; i++) {
            generator.addUrl(`http://my-ghost-blog.com/episode-${i}/`, testUtils.DataGenerator.forKnex.createPost({
                created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 200,
                updated_at: null,
                published_at: null,
                slug: `episode-${i}`
            }));
        }

        generator.getXml();

        // We end up with 10 nodes
        Object.keys(generator.nodeLookup).should.be.Array().with.lengthOf(10);

        // But only 5 are output in the xml
        generator.siteMapContent.get(1).match(/<loc>/g).should.be.Array().with.lengthOf(5);
    });

    it('default is 50k', function () {
        generator = new PostGenerator();
        generator.maxPerPage.should.eql(50000);
    });

    describe('IndexGenerator', function () {
        beforeEach(function () {
            generator = new IndexGenerator({
                types: {
                    posts: new PostGenerator(),
                    pages: new PageGenerator(),
                    tags: new TagGenerator(),
                    authors: new UserGenerator()
                },
                maxPerPage: 5
            });
        });

        describe('fn: getXml', function () {
            it('default', function () {
                const xml = generator.getXml();

                xml.should.match(/sitemap-tags.xml/);
                xml.should.match(/sitemap-posts.xml/);
                xml.should.match(/sitemap-pages.xml/);
                xml.should.match(/sitemap-authors.xml/);
            });

            it('creates multiple pages when there are too many posts', function () {
                for (let i = 0; i < 10; i++) {
                    generator.types.posts.addUrl(`http://my-ghost-blog.com/episode-${i}/`, testUtils.DataGenerator.forKnex.createPost({
                        created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 200,
                        updated_at: null,
                        published_at: null,
                        slug: `episode-${i}`
                    }));
                }
                const xml = generator.getXml();

                xml.should.match(/sitemap-posts.xml/);
                xml.should.match(/sitemap-posts-2.xml/);
            });
        });
    });

    describe('PostGenerator', function () {
        beforeEach(function () {
            generator = new PostGenerator();
        });

        describe('fn: createNodeFromDatum', function () {
            it('adds an image:image element if post has a cover image', function () {
                const urlNode = generator.createUrlNodeFromDatum('https://myblog.com/test/', testUtils.DataGenerator.forKnex.createPost({
                    feature_image: 'post-100.jpg',
                    page: false,
                    slug: 'test'
                }));

                urlNode.should.be.a.ValidUrlNode({withImage: true});
            });
        });

        describe('fn: getXml', function () {
            beforeEach(function () {
                sinon.stub(urlUtils, 'urlFor');
            });

            it('get cached xml', function () {
                sinon.spy(generator, 'generateXmlFromNodes');
                generator.siteMapContent.set(1, 'something');
                generator.getXml().should.eql('something');
                generator.siteMapContent.clear();
                generator.generateXmlFromNodes.called.should.eql(false);
            });

            it('compare content output', function () {
                let idxFirst;
                let idxSecond;
                let idxThird;

                urlUtils.urlFor.withArgs('image', {image: 'post-100.jpg'}, true).returns('http://my-ghost-blog.com/images/post-100.jpg');
                urlUtils.urlFor.withArgs('image', {image: 'post-200.jpg'}, true).returns('http://my-ghost-blog.com/images/post-200.jpg');
                urlUtils.urlFor.withArgs('image', {image: 'post-300.jpg'}, true).returns('http://my-ghost-blog.com/images/post-300.jpg');
                urlUtils.urlFor.withArgs('sitemap_xsl', true).returns('http://my-ghost-blog.com/sitemap.xsl');

                generator.addUrl('http://my-ghost-blog.com/url/100/', testUtils.DataGenerator.forKnex.createPost({
                    feature_image: 'post-100.jpg',
                    created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 100,
                    updated_at: null,
                    published_at: null,
                    slug: '100'
                }));

                generator.addUrl('http://my-ghost-blog.com/url/200/', testUtils.DataGenerator.forKnex.createPost({
                    created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 200,
                    updated_at: null,
                    published_at: null,
                    slug: '200'
                }));

                generator.addUrl('http://my-ghost-blog.com/url/300/', testUtils.DataGenerator.forKnex.createPost({
                    created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 300,
                    feature_image: 'post-300.jpg',
                    updated_at: null,
                    published_at: null,
                    slug: '300'
                }));

                const xml = generator.getXml();

                xml.should.containEql('<loc>http://my-ghost-blog.com/url/100/</loc>');
                xml.should.containEql('<loc>http://my-ghost-blog.com/url/200/</loc>');
                xml.should.containEql('<loc>http://my-ghost-blog.com/url/300/</loc>');

                xml.should.containEql('<image:loc>http://my-ghost-blog.com/images/post-100.jpg</image:loc>');
                // This should NOT be present
                xml.should.not.containEql('<image:loc>http://my-ghost-blog.com/images/post-200.jpg</image:loc>');
                xml.should.containEql('<image:loc>http://my-ghost-blog.com/images/post-300.jpg</image:loc>');

                // Validate order newest to oldest
                idxFirst = xml.indexOf('<loc>http://my-ghost-blog.com/url/300/</loc>');
                idxSecond = xml.indexOf('<loc>http://my-ghost-blog.com/url/200/</loc>');
                idxThird = xml.indexOf('<loc>http://my-ghost-blog.com/url/100/</loc>');

                idxFirst.should.be.below(idxSecond);
                idxSecond.should.be.below(idxThird);
            });

            it('creates multiple pages when there are too many posts', function () {
                generator.maxPerPage = 5;
                urlUtils.urlFor.withArgs('sitemap_xsl', true).returns('http://my-ghost-blog.com/sitemap.xsl');
                for (let i = 0; i < 10; i++) {
                    generator.addUrl(`http://my-ghost-blog.com/episode-${i}/`, testUtils.DataGenerator.forKnex.createPost({
                        created_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 200,
                        updated_at: null,
                        published_at: null,
                        slug: `episode-${i}`
                    }));
                }

                const pages = [generator.getXml(), generator.getXml(2)];

                for (let i = 0; i < 10; i++) {
                    const pageIndex = Math.floor(i / 5);
                    pages[pageIndex].should.containEql(`<loc>http://my-ghost-blog.com/episode-${i}/</loc>`);
                }
            });

            it('shouldn\'t break with out of bounds pages', function () {
                should.not.exist(generator.getXml(-1));
                should.not.exist(generator.getXml(99999));
                should.not.exist(generator.getXml(0));
            });
        });

        describe('fn: removeUrl', function () {
            let post;

            beforeEach(function () {
                post = testUtils.DataGenerator.forKnex.createPost();
                generator.nodeLookup[post.id] = 'node';
            });

            afterEach(function () {
                generator.nodeLookup = {};
                generator.nodeTimeLookup = {};
            });

            it('remove none existend url', function () {
                generator.removeUrl('https://myblog.com/blog/podcast/featured/', testUtils.DataGenerator.forKnex.createPost());
                Object.keys(generator.nodeLookup).length.should.eql(1);
            });

            it('remove existing url', function () {
                generator.removeUrl('https://myblog.com/blog/test/', post);
                Object.keys(generator.nodeLookup).length.should.eql(0);
            });
        });
    });

    describe('PageGenerator', function () {
        beforeEach(function () {
            generator = new PageGenerator();
        });

        describe('fn: getXml', function () {
            it('add', function () {
                generator.addUrl('http://my-ghost-blog.com/home/', {id: 'identifier1', staticRoute: true});
                generator.addUrl('http://my-ghost-blog.com/magic/', {id: 'identifier2', staticRoute: false});
                generator.addUrl('http://my-ghost-blog.com/subscribe/', {id: ObjectId().toHexString(), page: 1});

                generator.getXml();

                generator.siteMapContent.get(1).should.containEql('<loc>http://my-ghost-blog.com/home/</loc>');
                generator.siteMapContent.get(1).should.containEql('<loc>http://my-ghost-blog.com/magic/</loc>');
                generator.siteMapContent.get(1).should.containEql('<loc>http://my-ghost-blog.com/subscribe/</loc>');

                // <loc> should exist exactly one time
                generator.siteMapContent.get(1).match(/<loc>/g).length.should.eql(3);
            });
        });
    });

    describe('TagGenerator', function () {
        beforeEach(function () {
            generator = new TagGenerator();
        });
    });

    describe('UserGenerator', function () {
        beforeEach(function () {
            generator = new UserGenerator();
        });

        describe('fn: validateImageUrl', function () {
            it('image url is localhost', function () {
                generator.validateImageUrl('http://localhost:2368/content/images/1.jpg').should.be.true();
            });

            it('image url is https', function () {
                generator.validateImageUrl('https://myblog.com/content/images/1.png').should.be.true();
            });

            it('image url is external', function () {
                generator.validateImageUrl('https://myblog.com/1.jpg').should.be.true();
            });

            it('no host', function () {
                generator.validateImageUrl('/content/images/1.jpg').should.be.false();
            });
        });
    });
});
