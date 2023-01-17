const {
    agentProvider,
    fixtureManager,
    matchers: {
        anyContentVersion,
        anyEtag
    },
    dbUtils,
    configUtils
} = require('../../utils/e2e-framework');

describe('Sessions API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
    });

    it('Is rate limited to protect against brute forcing a users password', async function () {
        await dbUtils.truncate('brute');
        // +1 because this is a retry count, so we have one request + the retries, then blocked
        const userLoginRateLimit = configUtils.config.get('spam').user_login.freeRetries + 1;

        for (let i = 0; i < userLoginRateLimit; i++) {
            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: 'user@domain.tld',
                    password: 'parseword'
                });
        }

        await agent
            .post('session/')
            .body({
                grant_type: 'password',
                username: 'user@domain.tld',
                password: 'parseword'
            })
            .expectStatus(429)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Is rate limited to protect against brute forcing whether a user exists', async function () {
        await dbUtils.truncate('brute');
        // +1 because this is a retry count, so we have one request + the retries, then blocked
        const userLoginRateLimit = configUtils.config.get('spam').user_login.freeRetries + 1;

        for (let i = 0; i < userLoginRateLimit; i++) {
            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: `user+${i}@domain.tld`,
                    password: `parseword`
                });
        }

        await agent
            .post('session/')
            .body({
                grant_type: 'password',
                username: 'user@domain.tld',
                password: 'parseword'
            })
            .expectStatus(429)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });
});
