const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyContentLength} = matchers;
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

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
        const {body, headers} = await agent
            .get('db/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
                etag: anyEtag
            });

        // Check content-disposition header separately
        headers['content-disposition'].should.match(/^Attachment; filename="[A-Za-z0-9._-]+\.json"$/);

        // Validate the response body
        body.db.should.have.length(1);

        const dataKeys = Object.keys(exportedBodyLatest().db[0].data).sort();

        // NOTE: using `Object.keys` here instead of `should.have.only.keys` assertion
        //       because when `have.only.keys` fails there's no useful diff
        Object.keys(body.db[0].data).sort().should.be.eql(dataKeys);
    });

    it('Can delete all content', async function () {
        // First check we have posts
        const {body: initialBody} = await agent
            .get('posts/')
            .expectStatus(200);

        initialBody.posts.should.have.length(7);

        // Delete all content
        await agent
            .delete('db/')
            .expectStatus(204)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Check posts are gone
        const {body: finalBody} = await agent
            .get('posts/')
            .expectStatus(200);

        finalBody.posts.should.have.length(0);

        // Check events were triggered
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
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyErrorId,
                    message: 'The uploaded zip could not be read'
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
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyErrorId,
                    message: 'The uploaded zip could not be read'
                }]
            });
    });
});
