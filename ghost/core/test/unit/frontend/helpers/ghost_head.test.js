/* eslint-disable no-regex-spaces */
const should = require('should');

const sinon = require('sinon');
const _ = require('lodash');
const moment = require('moment');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const models = require('../../../../core/server/models');
const imageLib = require('../../../../core/server/lib/image');
const routing = require('../../../../core/frontend/services/routing');
const urlService = require('../../../../core/server/services/url');
const {cardAssets} = require('../../../../core/frontend/services/assets-minification');
const logging = require('@tryghost/logging');

const ghost_head = require('../../../../core/frontend/helpers/ghost_head');
const proxy = require('../../../../core/frontend/services/proxy');
const {settingsCache, labs} = proxy;

/**
 * This test helper asserts that the helper response matches the stored snapshot. This helps us detect issues where we
 * inject new scripts or meta tags on sites where this shouldn't be the case. Unless the changes in the snapshots are validated and approved.
 * So these changes become visible in PR's.
 */
async function testGhostHead(options) {
    let rendered = (await ghost_head(options)).toString();

    // Ignore some parts of the response by replacing regexes
    const portalVersion = /portal@~\d+\.\d+(\.\d+)?\//g;
    rendered = rendered.replace(portalVersion, 'portal@~[[VERSION]]/');

    const sodoSearchVersion = /sodo-search@~\d+\.\d+(\.\d+)?\//g;
    rendered = rendered.replace(sodoSearchVersion, 'sodo-search@~[[VERSION]]/');

    should.exist(rendered);
    // Note: we need to convert the string to an object in order to use the snapshot feature
    should({rendered}).matchSnapshot();
    return rendered;
}

