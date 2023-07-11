const {agentProvider, fixtureManager, matchers, regexes, mockManager} = require('../../utils/e2e-framework');
const {anyErrorId, stringMatching, anyObjectId, anyLocationFor, anyISODateTime, anyEtag, anyString, anyContentLength, anyContentVersion} = matchers;
const {anyMajorMinorVersion} = regexes;

const settingsMatcher = {
    settings: {
        version: anyString
    }
};

describe('API Versioning', function () {
    describe('Admin API', function () {
        let agentAdminAPI;
        let emailMockReceiver;

        before(async function () {
            agentAdminAPI = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init();
            await agentAdminAPI.loginAsOwner();
        });

        beforeEach(function () {
            emailMockReceiver = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('responds with content version header even when accept version header is NOT PRESENT', async function () {
            await agentAdminAPI
                .get('site/')
                .expectStatus(200)
                .matchBodySnapshot({
                    site: {
                        version: stringMatching(/\d+\.\d+/)
                    }
                })
                .matchHeaderSnapshot({
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion,
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
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
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
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                });
        });

        it('allows invalid accept-version header', async function () {
            await agentAdminAPI
                .get('site/')
                .header('Accept-Version', 'canary')
                .expectStatus(200)
                .matchBodySnapshot({
                    site: {
                        version: stringMatching(/\d+\.\d+/)
                    }
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                });
        });

        it('responds with error requested version is AHEAD and CANNOT respond', async function () {
            // CASE 2: If accept-version is behind, send a 406 & tell them the client needs updating.
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v999.1')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client accept-version v999\.1 is ahead of current Ghost version v\d+\.\d+/),
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
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client accept-version v3.1 is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            emailMockReceiver
                .assertSentEmailCount(1)
                .matchMetadataSnapshot()
                .matchHTMLSnapshot([{
                    pattern: anyMajorMinorVersion,
                    replacement: 'v4.50'
                }])
                .matchPlaintextSnapshot([{
                    pattern: anyMajorMinorVersion,
                    replacement: 'v4.50'
                }]);
        });

        it('responds with error and sends email ONCE when requested version is BEHIND and CANNOT respond multiple times', async function () {
            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.5')
                .header('User-Agent', 'Zapier 1.4')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client accept-version v3.5 is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            emailMockReceiver
                .assertSentEmailCount(1)
                .matchMetadataSnapshot()
                .matchHTMLSnapshot([{
                    pattern: anyMajorMinorVersion,
                    replacement: 'v4.50'
                }])
                .matchPlaintextSnapshot([{
                    pattern: anyMajorMinorVersion,
                    replacement: 'v4.50'
                }]);

            await agentAdminAPI
                .get('removed_endpoint')
                .header('Accept-Version', 'v3.5')
                .header('User-Agent', 'Zapier 1.4')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    errors: [{
                        context: stringMatching(/Provided client accept-version v3.5 is behind current Ghost version v\d+\.\d+/),
                        id: anyErrorId
                    }]
                });

            emailMockReceiver.assertSentEmailCount(1);
        });

        it('responds with 404 error when the resource cannot be found', async function () {
            await agentAdminAPI
                .get('/members/member_does_not_exist@example.com')
                .header('Accept-Version', 'v4.1')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });

            emailMockReceiver.assertSentEmailCount(0);
        });

        it('Does an internal rewrite for canary URLs with accept version set', async function () {
            await agentAdminAPI
                .get('/site/', {baseUrl: '/ghost/api/canary/admin/'})
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({site: {
                    version: stringMatching(/\d+\.\d+/)
                }});
        });

        it('Does an internal rewrite for v3 URL + POST with accept version set', async function () {
            await agentAdminAPI
                .post('/tags/', {baseUrl: '/ghost/api/v3/admin/'})
                .body({
                    tags: [{name: 'version tag'}]
                })
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('tags'),
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    tags: [{
                        id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }]
                });
        });

        it('responds with 406 for an unknown version with accept-version set ahead', async function () {
            await agentAdminAPI
                .get('/site/', {baseUrl: '/ghost/api/v99/admin/'})
                .header('Accept-Version', 'v99.0')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({errors: [{
                    context: stringMatching(/Provided client accept-version v99\.0 is ahead of current Ghost version v\d+\.\d+/),
                    id: anyErrorId
                }]});
        });

        it('responds with 406 for an unknown version with accept-version set behind', async function () {
            await agentAdminAPI
                .get('/site/', {baseUrl: '/ghost/api/v1/admin/'})
                .header('Accept-Version', 'v1.0')
                .expectStatus(406)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({errors: [{
                    context: stringMatching(/Provided client accept-version v1\.0 is behind current Ghost version v\d+\.\d+/),
                    id: anyErrorId
                }]});
        });
    });

    describe('Content API', function () {
        let agentContentAPI;
        let emailMockReceiver;

        beforeEach(function () {
            emailMockReceiver = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        before(async function () {
            agentContentAPI = await agentProvider.getContentAPIAgent();
            await fixtureManager.init('api_keys');
            agentContentAPI.authenticate();
        });

        it('responds with no content version header when accept version header is NOT PRESENT', async function () {
            await agentContentAPI.get('settings/')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                })
                .matchBodySnapshot(settingsMatcher);
        });

        it('responds with current content version header when requested version is BEHIND current version and CAN respond', async function () {
            await agentContentAPI.get('settings/')
                .header('Accept-Version', 'v3.0')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot(settingsMatcher);
        });

        it('Does an internal rewrite with accept version set when version is included in the URL', async function () {
            await agentContentAPI
                .get('/tags/?limit=1', {baseUrl: '/ghost/api/canary/content/'})
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    tags: [{
                        id: anyObjectId
                    }]
                });
        });

        it('responds with 404 error when the resource cannot be found', async function () {
            await agentContentAPI
                .get('/posts/5ddc9141c35e7700383b2937/')
                .header('Accept-Version', 'v5.0')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });

            emailMockReceiver.assertSentEmailCount(0);
        });
    });
});
