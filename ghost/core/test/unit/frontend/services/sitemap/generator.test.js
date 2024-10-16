const should = require('should');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const _ = require('lodash');
const moment = require('moment');
const assert = require('assert/strict');
const testUtils = require('../../../../utils');
const urlUtils = require('../../../../../core/shared/url-utils');
const IndexGenerator = require('../../../../../core/frontend/services/sitemap/SiteMapIndexGenerator');
const PostGenerator = require('../../../../../core/frontend/services/sitemap/PostMapGenerator');
const PageGenerator = require('../../../../../core/frontend/services/sitemap/PageMapGenerator');
const TagGenerator = require('../../../../../core/frontend/services/sitemap/TagsMapGenerator');
const UserGenerator = require('../../../../../core/frontend/services/sitemap/UserMapGenerator');

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
                generator.types.posts.addUrl('http://my-ghost-blog.com/episode-1/', {id: 'identifier1', staticRoute: true});
                generator.types.pages.addUrl('http://my-ghost-blog.com/home/', {id: 'identifier1', staticRoute: true});
                generator.types.tags.addUrl('http://my-ghost-blog.com/home/', {id: 'identifier1', staticRoute: true});
                generator.types.authors.addUrl('http://my-ghost-blog.com/home/', {id: 'identifier1', staticRoute: true});

                const xml = generator.getXml();

                xml.should.match(/sitemap-tags.xml/);
                xml.should.match(/sitemap-posts.xml/);
                xml.should.match(/sitemap-pages.xml/);
                xml.should.match(/sitemap-authors.xml/);
            });

            it('does not create entries for pages with no content', function () {
                generator.types.tags.addUrl('http://my-ghost-blog.com/episode-1/', {id: 'identifier1', staticRoute: true});

                const xml = generator.getXml();

                xml.should.match(/sitemap-tags.xml/);
                xml.should.not.match(/sitemap-posts.xml/);
                xml.should.not.match(/sitemap-pages.xml/);
                xml.should.not.match(/sitemap-authors.xml/);
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

        describe('fn: hasCanonicalUrl', function () {
            it('can check for canonical url', function () {
                const isCanonical = generator.hasCanonicalUrl(testUtils.DataGenerator.forKnex.createPost({
                    page: false,
                    slug: 'some-cool-page',
                    canonical_url: 'https://myblog.com/test/'
                }
                ));
                isCanonical.should.eql(true);
            });
            it('returns false if no canonical url', function () {
                const isCanonical = generator.hasCanonicalUrl(testUtils.DataGenerator.forKnex.createPost({
                    page: false,
                    slug: 'some-cool-page',
                    canonical_url: null
                }
                ));
                isCanonical.should.eql(false);
            });
        });

        describe('fn: addUrl', function () {
            it('does not include posts containing canonical_url', function () {
                generator.addUrl('https://myblog.com/test2/', testUtils.DataGenerator.forKnex.createPost({
                    page: false,
                    slug: 'test2',
                    canonical_url: null
                }));
                generator.addUrl('https://myblog.com/test/', testUtils.DataGenerator.forKnex.createPost({
                    page: false,
                    slug: 'test',
                    canonical_url: 'https://external.com/test/'
                }));
                const xml = generator.getXml();
                xml.should.not.match(/https:\/\/external.com\/test\//);
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

        describe('fn: updateURL', function () {
            it('updates existing url', function () {
                const postDatumToUpdate = testUtils.DataGenerator.forKnex.createPost({
                    updated_at: (Date.UTC(2014, 11, 22, 12) - 360000) + 100
                });

                generator.addUrl('http://my-ghost-blog.com/url/100/', postDatumToUpdate);

                assert.equal(generator.nodeLookup[postDatumToUpdate.id].url[0].loc, 'http://my-ghost-blog.com/url/100/');

                const postWithUpdatedDatum = Object.assign({}, {
                    updated_at: (Date.UTC(2023, 11, 22, 12) - 360000)
                }, postDatumToUpdate);
                const updatedISOString = moment(postWithUpdatedDatum.updated_at).toISOString();
                generator.updateURL(postWithUpdatedDatum);

                assert.equal(generator.nodeLookup[postDatumToUpdate.id].url[0].loc, 'http://my-ghost-blog.com/url/100/');
                assert.equal(generator.nodeLookup[postDatumToUpdate.id].url[1].lastmod, updatedISOString);
            });

            it('does not thrown when trying to update a non-existing url', function () {
                const postDatumToUpdate = testUtils.DataGenerator.forKnex.createPost();
                generator.updateURL(postDatumToUpdate);

                assert.equal(generator.nodeLookup[postDatumToUpdate.id], undefined);
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
            it('does not include pages containing canonical_url', function () {
                generator.addUrl('https://myblog.com/test2/', testUtils.DataGenerator.forKnex.createPost({
                    page: true,
                    slug: 'test2',
                    canonical_url: null
                }));
                generator.addUrl('https://myblog.com/test/', testUtils.DataGenerator.forKnex.createPost({
                    page: true,
                    slug: 'test',
                    canonical_url: 'https://external.com/test/'
                }));
                const xml = generator.getXml();
                xml.should.not.match(/https:\/\/external.com\/test\//);
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