describe('{{ghost_head}} helper', function () {
    let posts = [];
    let tags = [];
    let authors = [];
    let users = [];

    let keyStub;

    const makeFixtures = () => {
        const {createPost, createUser, createTag} = testUtils.DataGenerator.forKnex;

        /** TAGS - used for tag pages */
        tags.push(createTag({
            meta_description: 'tag meta description',
            name: 'tagtitle',
            meta_title: 'tag meta title',
            feature_image: '/content/images/tag-image.png',
            updated_at: new Date(0)
        }));

        tags.push(createTag({
            meta_description: '',
            description: 'tag description',
            name: 'tagtitle',
            meta_title: '',
            feature_image: '/content/images/tag-image.png',
            updated_at: new Date(0)
        }));
        tags.push(createTag({
            description: '',
            meta_description: '',
            name: 'tagtitle',
            meta_title: '',
            feature_image: '/content/images/tag-image.png',
            updated_at: new Date(0)
        }));

        tags.push(createTag({
            meta_description: 'tag meta description',
            title: 'tagtitle',
            meta_title: 'tag meta title',
            feature_image: '/content/images/tag-image.png',
            updated_at: new Date(0)
        }));

        /** USERS - used for author PAGES */
        users.push(createUser({
            name: 'Author name',
            slug: 'AuthorName',
            bio: 'Author bio',
            profile_image: '/content/images/test-author-image.png',
            cover_image: '/content/images/author-cover-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            updated_at: new Date(0)
        }));

        users.push(createUser({
            name: 'Author name',
            slug: 'AuthorName1',
            bio: 'Author bio',
            profile_image: '/content/images/test-author-image.png',
            cover_image: '/content/images/author-cover-image.png',
            website: 'http://authorwebsite.com',
            updated_at: new Date(0)
        }));

        // User without profile image but with cover image
        users.push(createUser({
            name: 'Author name',
            slug: 'AuthorName2',
            bio: 'Author bio',
            cover_image: '/content/images/author-cover-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            updated_at: new Date(0)
        }));

        /** AUTHORS - related to posts */
        authors.push(createUser({// Author 0
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            updated_at: new Date(0)
        }));

        authors.push(createUser({// Author 1
            name: 'Author name',
            slug: 'author2',
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            bio: 'Author bio',
            facebook: 'testuser',
            twitter: '@testuser',
            updated_at: new Date(0)
        }));

        authors.push(createUser({// Author 2
            name: 'Author name',
            slug: 'author3',
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            bio: 'Author bio',
            updated_at: new Date(0)
        }));

        authors.push(createUser({// Author 3
            name: 'Author name',
            url: 'http://testauthorurl.com',
            slug: 'author4',
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            updated_at: new Date(0)
        }));

        authors.push(createUser({// Author 4
            name: 'Author name',
            updated_at: new Date(0)
        }));

        authors.push(createUser({// Author 5
            name: 'Author name',
            url: 'http://testauthorurl.com',
            slug: 'author8',
            profile_image: null,
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            updated_at: new Date(0)
        }));

        /** POSTS */

        posts.push(createPost({// Post 0
            meta_description: 'all about our site',
            title: 'About',
            feature_image: '/content/images/test-image-about.png',
            page: true,
            authors: [authors[0]],
            primary_author: authors[0],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 1
            meta_description: 'all about our site',
            title: 'About',
            feature_image: '/content/images/test-image-about.png',
            og_image: '/content/images/test-og-image.png',
            og_title: 'Custom Facebook title',
            og_description: 'Custom Facebook description',
            twitter_image: '/content/images/test-twitter-image.png',
            twitter_title: 'Custom Twitter title',
            twitter_description: 'Custom Twitter description',
            page: true,
            authors: [authors[0]],
            primary_author: authors[0],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 2
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            og_title: 'Custom Facebook title',
            og_description: 'Custom Facebook description',
            twitter_image: '/content/images/test-twitter-image.png',
            published_at: moment('2008-05-31T19:18:15').toDate(),
            updated_at: moment('2014-10-06T15:23:54').toDate(),
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [authors[1]],
            primary_author: authors[1]
        }));

        posts.push(createPost({// Post 3
            meta_description: 'site description',
            custom_excerpt: 'post custom excerpt',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            og_image: '/content/images/test-facebook-image.png',
            twitter_image: '/content/images/test-twitter-image.png',
            twitter_title: 'Custom Twitter title',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[2]
            ],
            primary_author: authors[2],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 4
            title: 'Welcome to Ghost',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('This is a short post'),
            excerpt: 'This is a short post',
            authors: [
                authors[3]
            ],
            primary_author: authors[3],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 5
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            og_image: '/content/images/test-facebook-image.png',
            og_title: 'Custom Facebook title',
            twitter_image: '/content/images/test-twitter-image.png',
            twitter_title: 'Custom Twitter title',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[3]
            ],
            primary_author: authors[3],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 6
            meta_description: 'site "test" description',
            title: 'title',
            meta_title: 'Welcome to Ghost "test"',
            feature_image: '/content/images/test-image.png',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[3]
            ],
            primary_author: authors[3],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 7
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            tags: [],
            authors: [
                authors[3]
            ],
            primary_author: authors[3],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 8
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: null,
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[5]
            ],
            primary_author: authors[5],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({// Post 9
            title: 'Welcome to Ghost',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('This is a short post'),
            excerpt: 'This is a short post',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[4]
            ],
            primary_author: authors[4],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));

        posts.push(createPost({ // Post 10
            title: 'Testing stats',
            uuid: 'post_uuid',
            excerpt: 'Creating stats for the site',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('Creating stats for the site'),
            authors: [
                authors[3]
            ],
            primary_author: authors[3],
            published_at: new Date(0),
            updated_at: new Date(0)
        }));
    };

    before(function () {
        // @TODO: remove when visibility is refactored out of models
        models.init();

        keyStub = sinon.stub().resolves('xyz');
        const dataService = {
            getFrontendKey: keyStub
        };
        proxy.init({dataService});
    });

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('https://mysite.com/fakeauthor/');

        // @TODO: this is a LOT of mocking :/
        sinon.stub(routing.registry, 'getRssUrl').returns('http://localhost:65530/rss/');
        sinon.stub(imageLib.imageSize, 'getImageSizeFromUrl').resolves();
        sinon.stub(settingsCache, 'get');

        settingsCache.get.withArgs('title').returns('Ghost');
        settingsCache.get.withArgs('description').returns('site description');
        settingsCache.get.withArgs('cover_image').returns('/content/images/site-cover.png');
        settingsCache.get.withArgs('amp').returns(true);
        settingsCache.get.withArgs('comments_enabled').returns('off');
        settingsCache.get.withArgs('members_track_sources').returns(true);

        // Force the usage of a fixed asset hash so we have reliable snapshots
        configUtils.set('assetHash', 'asset-hash');

        makeFixtures();
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('without Code Injection', function () {
        let loggingErrorStub; // assert # of calls if test throws errors, do not globally stub

        beforeEach(function () {
            configUtils.set({url: 'http://localhost:65530/'});
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns meta tag string on paginated index page without structured data and schema', async function () {
            // @TODO: later we can extend this fn with an `meta` object e.g. locals.meta
            loggingErrorStub = sinon.stub(logging, 'error');
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/page/2/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
            sinon.assert.calledOnce(loggingErrorStub);
        });

        it('returns structured data on first index page', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not inject count script if comments off', async function () {
            settingsCache.get.withArgs('comments_enabled').returns('off');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('injects comment count script if comments paid', async function () {
            settingsCache.get.withArgs('comments_enabled').returns('paid');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('injects comment count script if comments all', async function () {
            settingsCache.get.withArgs('comments_enabled').returns('all');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns meta structured data on homepage with site metadata defined', async function () {
            settingsCache.get.withArgs('meta_description').returns('site SEO description');

            settingsCache.get.withArgs('og_title').returns('facebook site title');
            settingsCache.get.withArgs('og_description').returns('facebook site description');
            settingsCache.get.withArgs('og_image').returns('/content/images/facebook-image.png');

            settingsCache.get.withArgs('twitter_title').returns('twitter site title');
            settingsCache.get.withArgs('twitter_description').returns('twitter site description');
            settingsCache.get.withArgs('twitter_image').returns('/content/images/twitter-image.png');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data on static page', async function () {
            const renderObject = {
                post: posts[0]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data on static page with custom post structured data', async function () {
            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data on post page with author image and post cover image', async function () {
            const renderObject = {
                post: posts[2]
            };

            const postBk = _.cloneDeep(renderObject.post);

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
            renderObject.post.should.eql(postBk);
        });

        it('returns structured data on post page with custom excerpt for description and meta description', async function () {
            const renderObject = {
                post: posts[3]
            };

            const postBk = _.cloneDeep(renderObject.post);

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
            renderObject.post.should.eql(postBk);
        });

        it('returns structured data on post page with fall back excerpt if no meta description provided', async function () {
            const renderObject = {
                post: posts[4]
            };

            const postBk = _.cloneDeep(renderObject.post);

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
            renderObject.post.should.eql(postBk);
        });

        it('returns structured data on AMP post page with author image and post cover image', async function () {
            const renderObject = {
                post: posts[5]
            };

            const postBk = _.cloneDeep(renderObject.post);

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/amp/',
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            }));
            renderObject.post.should.eql(postBk);
        });

        it('returns structured data if metaTitle and metaDescription have double quotes', async function () {
            const renderObject = {
                post: posts[6]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data without tags if there are no tags', async function () {
            const renderObject = {
                post: posts[7]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data on post page with null author image and post cover image', async function () {
            const renderObject = {
                post: posts[8]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns twitter and facebook descriptions even if no meta description available', async function () {
            const renderObject = {
                post: posts[9]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns canonical URL', async function () {
            const renderObject = {
                post: posts[9]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns next & prev URL correctly for middle page', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    pagination: {total: 4, page: 3, next: 4, prev: 2}
                },
                locals: {
                    relativeUrl: '/page/3/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns next & prev URL correctly for second page', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    pagination: {total: 3, page: 2, next: 3, prev: 1}
                },
                locals: {
                    relativeUrl: '/page/2/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data and schema first tag page with meta description and meta title', async function () {
            const renderObject = {
                tag: tags[0]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('tag first page without meta data if no meta title and meta description, but model description provided', async function () {
            const renderObject = {
                tag: tags[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('tag first page without meta and model description returns no description fields', async function () {
            const renderObject = {
                tag: tags[2]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not return structured data on paginated tag pages', async function () {
            const renderObject = {
                tag: tags[3]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/page/2/',
                    context: ['paged', 'tag'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns structured data and schema on first author page with cover image', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {author: users[2]},
                locals: {
                    // @TODO: WHY?
                    relativeUrl: '/author/authorname/',
                    context: ['author'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not return structured data on paginated author pages', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {author: users[1]},
                locals: {
                    // @TODO: WHY?
                    relativeUrl: '/author/authorname1/page/2/',
                    context: ['paged', 'author'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns meta tag string even if safeVersion is invalid', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: [],
                    safeVersion: '0.9'
                }
            }));
        });

        it('disallows indexing for preview pages', async function () {
            loggingErrorStub = sinon.stub(logging, 'error');
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: ['preview', 'post']
                }
            }));
            // Unknown Request error for favico
            // TypeError for primary_author being undefined
            sinon.assert.calledOnce(loggingErrorStub);
        });

        it('implicit indexing settings for non-preview pages', async function () {
            loggingErrorStub = sinon.stub(logging, 'error');
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: ['featured', 'paged', 'index', 'post', 'amp', 'home', 'unicorn']
                }
            }));
            // Unknown Request error for favico
            // TypeError for primary_author being undefined
            sinon.assert.calledOnce(loggingErrorStub);
        });

        it('outputs structured data but not schema for custom collection', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/featured/',
                    context: ['featured'],
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('with /site subdirectory', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({url: 'http://localhost:65530/site'});

            routing.registry.getRssUrl.returns('http://localhost:65530/site/rss/');
        });

        afterEach(function () {
            routing.registry.getRssUrl.returns('http://localhost:65530/rss/');
        });

        it('returns correct rss url with subdirectory', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('with changed origin in config file', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({
                url: 'http://localhost:65530/site',
                referrerPolicy: 'origin'
            });
        });

        it('contains the changed origin', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('with useStructuredData is set to false in config file', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({
                url: 'http://localhost:65530/',
                privacy: {
                    useStructuredData: false
                }
            });
        });

        it('does not return structured data', async function () {
            const renderObject = {
                post: posts[2]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('with Code Injection', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');
            settingsCache.get.withArgs('codeinjection_head').returns('<style>body {background: red;}</style>');

            configUtils.set({url: 'http://localhost:65530/'});
        });

        it('returns meta tag plus injected code', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    post: false
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('outputs post codeinjection as well', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    post: {
                        codeinjection_head: 'post-codeinjection'
                    }
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('handles post codeinjection being empty', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    post: {
                        codeinjection_head: ''
                    }
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('handles post codeinjection being null', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    post: {
                        codeinjection_head: null
                    }
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns meta tag without injected code for amp context', async function () {
            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('amp is disabled', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('amp').returns(false);
        });

        it('does not contain amphtml link', async function () {
            let loggingErrorStub = sinon.stub(logging, 'error');

            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));

            sinon.assert.calledOnce(loggingErrorStub);
        });
    });

    describe('accent_color', function () {
        it('includes style tag when set', async function () {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not include style tag when not set', async function () {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: null
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('attaches style tag to existing script/style tag', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);

            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('includes style tag on templates with no context', async function () {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/amp/',
                    context: null,
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not include style tag in AMP context', async function () {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post', 'amp'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not override code injection', async function () {
            settingsCache.get.withArgs('codeinjection_head').returns('<style>:root {--ghost-accent-color: #site-code-injection}</style>');

            const renderObject = {
                post: Object.assign({}, posts[1], {codeinjection_head: '<style>:root {--ghost-accent-color: #post-code-injection}</style>'})
            };

            const templateOptions = {
                site: {
                    accent_color: '#site-setting'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/amp/',
                    context: null,
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('custom fonts', function () {
        it('includes custom font when set in options data object and preview is set', async function () {
            sinon.stub(labs, 'isSet').withArgs('customFonts').returns(true);

            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    heading_font: 'Space Grotesk',
                    body_font: 'Poppins',
                    _preview: 'test'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('includes custom font when set in settings cache and no preview', async function () {
            sinon.stub(labs, 'isSet').withArgs('customFonts').returns(true);
            settingsCache.get.withArgs('heading_font').returns('Playfair Display');
            settingsCache.get.withArgs('body_font').returns('Lora');

            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions: {site: {}},
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not include custom font when not set', async function () {
            sinon.stub(labs, 'isSet').withArgs('customFonts').returns(true);

            settingsCache.get.withArgs('heading_font').returns(null);
            settingsCache.get.withArgs('body_font').returns('');

            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions: {site: {}},
                renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not include custom font when invalid', async function () {
            sinon.stub(labs, 'isSet').withArgs('customFonts').returns(true);

            settingsCache.get.withArgs('heading_font').returns(null);
            settingsCache.get.withArgs('body_font').returns('Wendy Sans');

            const templateOptions = {
                site: {
                    heading_font: 'Comic Sans',
                    body_font: ''
                }
            };

            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions,
                renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('does not inject custom fonts when preview is set and default font was selected (empty string)', async function () {
            sinon.stub(labs, 'isSet').withArgs('customFonts').returns(true);
            // The site has fonts set up, but we override them with Theme default fonts (empty string)
            settingsCache.get.withArgs('heading_font').returns('Playfair Display');
            settingsCache.get.withArgs('body_font').returns('Lora');

            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions: {site: {
                    heading_font: '',
                    body_font: '',
                    _preview: 'test'
                }},
                renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('can handle preview being set and custom font keys missing', async function () {
            sinon.stub(labs, 'isSet').withArgs('customFonts').returns(true);

            // The site has fonts set up, but we override them with Theme default fonts (empty string)
            settingsCache.get.withArgs('heading_font').returns('Playfair Display');
            settingsCache.get.withArgs('body_font').returns('Lora');

            const renderObject = {
                post: posts[1]
            };

            await testGhostHead(testUtils.createHbsResponse({
                templateOptions: {site: {
                    // No keys for custom fonts set
                    _preview: 'test'
                }},
                renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });
    });

    describe('members scripts', function () {
        it('includes portal when members enabled', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('includes portal when recommendations enabled', async function () {
            settingsCache.get.withArgs('recommendations_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('includes portal when donations enabled', async function () {
            settingsCache.get.withArgs('donations_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('includes stripe when connected', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('skips portal and stripe when members are disabled', async function () {
            settingsCache.get.withArgs('members_enabled').returns(false);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('skips stripe if not set up', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(false);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });
    });

    describe('search scripts', function () {
        it('includes search', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            rendered.should.match(/sodo-search@/);
        });

        it('includes locale in search when i18n is enabled', async function () {
            sinon.stub(labs, 'isSet').withArgs('i18n').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            rendered.should.match(/sodo-search@[^>]*?data-locale="en"/);
        });

        it('does not incldue locale in search when i18n is disabled', async function () {
            sinon.stub(labs, 'isSet').withArgs('i18n').returns(false);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            rendered.should.not.match(/sodo-search@[^>]*?data-locale="en"/);
        });
    });

    describe('attribution scripts', function () {
        it('is included when tracking setting is enabled', async function () {
            settingsCache.get.withArgs('members_track_sources').returns(true);
            settingsCache.get.withArgs('members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('is not included when tracking setting is disabled', async function () {
            settingsCache.get.withArgs('members_track_sources').returns(false);
            settingsCache.get.withArgs('members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });
    });

    describe('includes tinybird tracker script when config is set', function () {
        beforeEach(function () {
            configUtils.set({
                tinybird: {
                    tracker: {
                        scriptUrl: 'https://unpkg.com/@tinybirdco/flock.js',
                        endpoint: 'https://api.tinybird.co',
                        token: 'tinybird_token',
                        id: 'tb_test_site_uuid'
                    }
                }
            });
        });
        it('with all tb_variables set to undefined on logged out home page', async function () {
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('Sets tb_post_uuid on post page', async function () {
            const renderObject = {
                post: posts[10]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('sets tb_member_x variables on logged in home page', async function () {
            const renderObject = {
                member: {
                    uuid: 'member_uuid',
                    status: 'paid'
                }
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('sets both tb_member_x variables and tb_post_uuid on logged in post page', async function () {
            const renderObject = {
                member: {
                    uuid: 'member_uuid',
                    status: 'free'
                },
                post: posts[10]
            };

            await testGhostHead(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '4.3'
                }
            }));
        });
    });
    describe('respects values from excludes: ', function () {
        it('when excludes is empty', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: ''}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            rendered.should.match(/portal@/);
            rendered.should.match(/sodo-search@/);
            rendered.should.match(/js.stripe.com/);
        });
        it('when exclude contains search', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: 'search'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            rendered.should.not.match(/sodo-search@/);
            rendered.should.match(/portal@/);
            rendered.should.match(/js.stripe.com/);
        });
        it('when exclude contains portal', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: 'portal'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            rendered.should.match(/sodo-search@/);
            rendered.should.not.match(/portal@/);
            rendered.should.match(/js.stripe.com/);
        });
        it('can handle multiple excludes', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: 'portal,search'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            rendered.should.not.match(/sodo-search@/);
            rendered.should.not.match(/portal@/);
            rendered.should.match(/js.stripe.com/);
        });

        it('shows the announcement when exclude does not contain announcement', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);
            settingsCache.get.withArgs('announcement_content').returns('Hello world');
            settingsCache.get.withArgs('announcement_visibility').returns('visitors');

            let rendered = await testGhostHead({hash: {exclude: ''}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            rendered.should.match(/sodo-search@/);
            rendered.should.match(/portal@/);
            rendered.should.match(/js.stripe.com/);
            rendered.should.match(/announcement-bar@/);
        });
        it('does not show the announcement when exclude contains announcement', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);
            settingsCache.get.withArgs('announcement_content').returns('Hello world');
            settingsCache.get.withArgs('announcement_visibility').returns('visitors');

            let rendered = await testGhostHead({hash: {exclude: 'announcement'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            rendered.should.match(/sodo-search@/);
            rendered.should.match(/portal@/);
            rendered.should.match(/js.stripe.com/);
            rendered.should.match(/generator/);
            rendered.should.not.match(/announcement-bar@/);
        });

        it('does not load the comments script when exclude contains comment_counts', async function () {
            settingsCache.get.withArgs('comments_enabled').returns('all');
            let rendered = await testGhostHead({hash: {exclude: 'comment_counts'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.not.match(/comment-counts.min.js/);
        });

        it('loads card assets when not excluded', async function () {
            // mock the card assets cardAssets.hasFile('js', 'cards.min.js').returns(true);
            sinon.stub(cardAssets, 'hasFile').returns(true);

            let rendered = await testGhostHead({...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.match(/cards.min.js/);
            rendered.should.match(/cards.min.css/);
        });
        it('does not load card assets when excluded with card_assets', async function () {
            sinon.stub(cardAssets, 'hasFile').returns(true);
            let rendered = await testGhostHead({hash: {exclude: 'card_assets'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.not.match(/cards.min.js/);
            rendered.should.not.match(/cards.min.css/);
        });
        it('does not load meta tags when excluded with metadata', async function () {
            let rendered = await testGhostHead({hash: {exclude: 'metadata'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.not.match(/<link rel="canonical"/);
        });
        it('does not load schema when excluded with schema', async function () {
            let rendered = await testGhostHead({hash: {exclude: 'schema'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.not.match(/<script type="application\/ld\+json"/);
        });
        it('does not load og: or twitter: attributes when excludd with social_data', async function () {
            let rendered = await testGhostHead({hash: {exclude: 'social_data'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.not.match(/<meta property="og:/);
            rendered.should.not.match(/<meta property="twitter:/);
        });
        it('does not load cta styles when excluded with cta_styles', async function () {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);
            let rendered = await testGhostHead({hash: {exclude: 'cta_styles'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            rendered.should.not.match(/.gh-post-upgrade-cta-content/);
        });
    });
});
