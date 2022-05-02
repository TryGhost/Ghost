const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyErrorId, stringMatching, anyEtag} = matchers;

describe('API Versioning', function () {
    describe('Admin API', function () {
        let agentAdminAPI;

        before(async function () {
            agentAdminAPI = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init();
            await agentAdminAPI.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('responds with no content version header when accept version header is NOT PRESENT', async function () {
            await agentAdminAPI
                .get('site/')
                .expectStatus(200)
                .matchBodySnapshot({
                    site: {
                        version: stringMatching(/\d+\.\d+/)
                    }
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('responds with current content version header when requested version is BEHIND current version and CAN respond', async function () {
            await agentAdminAPI
                .get('site/')
                .header('Accept-Version', 'v3.0')
                .expectStatus(200)
                .matchBodySnapshot({
                    site: {
                        version: stringMatching(/\d+\.\d+/)
                    }
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': stringMatching(/v\d+\.\d+/)
                });
        });

        it('responds with current content version header when requested version is AHEAD and CAN respond', async function () {
            await agentAdminAPI
                .get('site/')
                .header('Accept-Version', 'v999.5')
                .expectStatus(200)
                .matchBodySnapshot({
                    site: {
                        version: stringMatching(/\d+\.\d+/)
                    }
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': stringMatching(/v\d+\.\d+/)
                });
        });

        it('responds with error requested version is AHEAD and CANNOT respond', async function () {
            // CASE 2: If accept-version is behind, send a 406 & tell them the client needs updating.
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v999.1')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v999\.1 is ahead of current Ghost instance version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });
        });

        it('responds with error when requested version is BEHIND and CANNOT respond', async function () {
            // CASE 2: If accept-version is behind, send a 406 & tell them the client needs updating.
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.1')
                .header('User-Agent', 'Zapier 1.3')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v3.1 is outdated and is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            // temporarily disable email sending
            mockManager.assert.sentEmailCount(0);
            // mockManager.assert.sentEmail({
            //     subject: 'Attention required: Your Zapier 1.3 integration has failed',
            //     to: 'jbloggs@example.com'
            // });
        });

        it('responds with error and sends email ONCE when requested version is BEHIND and CANNOT respond multiple times', async function () {
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.5')
                .header('User-Agent', 'Zapier 1.4')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v3.5 is outdated and is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            // temporarily disable email sending
            mockManager.assert.sentEmailCount(0);
            // mockManager.assert.sentEmail({
            //     subject: 'Attention required: Your Zapier 1.4 integration has failed',
            //     to: 'jbloggs@example.com'
            // });

            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.5')
                .header('User-Agent', 'Zapier 1.4')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v3.5 is outdated and is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            // temporarily disable email sending
            mockManager.assert.sentEmailCount(0);
        });

        it('responds with 404 error when the resource cannot be found', async function () {
            await agentAdminAPI
                .get('/members/member_does_not_exist@example.com')
                .header('Accept-Version', 'v4.1')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });

        it('307 redirects GET with accept version set when version is included in the URL', async function () {
            await agentAdminAPI
                .get('/site/', {baseUrl: '/ghost/api/canary/admin/'})
                .expectStatus(307)
                .matchHeaderSnapshot({
                    location: stringMatching(/^\/ghost\/api\/admin\/site\/$/)
                })
                .expectEmptyBody();
        });

        it('307 redirects POST with accept version set when version is included in the URL', async function () {
            await agentAdminAPI
                .post('/session/', {baseUrl: '/ghost/api/v3/admin/'})
                .expectStatus(307)
                .matchHeaderSnapshot({
                    location: stringMatching(/^\/ghost\/api\/admin\/session\/$/)
                })
                .expectEmptyBody();
        });

        it('responds with 406 for an unknown version with accept-version set ahead', async function () {
            await agentAdminAPI
                .get('/site/', {baseUrl: '/ghost/api/v99/admin/'})
                .header('Accept-Version', 'v99.0')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({errors: [{
                    context: stringMatching(/Provided client version v99\.0 is ahead of current Ghost instance version v\d+\.\d+/),
                    id: anyErrorId
                }]});
        });

        it('responds with 406 for an unknown version with accept-version set behind', async function () {
            await agentAdminAPI
                .get('/site/', {baseUrl: '/ghost/api/v1/admin/'})
                .header('Accept-Version', 'v1.0')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({errors: [{
                    context: stringMatching(/Provided client version v1\.0 is outdated and is behind current Ghost version v\d+\.\d+/),
                    id: anyErrorId
                }]});
        });
    });

    describe('Content API', function () {
        let agentContentAPI;

        before(async function () {
            agentContentAPI = await agentProvider.getContentAPIAgent();
            await fixtureManager.init('api_keys');
            agentContentAPI.authenticate();
        });

        it('responds with no content version header when accept version header is NOT PRESENT', async function () {
            await agentContentAPI.get('settings/')
                .expectStatus(200)
                .matchHeaderSnapshot()
                .matchBodySnapshot();
        });

        it('responds with current content version header when requested version is BEHIND current version and CAN respond', async function () {
            await agentContentAPI.get('settings/')
                .header('Accept-Version', 'v3.0')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': stringMatching(/v\d+\.\d+/)
                })
                .matchBodySnapshot();
        });

        it('307 redirects with accept version set when version is included in the URL', async function () {
            await agentContentAPI
                .get('/posts/', {baseUrl: '/ghost/api/canary/content/'})
                .expectStatus(307)
                .matchHeaderSnapshot({
                    location: stringMatching(/^\/ghost\/api\/content\/posts\//)
                })
                .expectEmptyBody();
        });
    });
});
