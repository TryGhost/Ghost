const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyErrorId, anyString, stringMatching} = matchers;

describe('API Versioning', function () {
    describe('Admin API', function () {
        let agentAdminAPI;

        before(async function () {
            agentAdminAPI = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init();
            await agentAdminAPI.loginAsOwner();
        });

        it('responds with no content version header when accept version header is NOT PRESENT', async function () {
            await agentAdminAPI
                .get('site/')
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
                .matchHeaderSnapshot({
                    etag: anyString
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });

        it('responds with error when requested version is BEHIND and CANNOT respond', async function () {
            // CASE 2: If accept-version is behind, send a 406 & tell them the client needs updating.
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.1')
                .matchHeaderSnapshot({
                    etag: anyString
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });

        it('responds with 404 error when the resource cannot be found', async function () {
            await agentAdminAPI
                .get('/members/member_does_not_exist@example.com')
                .header('Accept-Version', 'v4.1')
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
