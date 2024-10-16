const assert = require('assert/strict');
const {agentProvider, matchers} = require('../utils/e2e-framework');
const {anyContentVersion} = matchers;
const config = require('../../core/shared/config');

describe('OPTIONS requests', function () {
    let adminAgent;
    let membersAgent;
    let frontendAgent;
    let contentAPIAgent;
    let ghostServer;

    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        adminAgent = agents.adminAgent;
        membersAgent = agents.membersAgent;
        frontendAgent = agents.frontendAgent;
        contentAPIAgent = agents.contentAPIAgent;
        ghostServer = agents.ghostServer;
    });

    after(async function () {
        await ghostServer.stop();
    });

    describe('CORS headers in Admin API', function () {
        it('Handles same origin request', async function () {
            await adminAgent
                .options('site')
                .expectStatus(204)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion
                });
        });

        it('Handles no origin header request', async function () {
            await adminAgent
                .options('site', {
                    headers: {
                        origin: null
                    }
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion
                });
        });

        it('Handles cross-domain origin header request', async function () {
            await adminAgent
                .options('site', {
                    headers: {
                        origin: 'https://otherdomain.tld/'
                    }
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion
                });
        });
    });

    describe('CORS headers in Members API', function () {
        it('Handles same origin request', async function () {
            await membersAgent
                .options('member')
                .expectStatus(204)
                .matchHeaderSnapshot();
        });

        it('Handles no origin header request', async function () {
            await membersAgent
                .options('member', {
                    headers: {
                        origin: null
                    }
                })
                .expectStatus(204)
                .matchHeaderSnapshot();
        });

        it('Handles cross-domain origin header request', async function () {
            await membersAgent
                .options('member', {
                    headers: {
                        origin: 'https://otherdomain.tld/'
                    }
                })
                .expectStatus(204)
                .matchHeaderSnapshot();
        });
    });

    describe('CORS headers in Frontend', function () {
        it('Responds with no referer vary header value when same referer', async function () {
            const res = await frontendAgent
                .set('Origin', config.get('url'))
                .options('/')
                .expect(204);

            assert.equal(res.headers['access-control-allow-origin'], 'http://127.0.0.1:2369');
            assert.equal(res.headers['access-control-allow-credentials'], 'true');
            assert.equal(res.headers['access-control-allow-methods'], 'GET,HEAD,PUT,PATCH,POST,DELETE');
            assert.equal(res.headers['access-control-max-age'], '86400');
            assert.equal(res.headers.vary, 'Origin, Access-Control-Request-Headers');

            assert.equal(res.headers['cache-control'], undefined);
            assert.equal(res.headers.allow, undefined);
        });

        it('Does not allow CORS with when no origin is present in the request', async function () {
            const res = await frontendAgent
                .options('/')
                .set('origin', null)
                .expect(200);

            assert.equal(res.headers['cache-control'], 'public, max-age=0');
            assert.equal(res.headers.vary, 'Origin, Accept-Encoding');
            assert.equal(res.headers.allow, 'POST,GET,HEAD');
        });

        it('Responds with no referer vary header value when different referer', async function () {
            const res = await frontendAgent
                .options('/')
                .set('origin', 'https://otherdomain.tld/')
                .expect(200);

            assert.equal(res.headers['cache-control'], 'public, max-age=0');
            assert.equal(res.headers.vary, 'Origin, Accept-Encoding');
            assert.equal(res.headers.allow, 'POST,GET,HEAD');
        });
    });

    describe('CORS headers in Content API', function () {
        it('Handles same origin request', async function () {
            await contentAPIAgent
                .options('site')
                .expectStatus(204)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion
                });
        });

        it('Handles no origin header request', async function () {
            await contentAPIAgent
                .options('site', {
                    headers: {
                        origin: null
                    }
                })
                .expectStatus(204)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion
                });
        });

        it('Handles cross-domain origin header request', async function () {
            await contentAPIAgent
                .options('site', {
                    headers: {
                        origin: 'https://otherdomain.tld/'
                    }
                })
                .expectStatus(204)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion
                });
        });
    });
});
