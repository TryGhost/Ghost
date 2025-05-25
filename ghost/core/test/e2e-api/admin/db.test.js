const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyContentVersion, anyErrorId, anyEtag, anyContentLength, stringMatching} = matchers;
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const assert = require('assert/strict');
const mime = require('mime-types');

const attachFile = async (name, filePath) => {
    const formData = new FormData();
    const fullFilePath = path.join(__dirname, filePath);
    const fileContent = await fs.readFile(fullFilePath);

    formData.append(name, fileContent, {
        filename: path.basename(fullFilePath),
        contentType: mime.lookup(fullFilePath) || 'application/octet-stream'
    });

    return formData;
};

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
            .body(await attachFile('importfile', '../../utils/fixtures/import/zips/empty.zip'))
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
            .body(await attachFile('importfile', '../../utils/fixtures/import/zips/malformed-comments.zip'))
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
