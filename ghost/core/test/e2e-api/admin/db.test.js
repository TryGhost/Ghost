const {agentProvider, fixtureManager, matchers, assertions, mockManager} = require('../../utils/e2e-framework');
const {anyContentVersion, anyErrorId, anyEtag, anyContentLength, stringMatching} = matchers;
const {cacheInvalidateHeaderNotSet, cacheInvalidateHeaderSetToWildcard} = assertions;
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');
const path = require('path');
const assert = require('assert/strict');

describe('DB API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockEvents();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can export a JSON database', async function () {
        await agent
            .get('db/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
                'content-disposition': stringMatching(/^Attachment; filename="[A-Za-z0-9._-]+\.json"$/),
                etag: anyEtag
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.db.length, 1);
                assert.ok(body.db[0].data);
                const dataKeys = Object.keys(exportedBodyLatest().db[0].data).sort();

                // NOTE: using `Object.keys` here instead of `should.have.only.keys` assertion
                //       because when `have.only.keys` fails there's no useful diff
                assert.deepEqual(Object.keys(body.db[0].data).sort(), dataKeys);
            });
    });

    it('Can delete all content', async function () {
        // First check we have posts
        await agent
            .get('posts/')
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.posts.length, 7);
            });

        // Delete all content
        await agent
            .delete('db/')
            .expectStatus(204)
            .expectEmptyBody()
            .expect(cacheInvalidateHeaderSetToWildcard())
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Check posts are gone
        await agent
            .get('posts/')
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.posts.length, 0);
            });

        // Check events were triggered
        // Note: The new framework only supports basic event assertion without counts
        mockManager.assert.emittedEvent('post.unpublished');
        mockManager.assert.emittedEvent('post.deleted');
        mockManager.assert.emittedEvent('tag.deleted');
    });

    it('Can trigger external media inliner', async function () {
        await agent
            .post('db/media/inline')
            .body({
                domains: ['https://example.com']
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            // @NOTE: the response format is temporary for test purposes
            //        before feature graduates to GA, it should become
            //        a more consistent format
            .matchBodySnapshot({
                db: [{
                    status: 'success'
                }]
            });
    });

    it('Handles invalid zip file uploads (central directory)', async function () {
        await agent
            .post('db/')
            .attach('importfile', path.join(__dirname, '../../utils/fixtures/import/zips/empty.zip'))
            .expectStatus(415)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it('Handles invalid zip file uploads (malformed comments)', async function () {
        await agent
            .post('db/')
            .attach('importfile', path.join(__dirname, '../../utils/fixtures/import/zips/malformed-comments.zip'))
            .expectStatus(415)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });
});
