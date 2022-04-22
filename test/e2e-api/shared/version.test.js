const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyErrorId, anyString, stringMatching} = matchers;

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
                    etag: anyString
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
                    etag: anyString,
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
                    etag: anyString,
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
                    etag: anyString
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
                    etag: anyString
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v3.1 is outdated and is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: 'Attention required: Your Zapier 1.3 integration has failed',
                to: 'jbloggs@example.com'
            });
        });

        it('responds with error and sends email ONCE when requested version is BEHIND and CANNOT respond multiple times', async function () {
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.5')
                .header('User-Agent', 'Zapier 1.4')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyString
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v3.5 is outdated and is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: 'Attention required: Your Zapier 1.4 integration has failed',
                to: 'jbloggs@example.com'
            });

            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.5')
                .header('User-Agent', 'Zapier 1.4')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyString
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client version v3.5 is outdated and is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            mockManager.assert.sentEmailCount(1);
        });

        it('responds with 404 error when the resource cannot be found', async function () {
            await agentAdminAPI
                .get('/members/member_does_not_exist@example.com')
                .header('Accept-Version', 'v4.1')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyString
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
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
    });
});
