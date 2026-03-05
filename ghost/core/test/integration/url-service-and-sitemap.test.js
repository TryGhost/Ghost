const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../utils');
const models = require('../../core/server/models');
const UrlService = require('../../core/server/services/url/url-service');
const SiteMapManager = require('../../core/frontend/services/sitemap/site-map-manager');

/**
 * Integration test that boots the URL service with custom fixtures and verifies
 * both the URL cache state AND sitemap output from the same entrypoint.
 *
 * This serves as a safety net for refactoring: any change to the URL service
 * boot path, event emission, or sitemap wiring must pass these assertions.
 *
 * Tests focus on outcomes:
 * - Which URLs appear in the sitemap
 * - Which URLs do NOT appear (drafts, canonical, no-post resources)
 * - URL paths match the configured permalink structure
 */
describe('Integration: URL Service + Sitemap', function () {
    let urlService;
    let siteMapManager;
    const fixtures = {};

    before(function () {
        models.init();
    });

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles'));

    // Insert custom fixture data so the test is self-documenting
    before(async function () {
        const {forKnex, markdownToMobiledoc} = testUtils.DataGenerator;

        // Tags
        fixtures.tagJs = forKnex.createTag({name: 'JavaScript', slug: 'javascript'});
        fixtures.tagNode = forKnex.createTag({name: 'Node.js', slug: 'nodejs'});
        fixtures.tagOrphan = forKnex.createTag({name: 'Orphan Tag', slug: 'orphan-tag'});

        await models.Tag.add(fixtures.tagJs, testUtils.context.internal);
        await models.Tag.add(fixtures.tagNode, testUtils.context.internal);
        await models.Tag.add(fixtures.tagOrphan, testUtils.context.internal);

        // Posts — published, non-featured
        fixtures.postBasic = forKnex.createPost({
            slug: 'basic-post',
            title: 'Basic Post',
            status: 'published',
            featured: false,
            published_at: new Date('2024-06-01T12:00:00Z'),
            mobiledoc: markdownToMobiledoc('Content'),
            tags: [{id: fixtures.tagJs.id}]
        });
        await models.Post.add(fixtures.postBasic, testUtils.context.internal);

        fixtures.postWithImage = forKnex.createPost({
            slug: 'post-with-image',
            title: 'Post With Image',
            status: 'published',
            featured: false,
            published_at: new Date('2024-07-15T12:00:00Z'),
            feature_image: 'https://example.com/photo.jpg',
            mobiledoc: markdownToMobiledoc('Content'),
            tags: [{id: fixtures.tagJs.id}, {id: fixtures.tagNode.id}]
        });
        await models.Post.add(fixtures.postWithImage, testUtils.context.internal);

        // Post — published, featured
        fixtures.postFeatured = forKnex.createPost({
            slug: 'featured-post',
            title: 'Featured Post',
            status: 'published',
            featured: true,
            published_at: new Date('2024-08-01T12:00:00Z'),
            mobiledoc: markdownToMobiledoc('Featured content'),
            tags: [{id: fixtures.tagNode.id}]
        });
        await models.Post.add(fixtures.postFeatured, testUtils.context.internal);

        // Post — published with canonical_url (should be excluded from sitemap)
        fixtures.postCanonical = forKnex.createPost({
            slug: 'canonical-post',
            title: 'Canonical Post',
            status: 'published',
            featured: false,
            published_at: new Date('2024-09-01T12:00:00Z'),
            canonical_url: 'https://external-blog.com/original-article',
            mobiledoc: markdownToMobiledoc('Syndicated content')
        });
        await models.Post.add(fixtures.postCanonical, testUtils.context.internal);

        // Post — published with no tags (tests primary_tag 'all' fallback)
        fixtures.postNoTags = forKnex.createPost({
            slug: 'no-tags-post',
            title: 'Post Without Tags',
            status: 'published',
            featured: false,
            published_at: new Date('2024-10-01T12:00:00Z'),
            mobiledoc: markdownToMobiledoc('Content without tags')
        });
        await models.Post.add(fixtures.postNoTags, testUtils.context.internal);

        // Post — draft (should not appear anywhere)
        fixtures.postDraft = forKnex.createPost({
            slug: 'draft-post',
            title: 'Draft Post',
            status: 'draft',
            featured: false,
            mobiledoc: markdownToMobiledoc('Draft content')
        });
        await models.Post.add(fixtures.postDraft, testUtils.context.internal);

        // Page — published
        fixtures.pageAbout = forKnex.createPost({
            slug: 'about',
            title: 'About Us',
            type: 'page',
            status: 'published',
            mobiledoc: markdownToMobiledoc('About page')
        });
        await models.Post.add(fixtures.pageAbout, testUtils.context.internal);

        // Page — draft (should not appear)
        fixtures.pageDraft = forKnex.createPost({
            slug: 'draft-page',
            title: 'Draft Page',
            type: 'page',
            status: 'draft',
            mobiledoc: markdownToMobiledoc('Draft page')
        });
        await models.Post.add(fixtures.pageDraft, testUtils.context.internal);
    });

    after(testUtils.teardownDb);

    after(function () {
        sinon.restore();
    });

    /**
     * Helper: boot a UrlService with the given generators and wait until finished.
     * Also creates a fresh SiteMapManager that listens to url.added events.
     */
    function bootUrlServiceAndSitemap(generators, done) {
        urlService = new UrlService();
        siteMapManager = new SiteMapManager();

        generators.forEach(({id, filter, resourceType, permalink}) => {
            urlService.onRouterAddedType(id, filter, resourceType, permalink);
        });

        urlService.init();

        (function retry() {
            if (urlService.hasFinished()) {
                return done();
            }
            setTimeout(retry, 50);
        })();
    }

    /**
     * Helper: extract all <loc> URLs from sitemap XML.
     */
    function extractLocs(xml) {
        if (!xml) {
            return [];
        }
        const locs = [];
        const regex = /<loc>(.*?)<\/loc>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            locs.push(match[1]);
        }
        return locs;
    }

    /**
     * Helper: extract all <image:loc> URLs from sitemap XML.
     */
    function extractImageLocs(xml) {
        if (!xml) {
            return [];
        }
        const locs = [];
        const regex = /<image:loc>(.*?)<\/image:loc>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            locs.push(match[1]);
        }
        return locs;
    }

    describe('default routing (single collection)', function () {
        before(function (done) {
            bootUrlServiceAndSitemap([
                {id: 'posts-gen', filter: 'featured:false', resourceType: 'posts', permalink: '/:slug/'},
                {id: 'authors-gen', filter: null, resourceType: 'authors', permalink: '/author/:slug/'},
                {id: 'tags-gen', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
                {id: 'pages-gen', filter: null, resourceType: 'pages', permalink: '/:slug/'}
            ], done);
        });

        after(function () {
            urlService.reset();
        });

        // --- Posts ---

        it('sitemap contains published non-featured posts at correct paths', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(locs.some(l => l.includes('/basic-post/')), 'basic-post should be in sitemap');
            assert.ok(locs.some(l => l.includes('/post-with-image/')), 'post-with-image should be in sitemap');
        });

        it('sitemap excludes featured posts from a featured:false collection', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(!locs.some(l => l.includes('/featured-post/')), 'featured-post should NOT be in sitemap');
        });

        it('sitemap excludes posts with canonical_url', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(!locs.some(l => l.includes('/canonical-post/')), 'post with canonical_url should NOT be in sitemap');
        });

        it('sitemap excludes draft posts', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(!locs.some(l => l.includes('/draft-post/')), 'draft post should NOT be in sitemap');
        });

        it('sitemap includes image nodes for posts with feature_image', function () {
            const imageLocs = extractImageLocs(siteMapManager.posts.getXml());

            assert.ok(imageLocs.some(l => l.includes('photo.jpg')), 'feature_image should appear as image:loc');
        });

        // --- Pages ---

        it('sitemap contains published pages', function () {
            const locs = extractLocs(siteMapManager.pages.getXml());

            assert.ok(locs.some(l => l.includes('/about/')), 'about page should be in sitemap');
        });

        it('sitemap excludes draft pages', function () {
            const xml = siteMapManager.pages.getXml();
            const locs = extractLocs(xml);

            assert.ok(!locs.some(l => l.includes('/draft-page/')), 'draft page should NOT be in sitemap');
        });

        // --- Tags ---

        it('sitemap contains tags that have published posts', function () {
            const locs = extractLocs(siteMapManager.tags.getXml());

            assert.ok(locs.some(l => l.includes('/tag/javascript/')), 'javascript tag should be in sitemap');
            assert.ok(locs.some(l => l.includes('/tag/nodejs/')), 'nodejs tag should be in sitemap');
        });

        it('sitemap excludes tags with no published posts', function () {
            const locs = extractLocs(siteMapManager.tags.getXml());

            assert.ok(!locs.some(l => l.includes('/tag/orphan-tag/')), 'orphan tag should NOT be in sitemap');
        });

        // --- Authors ---

        it('sitemap contains authors that have published posts', function () {
            const locs = extractLocs(siteMapManager.users.getXml());

            // The owner user from users:roles setup is the author of our custom posts
            assert.ok(locs.some(l => l.includes('/author/')), 'at least one author should be in sitemap');
        });

        // --- Cross-cutting ---

        it('every URL in every sitemap resolves to a real resource', function () {
            const allLocs = [
                ...extractLocs(siteMapManager.posts.getXml()),
                ...extractLocs(siteMapManager.pages.getXml()),
                ...extractLocs(siteMapManager.tags.getXml()),
                ...extractLocs(siteMapManager.users.getXml())
            ];

            assert.ok(allLocs.length > 0, 'sitemaps should contain at least one URL');

            allLocs.forEach(function (loc) {
                // Extract the path from the absolute URL
                const url = new URL(loc);
                const resource = urlService.getResource(url.pathname);
                assert.ok(resource, `sitemap contains ${url.pathname} but URL service has no resource for it`);
            });
        });
    });

    describe('custom routing (multiple collections)', function () {
        before(testUtils.teardownDb);
        before(testUtils.setup('users:roles'));

        // Re-insert fixtures after DB teardown
        before(async function () {
            // Reuse the same fixture objects (they have the same IDs)
            await models.Tag.add(fixtures.tagJs, testUtils.context.internal);
            await models.Tag.add(fixtures.tagNode, testUtils.context.internal);
            await models.Tag.add(fixtures.tagOrphan, testUtils.context.internal);

            await models.Post.add(fixtures.postBasic, testUtils.context.internal);
            await models.Post.add(fixtures.postWithImage, testUtils.context.internal);
            await models.Post.add(fixtures.postFeatured, testUtils.context.internal);
            await models.Post.add(fixtures.postCanonical, testUtils.context.internal);
            await models.Post.add(fixtures.postNoTags, testUtils.context.internal);
            await models.Post.add(fixtures.postDraft, testUtils.context.internal);
            await models.Post.add(fixtures.pageAbout, testUtils.context.internal);
        });

        before(function (done) {
            bootUrlServiceAndSitemap([
                {id: 'featured-gen', filter: 'featured:true', resourceType: 'posts', permalink: '/featured/:slug/'},
                {id: 'posts-gen', filter: 'type:post', resourceType: 'posts', permalink: '/blog/:year/:slug/'},
                {id: 'authors-gen', filter: null, resourceType: 'authors', permalink: '/writer/:slug/'},
                {id: 'tags-gen', filter: null, resourceType: 'tags', permalink: '/topic/:slug/'},
                {id: 'pages-gen', filter: null, resourceType: 'pages', permalink: '/:slug/'}
            ], done);
        });

        after(function () {
            urlService.resetGenerators();
        });

        it('featured posts appear under the featured collection path', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(
                locs.some(l => l.includes('/featured/featured-post/')),
                'featured post should be under /featured/'
            );
        });

        it('non-featured posts appear under the blog collection path', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(
                locs.some(l => l.includes('/blog/2024/basic-post/')),
                'basic post should be under /blog/:year/'
            );
            assert.ok(
                locs.some(l => l.includes('/blog/2024/post-with-image/')),
                'post-with-image should be under /blog/:year/'
            );
        });

        it('featured posts do NOT appear under the blog path', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(
                !locs.some(l => l.includes('/blog/') && l.includes('/featured-post/')),
                'featured post should NOT be under /blog/'
            );
        });

        it('tags use custom topic paths in sitemap', function () {
            const locs = extractLocs(siteMapManager.tags.getXml());

            assert.ok(
                locs.some(l => l.includes('/topic/javascript/')),
                'tags should use /topic/ path'
            );
        });

        it('authors use custom writer paths in sitemap', function () {
            const locs = extractLocs(siteMapManager.users.getXml());

            assert.ok(
                locs.some(l => l.includes('/writer/')),
                'authors should use /writer/ path'
            );
        });

        it('canonical posts are still excluded from sitemap', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(
                !locs.some(l => l.includes('/canonical-post/')),
                'post with canonical_url should NOT be in sitemap regardless of collection'
            );
        });
    });

    describe('primary_tag and primary_author permalink patterns', function () {
        before(testUtils.teardownDb);
        before(testUtils.setup('users:roles'));

        before(async function () {
            await models.Tag.add(fixtures.tagJs, testUtils.context.internal);
            await models.Tag.add(fixtures.tagNode, testUtils.context.internal);
            await models.Tag.add(fixtures.tagOrphan, testUtils.context.internal);

            await models.Post.add(fixtures.postBasic, testUtils.context.internal);
            await models.Post.add(fixtures.postWithImage, testUtils.context.internal);
            await models.Post.add(fixtures.postFeatured, testUtils.context.internal);
            await models.Post.add(fixtures.postCanonical, testUtils.context.internal);
            await models.Post.add(fixtures.postNoTags, testUtils.context.internal);
            await models.Post.add(fixtures.postDraft, testUtils.context.internal);
            await models.Post.add(fixtures.pageAbout, testUtils.context.internal);
        });

        before(function (done) {
            bootUrlServiceAndSitemap([
                {id: 'posts-gen', filter: null, resourceType: 'posts', permalink: '/:primary_author/:primary_tag/:slug/'},
                {id: 'authors-gen', filter: null, resourceType: 'authors', permalink: '/author/:slug/'},
                {id: 'tags-gen', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
                {id: 'pages-gen', filter: null, resourceType: 'pages', permalink: '/:slug/'}
            ], done);
        });

        after(function () {
            urlService.resetGenerators();
        });

        it('posts use primary_author and primary_tag slugs in URL path', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            // basic-post: primary_author=joe-bloggs (owner), primary_tag=javascript
            assert.ok(
                locs.some(l => l.includes('/joe-bloggs/javascript/basic-post/')),
                'basic-post should have primary_author and primary_tag slugs in path'
            );
        });

        it('posts without tags use "all" fallback for primary_tag', function () {
            const locs = extractLocs(siteMapManager.posts.getXml());

            assert.ok(
                locs.some(l => l.includes('/joe-bloggs/all/no-tags-post/')),
                'post without tags should use "all" as primary_tag fallback'
            );
        });

        it('URL service resolves primary_author/primary_tag URLs to resources', function () {
            const resource = urlService.getResource('/joe-bloggs/javascript/basic-post/');
            assert.ok(resource, 'primary_author/primary_tag URL should resolve to a resource');
            assert.equal(resource.data.slug, 'basic-post');
        });
    });
});
