const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');

const sinon = require('sinon');
const {assertMatchSnapshot} = require('../../../utils/assertions');
const _ = require('lodash');
const moment = require('moment');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/config-utils');
const imageLib = require('../../../../core/server/lib/image');
const routing = require('../../../../core/frontend/services/routing');
const urlService = require('../../../../core/server/services/url');
const {cardAssets} = require('../../../../core/frontend/services/assets-minification');
const logging = require('@tryghost/logging');

const ghost_head = require('../../../../core/frontend/helpers/ghost_head');
const proxy = require('../../../../core/frontend/services/proxy');
const assetHash = require('../../../../core/frontend/services/asset-hash');
const internalKeys = require('../../../../core/server/services/internal-keys').default;
const {settingsCache, settingsHelpers} = proxy;

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

    const adminToolbarResourceId = /data-resource-id="[^"]+"/g;
    rendered = rendered.replace(adminToolbarResourceId, 'data-resource-id="[[RESOURCE_ID]]"');

    const adminToolbarTagMetadata = / data-resource-type="tag" data-resource-slug="[^"]+"/g;
    rendered = rendered.replace(adminToolbarTagMetadata, '');

    const adminToolbarPageContext = / data-page-context="home"/g;
    rendered = rendered.replace(adminToolbarPageContext, '');

    const adminToolbarHomepageFeatures = / data-(site-analytics|activitypub|members)-enabled="true"/g;
    rendered = rendered.replace(adminToolbarHomepageFeatures, '');

    const adminToolbarCommentsDisabled = / data-comments-enabled="false"/g;
    rendered = rendered.replace(adminToolbarCommentsDisabled, '');

    assertExists(rendered);
    // Note: we need to convert the string to an object in order to use the snapshot feature
    assertMatchSnapshot({rendered});
    return rendered;
}

