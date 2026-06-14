const {agentProvider, fixtureManager, mockManager, resetRateLimits} = require('../../utils/e2e-framework');
const assert = require('node:assert/strict');

// The unit tests cover extraction and aggregation. This proves the wiring (route
// resolves, controller/service run, default serializer shapes the response), the
// private-flag gating (404 when off), and the access control: the library is
// visible to every staff role, scoped to the posts each role can see. Elevated
// roles (Owner/Administrator/Editor) see all media; Author/Contributor see only
// media from posts they author, mirroring Ghost's existing post visibility.
describe('Media Library API', function () {
    let agent;

    // A unique, root-relative image. Ghost stores it transform-ready
    // (__GHOST_URL__/content/images/...), which is exactly what the inventory
    // scans for, so a post carrying this feature_image is guaranteed to surface.
    const SCOPED_IMAGE = '/content/images/2099/01/media-library-author-scope-test.png';

    async function libraryUrls() {
        const {body} = await agent.get('/media/library/?limit=all').expectStatus(200);
        return body.media_library.map(item => item.url);
    }

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'posts');
    });

    // This suite logs in as several roles; reset the login rate limiter between
    // tests so the repeated logins don't trip brute-force protection.
    beforeEach(async function () {
        await resetRateLimits();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('returns 404 when the mediaLibrary flag is off', async function () {
        // The e2e fixtures enable all labs flags by default, so disable it here.
        mockManager.mockLabsDisabled('mediaLibrary');
        await agent.loginAsOwner();
        await agent.get('/media/library/').expectStatus(404);
    });

    describe('with the mediaLibrary flag enabled', function () {
        beforeEach(function () {
            mockManager.mockLabsEnabled('mediaLibrary');
        });

        it('lets an owner browse all media in use and returns a well-formed payload', async function () {
            await agent.loginAsOwner();
            await agent
                .get('/media/library/')
                .expectStatus(200)
                .expect(({body}) => {
                    assert.ok(Array.isArray(body.media_library));
                    assert.equal(typeof body.meta.count, 'number');
                    for (const item of body.media_library) {
                        assert.ok(['image', 'media', 'file'].includes(item.type));
                        assert.equal(typeof item.url, 'string');
                        assert.equal(typeof item.filename, 'string');
                        assert.ok(Array.isArray(item.used_in));
                    }
                });
        });

        it('lets an administrator browse all media in use', async function () {
            await agent.loginAsAdmin();
            await agent.get('/media/library/').expectStatus(200);
        });

        it('lets an editor browse all media in use (elevated role)', async function () {
            await agent.loginAsEditor();
            await agent.get('/media/library/').expectStatus(200);
        });

        it('scopes the library to the requesting author and is visible to every role', async function () {
            // Create a post authored by the Author role, carrying a unique image.
            // Authors may only add posts they own, so the author must be set
            // explicitly (the admin client does the same).
            await agent.loginAsAuthor();
            const {body: me} = await agent.get('/users/me/').expectStatus(200);
            const authorId = me.users[0].id;
            await agent
                .post('/posts/')
                .body({posts: [{
                    title: 'Author scope fixture',
                    feature_image: SCOPED_IMAGE,
                    status: 'draft',
                    authors: [{id: authorId}]
                }]})
                .expectStatus(201);

            // The Author can browse the library and sees their own post's media.
            const authorUrls = await libraryUrls();
            assert.ok(
                authorUrls.some(url => url.endsWith(SCOPED_IMAGE)),
                'author should see media from their own post'
            );

            // An elevated role (Owner) sees everything, including the Author's media.
            await agent.loginAsOwner();
            const ownerUrls = await libraryUrls();
            assert.ok(
                ownerUrls.some(url => url.endsWith(SCOPED_IMAGE)),
                'owner should see the author\'s media'
            );
            // Scoping never invents items: the author's view is a subset of the owner's.
            assert.ok(authorUrls.length <= ownerUrls.length);
            for (const url of authorUrls) {
                assert.ok(ownerUrls.includes(url), `owner view should contain ${url}`);
            }

            // A different non-elevated role (Contributor) does NOT see the Author's
            // media, because they do not author that post.
            await agent.loginAsContributor();
            const contributorUrls = await libraryUrls();
            assert.ok(
                !contributorUrls.some(url => url.endsWith(SCOPED_IMAGE)),
                'contributor must not see another author\'s media'
            );
        });
    });
});
