const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyContentVersion, anyErrorId, anyEtag, anyContentLength, stringMatching} = matchers;
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const assert = require('assert/strict');

// Helper function for x-cache-invalidate header assertions
const assertCacheInvalidation = (pattern) => {
    return ({headers}) => {
        if (pattern === false) {
            // Assert header should not exist
            assert.equal(headers['x-cache-invalidate'], undefined,
                'x-cache-invalidate header should not be present');
        } else if (pattern) {
            // Assert header matches pattern
            assert.ok(headers['x-cache-invalidate'],
                'x-cache-invalidate header should be present');
            assert.equal(headers['x-cache-invalidate'], pattern,
                `x-cache-invalidate should be "${pattern}"`);
        }
    };
};

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
            .expect(assertCacheInvalidation(false))
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
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(assertCacheInvalidation('/*'));

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
            .matchBodySnapshot({
                db: [{
                    status: 'success'
                }]
            });
    });

    it('Handles invalid zip file uploads (central directory)', async function () {
        const formData = new FormData();
        const filePath = path.join(__dirname, '../../utils/fixtures/import/zips/empty.zip');
        const fileContent = await fs.readFile(filePath);
        formData.append('importfile', fileContent, {
            filename: 'empty.zip',
            contentType: 'application/zip'
        });

        await agent
            .post('db/')
            .body(formData)
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
        const formData = new FormData();
        const filePath = path.join(__dirname, '../../utils/fixtures/import/zips/malformed-comments.zip');
        const fileContent = await fs.readFile(filePath);
        formData.append('importfile', fileContent, {
            filename: 'malformed-comments.zip',
            contentType: 'application/zip'
        });

        await agent
            .post('db/')
            .body(formData)
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