describe('{{ghost_head}} helper', function () {
    let posts = [];
    let tags = [];
    let authors = [];
    let users = [];

    let getStub;
    let routingRegistryGetRssUrlStub;

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

    beforeEach(function () {
        internalKeys.clear();
        internalKeys.set('ghost-internal-frontend', Promise.resolve({id: 'k', secret: 'xyz'}));
    });

    afterEach(function () {
        internalKeys.clear();
    });

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('https://mysite.com/fakeauthor/');

        // @TODO: this is a LOT of mocking :/
        routingRegistryGetRssUrlStub = sinon.stub(routing.registry, 'getRssUrl').returns('http://localhost:65530/rss/');
        sinon.stub(imageLib.cachedImageSizeFromUrl, 'getCachedImageSizeFromUrl').resolves();
        getStub = sinon.stub(settingsCache, 'get');

        getStub.withArgs('title').returns('Ghost');
        getStub.withArgs('description').returns('site description');
        getStub.withArgs('cover_image').returns('/content/images/site-cover.png');
        getStub.withArgs('comments_enabled').returns('off');
        getStub.withArgs('members_track_sources').returns(true);
        getStub.withArgs('site_uuid').returns('77f09c60-5a34-4b4c-a3f6-e1b1d78f7412');

        // Force the usage of a fixed asset hash so we have reliable snapshots
        configUtils.set('assetHash', 'asset-hash');
        // Disable file-based hashing so all assets use the fixed global hash above
        sinon.stub(assetHash, 'getHashForFile').returns(null);

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
            loggingErrorStub = sinon.stub(logging, 'error');
        });

        it('returns meta tag string on paginated index page without structured data and schema', async function () {
            // @TODO: later we can extend this fn with an `meta` object e.g. locals.meta
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/page/2/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            }));
            sinon.assert.notCalled(loggingErrorStub);
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
            getStub.withArgs('comments_enabled').returns('off');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('injects comment count script if comments paid', async function () {
            getStub.withArgs('comments_enabled').returns('paid');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('injects comment count script if comments all', async function () {
            getStub.withArgs('comments_enabled').returns('all');

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }));
        });

        it('returns meta structured data on homepage with site metadata defined', async function () {
            getStub.withArgs('meta_description').returns('site SEO description');

            getStub.withArgs('og_title').returns('facebook site title');
            getStub.withArgs('og_description').returns('facebook site description');
            getStub.withArgs('og_image').returns('/content/images/facebook-image.png');

            getStub.withArgs('twitter_title').returns('twitter site title');
            getStub.withArgs('twitter_description').returns('twitter site description');
            getStub.withArgs('twitter_image').returns('/content/images/twitter-image.png');

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
            assert.deepEqual(renderObject.post, postBk);
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
            assert.deepEqual(renderObject.post, postBk);
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
            assert.deepEqual(renderObject.post, postBk);
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
            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: ['featured', 'paged', 'index', 'post', 'home', 'unicorn']
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
            getStub.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({url: 'http://localhost:65530/site'});

            routingRegistryGetRssUrlStub.returns('http://localhost:65530/site/rss/');
        });

        afterEach(function () {
            routingRegistryGetRssUrlStub.restore();
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
            getStub.withArgs('icon').returns('/content/images/favicon.png');

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
            getStub.withArgs('icon').returns('/content/images/favicon.png');

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
            getStub.withArgs('icon').returns('/content/images/favicon.png');
            getStub.withArgs('codeinjection_head').returns('<style>body {background: red;}</style>');

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
            getStub.withArgs('members_enabled').returns(true);

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

        it('includes style tag in design preview when announcement bar renders nothing', async function () {
            const loggingErrorStub = sinon.stub(logging, 'error');
            getStub.withArgs('members_track_sources').returns(false);

            const templateOptions = {
                site: {
                    accent_color: '#123456',
                    _preview: 'test'
                }
            };

            const rendered = await testGhostHead({hash: {exclude: 'card_assets,comment_counts'}, ...testUtils.createHbsResponse({
                templateOptions,
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            assert.match(rendered, /--ghost-accent-color: #123456/);
            sinon.assert.notCalled(loggingErrorStub);
        });

        it('does not override code injection', async function () {
            getStub.withArgs('codeinjection_head').returns('<style>:root {--ghost-accent-color: #site-code-injection}</style>');

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
            getStub.withArgs('heading_font').returns('Playfair Display');
            getStub.withArgs('body_font').returns('Lora');

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
            getStub.withArgs('heading_font').returns(null);
            getStub.withArgs('body_font').returns('');

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
            getStub.withArgs('heading_font').returns(null);
            getStub.withArgs('body_font').returns('Wendy Sans');

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
            // The site has fonts set up, but we override them with Theme default fonts (empty string)
            getStub.withArgs('heading_font').returns('Playfair Display');
            getStub.withArgs('body_font').returns('Lora');

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
            // The site has fonts set up, but we override them with Theme default fonts (empty string)
            getStub.withArgs('heading_font').returns('Playfair Display');
            getStub.withArgs('body_font').returns('Lora');

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
            getStub.withArgs('members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('includes portal when recommendations enabled', async function () {
            getStub.withArgs('recommendations_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('includes portal when donations enabled', async function () {
            getStub.withArgs('donations_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('includes stripe when connected', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('skips portal and stripe when members are disabled', async function () {
            getStub.withArgs('members_enabled').returns(false);
            getStub.withArgs('paid_members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('skips stripe if not set up', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(false);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });
        it('does not inject the portal script when portal url is disabled', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);
            configUtils.set({'portal:url': false});

            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }))).toString();

            assert.doesNotMatch(rendered, /src="false"/);
            assert.doesNotMatch(rendered, /data-ghost=/);
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

            assert.match(rendered, /sodo-search@/);
        });

        it('includes locale in search', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /sodo-search@[^>]*?data-locale="en"/);
        });
    });

    describe('attribution scripts', function () {
        it('is included when tracking setting is enabled', async function () {
            getStub.withArgs('members_track_sources').returns(true);
            getStub.withArgs('members_enabled').returns(true);

            await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));
        });

        it('is not included when tracking setting is disabled', async function () {
            getStub.withArgs('members_track_sources').returns(false);
            getStub.withArgs('members_enabled').returns(true);

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
        let settingsHelpersStub;

        function setAnalyticsFlags({analytics = false} = {}) {
            settingsHelpersStub.returns(analytics);
        }

        beforeEach(function () {
            configUtils.set({
                tinybird: {
                    tracker: {
                        endpoint: 'https://e.ghost.org/tb/web_analytics',
                        token: 'tinybird_token',
                        datasource: 'analytics_events',
                        local: {
                            enabled: false,
                            endpoint: 'http://localhost:7181/v0/events',
                            token: 'tinybird_local_token',
                            datasource: 'analytics_events'
                        }
                    }
                }
            });
            settingsHelpersStub = sinon.stub(settingsHelpers, 'isWebAnalyticsEnabled');
            setAnalyticsFlags({analytics: true});
        });

        afterEach(function () {
            settingsHelpersStub.restore();
        });

        it('includes tracker script when web analytics is enabled', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /script defer src="\/public\/ghost-stats\.min\.js/);
        });

        it('does not include tracker script when web analytics is not enabled', async function () {
            setAnalyticsFlags({analytics: false});

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.doesNotMatch(rendered, /script defer src="\/public\/ghost-stats\.min\.js/);
        });

        it('includes tracker script with subdir', async function () {
            configUtils.set('url', 'http://localhost:2388/blog/');

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /script defer src="\/blog\/public\/ghost-stats\.min\.js/);
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

        it('includes datasource when set', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /data-datasource="analytics_events"/);
        });

        it('does not include tracker script when preview is set', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    context: ['preview', 'post']
                }
            }));

            assert.doesNotMatch(rendered, /script defer src="\/public\/ghost-stats\.min\.js"/);
        });

        it('uses the provided host/endpoint from config', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /data-host="https:\/\/e.ghost.org\/tb\/web_analytics"/);
        });

        it('includes local tracker script when local is set', async function () {
            configUtils.set('tinybird:tracker:local:enabled', true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /data-host="http:\/\/localhost:7181\/v0\/events"/);
        });

        it('does not include tracker token when it is not set', async function () {
            configUtils.set('tinybird:tracker:token', undefined);
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.doesNotMatch(rendered, /data-token=/);
        });

        it('does not include tracker token when env is production', async function () {
            configUtils.set('tinybird:tracker:token', 'tinybird_token');
            configUtils.set('env', 'production');
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.doesNotMatch(rendered, /data-token=/);
        });

        it('does not include tracker script in preview context', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['preview', 'home', 'index'],
                    safeVersion: '4.3'
                }
            }));
            assert.doesNotMatch(rendered, /script defer src="\/public\/ghost-stats\.min\.js/);
        });
    });

    describe('respects values from excludes: ', function () {
        it('when excludes is empty', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: ''}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            assert.match(rendered, /portal@/);
            assert.match(rendered, /sodo-search@/);
            assert.match(rendered, /js.stripe.com/);
        });
        it('when exclude contains search', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: 'search'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            assert.doesNotMatch(rendered, /sodo-search@/);
            assert.match(rendered, /portal@/);
            assert.match(rendered, /js.stripe.com/);
        });
        it('when exclude contains portal', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: 'portal'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            assert.match(rendered, /sodo-search@/);
            assert.doesNotMatch(rendered, /portal@/);
            assert.match(rendered, /js.stripe.com/);
        });
        it('can handle multiple excludes', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            let rendered = await testGhostHead({hash: {exclude: 'portal,search'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            assert.doesNotMatch(rendered, /sodo-search@/);
            assert.doesNotMatch(rendered, /portal@/);
            assert.match(rendered, /js.stripe.com/);
        });

        it('shows the announcement when exclude does not contain announcement', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);
            getStub.withArgs('announcement_content').returns('Hello world');
            getStub.withArgs('announcement_visibility').returns(['visitors']);

            let rendered = await testGhostHead({hash: {exclude: ''}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            assert.match(rendered, /sodo-search@/);
            assert.match(rendered, /portal@/);
            assert.match(rendered, /js.stripe.com/);
            assert.match(rendered, /announcement-bar@/);
        });
        it('does not show the announcement when exclude contains announcement', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);
            getStub.withArgs('announcement_content').returns('Hello world');
            getStub.withArgs('announcement_visibility').returns(['visitors']);

            let rendered = await testGhostHead({hash: {exclude: 'announcement'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});
            assert.match(rendered, /sodo-search@/);
            assert.match(rendered, /portal@/);
            assert.match(rendered, /js.stripe.com/);
            assert.match(rendered, /generator/);
            assert.doesNotMatch(rendered, /announcement-bar@/);
        });

        it('does not load the comments script when exclude contains comment_counts', async function () {
            getStub.withArgs('comments_enabled').returns('all');
            let rendered = await testGhostHead({hash: {exclude: 'comment_counts'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            assert.doesNotMatch(rendered, /comment-counts.min.js/);
        });

        it('does not load the admin toolbar script without the frontend marker', async function () {
            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            }))).toString();

            assert.doesNotMatch(rendered, /admin-toolbar\.min\.js/);
        });

        it('loads the admin toolbar script with public site and post metadata', async function () {
            getStub.withArgs('comments_enabled').returns('all');

            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/welcome/',
                    context: ['post'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                },
                renderObject: {
                    post: posts[2]
                }
            }))).toString();

            assert.match(rendered, /admin-toolbar\.min\.js/);
            assert.match(rendered, /data-ghost-admin-toolbar="http:\/\/(?:localhost:65530|127\.0\.0\.1:\d+)\/ghost\/"/);
            assert.match(rendered, /data-site-title="Ghost"/);
            assert.match(rendered, /data-resource-type="post"/);
            assert.match(rendered, new RegExp(`data-resource-id="${posts[2].id}"`));
            assert.doesNotMatch(rendered, /data-comments-enabled/);
            assert.doesNotMatch(rendered, /Jane Staff/);
            assert.doesNotMatch(rendered, /ghost-admin-api-session/);
        });

        it('marks the admin toolbar script when comments are disabled', async function () {
            getStub.withArgs('comments_enabled').returns('off');

            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/welcome/',
                    context: ['post'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                },
                renderObject: {
                    post: posts[2]
                }
            }))).toString();

            assert.match(rendered, /admin-toolbar\.min\.js/);
            assert.match(rendered, /data-comments-enabled="false"/);
        });

        it('loads the admin toolbar script with homepage feature metadata', async function () {
            getStub.withArgs('web_analytics_enabled').returns(true);
            getStub.withArgs('social_web_enabled').returns(true);
            getStub.withArgs('members_enabled').returns(true);

            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                }
            }))).toString();

            assert.match(rendered, /admin-toolbar\.min\.js/);
            assert.match(rendered, /data-page-context="home"/);
            assert.match(rendered, /data-site-analytics-enabled="true"/);
            assert.match(rendered, /data-activitypub-enabled="true"/);
            assert.match(rendered, /data-members-enabled="true"/);
        });

        it('omits disabled homepage feature metadata', async function () {
            getStub.withArgs('web_analytics_enabled').returns(false);
            getStub.withArgs('social_web_enabled').returns(false);
            getStub.withArgs('members_enabled').returns(false);

            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                }
            }))).toString();

            assert.match(rendered, /admin-toolbar\.min\.js/);
            assert.match(rendered, /data-page-context="home"/);
            assert.doesNotMatch(rendered, /data-site-analytics-enabled/);
            assert.doesNotMatch(rendered, /data-activitypub-enabled/);
            assert.doesNotMatch(rendered, /data-members-enabled/);
        });

        it('loads the admin toolbar script with tag metadata', async function () {
            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                },
                renderObject: {
                    tag: tags[0]
                }
            }))).toString();

            assert.match(rendered, /admin-toolbar\.min\.js/);
            assert.match(rendered, /data-resource-type="tag"/);
            assert.match(rendered, new RegExp(`data-resource-slug="${tags[0].slug}"`));
        });

        it('loads the admin toolbar script with page metadata', async function () {
            const rendered = (await ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                },
                renderObject: {
                    post: posts[0]
                }
            }))).toString();

            assert.match(rendered, /admin-toolbar\.min\.js/);
            assert.match(rendered, /data-resource-type="page"/);
            assert.match(rendered, new RegExp(`data-resource-id="${posts[0].id}"`));
        });

        it('can exclude the admin toolbar script', async function () {
            const rendered = (await ghost_head({hash: {exclude: 'admin_toolbar'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3',
                    staffFrontendToolsEnabled: true
                }
            })})).toString();

            assert.doesNotMatch(rendered, /admin-toolbar\.min\.js/);
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
            assert.match(rendered, /cards.min.js/);
            assert.match(rendered, /cards.min.css/);
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
            assert.doesNotMatch(rendered, /cards.min.js/);
            assert.doesNotMatch(rendered, /cards.min.css/);
        });
        it('does not load meta tags when excluded with metadata', async function () {
            let rendered = await testGhostHead({hash: {exclude: 'metadata'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            assert.doesNotMatch(rendered, /<link rel="canonical"/);
        });
        it('does not load schema when excluded with schema', async function () {
            let rendered = await testGhostHead({hash: {exclude: 'schema'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            assert.doesNotMatch(rendered, /<script type="application\/ld\+json"/);
        });
        it('does not load og: or twitter: attributes when excludd with social_data', async function () {
            let rendered = await testGhostHead({hash: {exclude: 'social_data'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            assert.doesNotMatch(rendered, /<meta property="og:/);
            assert.doesNotMatch(rendered, /<meta property="twitter:/);
        });
        it('does not load cta styles when excluded with cta_styles', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);
            let rendered = await testGhostHead({hash: {exclude: 'cta_styles'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })});
            assert.doesNotMatch(rendered, /.gh-post-upgrade-cta-content/);
        });
    });

    describe('superportal v3 mode', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://localhost:65530/'});
            // Set portal version to 3.0.0 to enable v3 mode
            configUtils.set('portal:version', '3.0.0');
            configUtils.set('portal:url', 'http://localhost:4180/portal.min.js');
        });

        function renderedFeatures(rendered) {
            const match = rendered.match(/data-features="([^"]*)"/);
            return match ? match[1].split(',') : [];
        }

        it('emits configured shell script tag instead of legacy scripts and state blob', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            // No inline state blob — the shell bootstraps client-side
            assert.doesNotMatch(rendered, /id="gh-portal-state"/);

            // Shell script tag with module type, config attributes, and marker
            assert.match(rendered, /type="module"/);
            assert.match(rendered, /data-superportal-shell/);
            assert.match(rendered, /localhost:4180\/portal\.min\.js/);
            assert.match(rendered, /data-ghost="http:\/\/localhost:65530\/"/);
            assert.match(rendered, /data-admin-url="http:\/\/localhost:65530\/"/);
            assert.match(rendered, /data-key="xyz"/);
            assert.match(rendered, /data-locale="en"/);

            // Legacy separate scripts must NOT appear
            assert.doesNotMatch(rendered, /portal@~\[\[VERSION\]\]/);
            assert.doesNotMatch(rendered, /sodo-search@/);
            assert.doesNotMatch(rendered, /announcement-bar@/);

            // CTA styles must not appear in v3
            assert.doesNotMatch(rendered, /gh-members-styles/);
        });

        it('data-features starts with members,share,gift when members_enabled', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /data-features="members,share,gift/);
        });

        it('features include announcement when content is set', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('announcement_content').returns('Hello world');
            getStub.withArgs('announcement_visibility').returns(['visitors']);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(renderedFeatures(rendered).includes('announcement'));
        });

        it('features include search when sodoSearch:url is configured', async function () {
            // The default config already has sodoSearch:url set, so search should appear
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(renderedFeatures(rendered).includes('search'));
        });

        it('emits stripe script when paid_members_enabled', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /js\.stripe\.com\/v3/);
        });

        it('does not emit stripe script when paid_members_enabled is false', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(false);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.doesNotMatch(rendered, /js\.stripe\.com/);
        });

        it('excludes members features when portal is excluded but keeps share', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead({hash: {exclude: 'portal'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            // members + gift are gated on members API; share is independent.
            const features = renderedFeatures(rendered);
            assert.ok(!features.includes('members'));
            assert.ok(!features.includes('gift'));
            assert.ok(features.includes('share'));
        });

        it('excludes share when explicitly excluded', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead({hash: {exclude: 'share'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            const features = renderedFeatures(rendered);
            assert.ok(!features.includes('share'));
            assert.ok(features.includes('members'));
        });

        it('excludes search from features when search is excluded', async function () {
            const rendered = await testGhostHead({hash: {exclude: 'search'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            assert.ok(!renderedFeatures(rendered).includes('search'));
        });

        it('includes offers when members and paid members are enabled', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(renderedFeatures(rendered).includes('offers'));
        });

        it('does not include offers when paid_members_enabled is false', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(!renderedFeatures(rendered).includes('offers'));
        });

        it('does not include offers when portal is excluded', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            const rendered = await testGhostHead({hash: {exclude: 'portal'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            assert.ok(!renderedFeatures(rendered).includes('offers'));
        });

        it('excludes offers when explicitly excluded', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);

            const rendered = await testGhostHead({hash: {exclude: 'offers'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            const features = renderedFeatures(rendered);
            assert.ok(!features.includes('offers'));
            assert.ok(features.includes('members'));
        });

        it('includes donations (and members) when donations_enabled', async function () {
            getStub.withArgs('donations_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            const features = renderedFeatures(rendered);
            assert.ok(features.includes('donations'));
            assert.ok(features.includes('members'));
        });

        it('does not include donations when donations_enabled is false', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(!renderedFeatures(rendered).includes('donations'));
        });

        it('excludes donations when explicitly excluded', async function () {
            getStub.withArgs('donations_enabled').returns(true);

            const rendered = await testGhostHead({hash: {exclude: 'donations'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            assert.ok(!renderedFeatures(rendered).includes('donations'));
        });

        it('includes recommendations when recommendations_enabled', async function () {
            getStub.withArgs('recommendations_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(renderedFeatures(rendered).includes('recommendations'));
        });

        it('does not include recommendations when recommendations_enabled is false', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.ok(!renderedFeatures(rendered).includes('recommendations'));
        });

        it('excludes recommendations when explicitly excluded', async function () {
            getStub.withArgs('recommendations_enabled').returns(true);

            const rendered = await testGhostHead({hash: {exclude: 'recommendations'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            assert.ok(!renderedFeatures(rendered).includes('recommendations'));
        });

        it('includes feedback and unsubscribe even with all member settings off', async function () {
            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            const features = renderedFeatures(rendered);
            assert.ok(features.includes('feedback'));
            assert.ok(features.includes('unsubscribe'));
        });

        it('excludes feedback when explicitly excluded', async function () {
            const rendered = await testGhostHead({hash: {exclude: 'feedback'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            const features = renderedFeatures(rendered);
            assert.ok(!features.includes('feedback'));
            assert.ok(features.includes('unsubscribe'));
        });

        it('excludes unsubscribe when explicitly excluded', async function () {
            const rendered = await testGhostHead({hash: {exclude: 'unsubscribe'}, ...testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })});

            const features = renderedFeatures(rendered);
            assert.ok(!features.includes('unsubscribe'));
            assert.ok(features.includes('feedback'));
        });

        it('emits the full canonical feature list when all gates are on', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('paid_members_enabled').returns(true);
            getStub.withArgs('donations_enabled').returns(true);
            getStub.withArgs('recommendations_enabled').returns(true);
            getStub.withArgs('announcement_content').returns('Hello world');
            getStub.withArgs('announcement_visibility').returns(['visitors']);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /data-features="members,share,gift,offers,donations,announcement,search,feedback,unsubscribe,recommendations"/);
        });

        it('renders no member data into the page', async function () {
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                renderObject: {
                    member: {
                        uuid: 'test-uuid',
                        email: 'test@example.com',
                        name: 'Test Member',
                        status: 'free',
                        subscriptions: [],
                        avatar_image: null
                    }
                },
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.doesNotMatch(rendered, /test@example\.com/);
            assert.doesNotMatch(rendered, /Test Member/);
        });

        it('remains in legacy mode when portal version is < 3.0.0', async function () {
            // Override both version and URL back to CDN defaults so we can
            // match the version-normalised pattern used by testGhostHead.
            configUtils.set('portal:version', '2.68');
            configUtils.set('portal:url', 'https://cdn.jsdelivr.net/ghost/portal@~{version}/umd/portal.min.js');
            getStub.withArgs('members_enabled').returns(true);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            // Should use legacy portal script, not v3 shell
            assert.match(rendered, /portal@~\[\[VERSION\]\]/);
            assert.doesNotMatch(rendered, /data-superportal-shell/);
            assert.doesNotMatch(rendered, /id="gh-portal-state"/);
        });

        it('data-features attribute on shell tag lists enabled features', async function () {
            getStub.withArgs('members_enabled').returns(true);
            getStub.withArgs('announcement_content').returns('Hi');
            getStub.withArgs('announcement_visibility').returns(['visitors', 'free_members', 'paid_members']);

            const rendered = await testGhostHead(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            }));

            assert.match(rendered, /data-features="members,share,gift,announcement,search,feedback,unsubscribe"/);
        });
    });
});
