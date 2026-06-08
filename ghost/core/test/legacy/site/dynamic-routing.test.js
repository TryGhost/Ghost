// # Dynamic Routing Tests
// As it stands, these tests depend on the database, and as such are integration tests.
// These tests are here to cover the headers sent with requests and high-level redirects that can't be
// tested with the unit tests
const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const supertest = require('supertest');
const sinon = require('sinon');
const moment = require('moment');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const cheerio = require('cheerio');
const config = require('../../../core/shared/config');
const themeEngine = require('../../../core/frontend/services/theme-engine');

let request;

describe('Dynamic Routing', function () {
    /**
     * @param {Readonly<Record<string, string>>} headers
     */
    function assertCorrectHeaders(headers) {
        assert.equal(headers['x-cache-invalidate'], undefined);
        assert.equal(headers['X-CSRF-Token'], undefined);
        assert.equal(headers['set-cookie'], undefined);
        assertExists(headers.date);
    }

    before(async function () {
        await testUtils.startGhost({
            copyThemes: true,
            copySettings: true,
            redirectsFile: true
        });

        sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(5);
        request = supertest.agent(config.get('url'));
    });

    after(function () {
        sinon.restore();
    });

    describe('Collection Index', function () {
        it('should respond with html', async function () {
            const res = await request.get('/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            assertCorrectHeaders(res.headers);

            const $ = cheerio.load(res.text);
            assert.equal($('title').text(), 'Ghost');
            assert.equal($('body.home-template').length, 1);
            assert.equal($('article.post').length, 7);
        });

        it('should not have a third page', async function () {
            const res = await request.get('/page/3/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });
    });

    describe('Collection Entry', function () {
        before(function () {
            return testUtils.initData().then(function () {
                return testUtils.fixtures.overrideOwnerUser();
            }).then(function () {
                return testUtils.fixtures.insertPostsAndTags();
            });
        });

        it('should render page with slug permalink', async function () {
            const res = await request.get('/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);
            assertCorrectHeaders(res.headers);
        });

        it('should not render page with dated permalink', async function () {
            const date = moment().format('YYYY/MM/DD');

            const res = await request.get('/' + date + '/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404);
            assertCorrectHeaders(res.headers);
        });
    });

    describe('Tag', function () {
        before(async function () {
            await testUtils.teardownDb();
            await testUtils.initData();
            await testUtils.fixtures.overrideOwnerUser('ghost-owner');
        });

        after(testUtils.teardownDb);

        it('should return HTML for valid route', async function () {
            const res = await request.get('/tag/getting-started/')
                .expect(200)
                .expect('Content-Type', /html/)
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            assertCorrectHeaders(res.headers);

            const $ = cheerio.load(res.text);
            assert.equal($('body').attr('class'), 'tag-template tag-getting-started has-sans-title has-sans-body');
            assert.equal($('article.post').length, 5);
        });

        it('should 404 for /tag/ route', async function () {
            const res = await request.get('/tag/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });

        it('should 404 for unknown tag', async function () {
            const res = await request.get('/tag/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });

        it('should 404 for unknown tag with invalid characters', async function () {
            const res = await request.get('/tag/~$pectacular~/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });

        describe('RSS', function () {
            it('should redirect without slash', async function () {
                const res = await request.get('/tag/getting-started/rss')
                    .expect('Location', '/tag/getting-started/rss/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should respond with xml', async function () {
                const res = await request.get('/tag/getting-started/rss/')
                    .expect('Content-Type', /xml/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200);
                assertCorrectHeaders(res.headers);
            });
        });

        describe('Edit', function () {
            it('should redirect without slash', async function () {
                const res = await request.get('/tag/getting-started/edit')
                    .expect('Location', '/tag/getting-started/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should redirect to tag settings', async function () {
                const res = await request.get('/tag/getting-started/edit/')
                    .expect('Location', /\/ghost\/#\/tags\/getting-started\//)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302);
                assertCorrectHeaders(res.headers);
            });

            it('should 404 for non-edit parameter', async function () {
                const res = await request.get('/tag/getting-started/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.noCache)
                    .expect(404)
                    .expect(/Page not found/);
                assertCorrectHeaders(res.headers);
            });
        });

        describe('Edit with admin redirects disabled', function () {
            before(function () {
                configUtils.set('admin:redirects', false);

                return testUtils.startGhost()
                    .then(function () {
                        sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(5);
                        request = supertest.agent(config.get('url'));
                    });
            });

            after(async function () {
                await configUtils.restore();

                await testUtils.startGhost();
                sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(5);
                request = supertest.agent(config.get('url'));
            });

            it('should redirect without slash', async function () {
                const res = await request.get('/tag/getting-started/edit')
                    .expect('Location', '/tag/getting-started/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should not redirect to admin', async function () {
                const res = await request.get('/tag/getting-started/edit/')
                    .expect(404)
                    .expect('Cache-Control', testUtils.cacheRules.noCache);
                assertCorrectHeaders(res.headers);
            });
        });
    });

    describe('Author', function () {
        const lockedUser = {
            name: 'Locked so what',
            slug: 'locked-so-what',
            email: 'locked@example.com',
            status: 'locked'
        };

        const suspendedUser = {
            name: 'Suspended meeh',
            slug: 'suspended-meeh',
            email: 'suspended@example.com',
            status: 'inactive'
        };

        const ownerSlug = 'ghost-owner';

        before(async function () {
            await testUtils.teardownDb();
            // we initialise data, but not a user. No user should be required for navigating the frontend
            await testUtils.initData();

            {
                const insertedUser = await testUtils.fixtures.overrideOwnerUser(ownerSlug);
                await testUtils.fixtures.insertPosts([
                    testUtils.DataGenerator.forKnex.createPost({
                        authors: [{
                            id: insertedUser.id
                        }]
                    })
                ]);
            }

            {
                const insertedUser = await testUtils.fixtures.insertOneUser(lockedUser);
                await testUtils.fixtures.insertPosts([
                    testUtils.DataGenerator.forKnex.createPost({
                        authors: [{
                            id: insertedUser.id
                        }]
                    })
                ]);
            }

            {
                const insertedUser = await testUtils.fixtures.insertOneUser(suspendedUser);
                await testUtils.fixtures.insertPosts([
                    testUtils.DataGenerator.forKnex.createPost({
                        authors: [{
                            id: insertedUser.id
                        }]
                    })
                ]);
            }
        });

        after(testUtils.teardownDb);

        it('should 404 for /author/ route', async function () {
            const res = await request.get('/author/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });

        it('should 404 for unknown author', async function () {
            const res = await request.get('/author/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });

        it('should 404 for unknown author with invalid characters', async function () {
            const res = await request.get('/author/ghost!user^/')
                .expect('Cache-Control', testUtils.cacheRules.noCache)
                .expect(404)
                .expect(/Page not found/);
            assertCorrectHeaders(res.headers);
        });

        it('[success] author is locked', async function () {
            const res = await request.get('/author/' + lockedUser.slug + '/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);
            assertCorrectHeaders(res.headers);
        });

        it('[success] author is suspended', async function () {
            const res = await request.get('/author/' + suspendedUser.slug + '/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);
            assertCorrectHeaders(res.headers);
        });

        it('[failure] ghost owner before blog setup', async function () {
            await testUtils.fixtures.changeOwnerUserStatus({
                slug: ownerSlug,
                status: 'inactive'
            });
            const res = await request.get('/author/ghost-owner/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);
            assertCorrectHeaders(res.headers);
        });

        it('[success] ghost owner after blog setup', async function () {
            await testUtils.fixtures.changeOwnerUserStatus({
                slug: ownerSlug,
                status: 'active'
            });
            const res = await request.get('/author/ghost-owner/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);
            assertCorrectHeaders(res.headers);
        });

        describe('RSS', function () {
            it('should redirect without slash', async function () {
                const res = await request.get('/author/ghost-owner/rss')
                    .expect('Location', '/author/ghost-owner/rss/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should respond with xml', async function () {
                const res = await request.get('/author/ghost-owner/rss/')
                    .expect('Content-Type', /xml/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200);
                assertCorrectHeaders(res.headers);
            });
        });

        describe('Edit', function () {
            it('should redirect without slash', async function () {
                const res = await request.get('/author/ghost-owner/edit')
                    .expect('Location', '/author/ghost-owner/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should redirect to editor', async function () {
                const res = await request.get('/author/ghost-owner/edit/')
                    .expect('Location', /\/ghost\/#\/settings\/staff\/ghost-owner\//)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302);
                assertCorrectHeaders(res.headers);
            });

            it('should 404 for something that isn\'t edit', async function () {
                const res = await request.get('/author/ghost-owner/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.noCache)
                    .expect(404)
                    .expect(/Page not found/);
                assertCorrectHeaders(res.headers);
            });
        });

        describe('Edit with admin redirects disabled', function () {
            before(function () {
                configUtils.set('admin:redirects', false);

                return testUtils.startGhost()
                    .then(function () {
                        sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(5);
                        request = supertest.agent(config.get('url'));
                    });
            });

            after(async function () {
                await configUtils.restore();

                await testUtils.startGhost();
                sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(5);
                request = supertest.agent(config.get('url'));
            });

            it('should redirect without slash', async function () {
                const res = await request.get('/author/ghost-owner/edit')
                    .expect('Location', '/author/ghost-owner/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should not redirect to admin', async function () {
                const res = await request.get('/author/ghost-owner/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.noCache)
                    .expect(404);
                assertCorrectHeaders(res.headers);
            });
        });

        describe('Paged', function () {
            // Add enough posts to trigger pages
            before(async function () {
                await testUtils.teardownDb();
                // we initialize data, but not a user. No user should be required for navigating the frontend
                await testUtils.initData();
                await testUtils.fixtures.insertPostsAndTags();
                await testUtils.fixtures.insertExtraPosts(9);
                await testUtils.fixtures.overrideOwnerUser('ghost-owner');
            });

            after(testUtils.teardownDb);

            it('should redirect without slash', async function () {
                const res = await request.get('/author/ghost-owner/page/2')
                    .expect('Location', '/author/ghost-owner/page/2/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should respond with html', async function () {
                const res = await request.get('/author/ghost-owner/page/2/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200);
                assertCorrectHeaders(res.headers);
            });

            it('should redirect page 1', async function () {
                const res = await request.get('/author/ghost-owner/page/1/')
                    .expect('Location', '/author/ghost-owner/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301);
                assertCorrectHeaders(res.headers);
            });

            it('should 404 if page too high', async function () {
                const res = await request.get('/author/ghost-owner/page/6/')
                    .expect('Cache-Control', testUtils.cacheRules.noCache)
                    .expect(404)
                    .expect(/Page not found/);
                assertCorrectHeaders(res.headers);
            });

            it('should 404 if page too low', async function () {
                const res = await request.get('/author/ghost-owner/page/0/')
                    .expect('Cache-Control', testUtils.cacheRules.noCache)
                    .expect(404)
                    .expect(/Page not found/);
                assertCorrectHeaders(res.headers);
            });

            describe('RSS', function () {
                it('should 404 if index attempted with 0', async function () {
                    const res = await request.get('/author/ghost-owner/rss/0/')
                        .expect('Cache-Control', testUtils.cacheRules.noCache)
                        .expect(404)
                        .expect(/Page not found/);
                    assertCorrectHeaders(res.headers);
                });

                it('should 404 if index attempted with 1', async function () {
                    const res = await request.get('/author/ghost-owner/rss/1/')
                        .expect('Cache-Control', testUtils.cacheRules.noCache)
                        .expect(404)
                        .expect(/Page not found/);
                    assertCorrectHeaders(res.headers);
                });

                it('should 404 for other pages', async function () {
                    const res = await request.get('/author/ghost-owner/rss/2/')
                        .expect('Cache-Control', testUtils.cacheRules.noCache)
                        .expect(404)
                        .expect(/Page not found/);
                    assertCorrectHeaders(res.headers);
                });
            });
        });
    });
});
