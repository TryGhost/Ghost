import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const nock = require('nock');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const configUtils = require('../../utils/config-utils');

const ARCHIVE_ORIGIN = 'https://archive-generator.example.com';
const ARCHIVE_PATH = '/api/generate/';
const WEBHOOK_SECRET = 'test-export-webhook-secret';
const SITE_ID = 'test-site-id';

const ALL_COMPONENTS = {
    content: true,
    members: true,
    analytics: true,
    themes: true,
    routes: true,
    media: false
};

function configureArchiveHost() {
    configUtils.set('hostSettings:export:webhookUrl', `${ARCHIVE_ORIGIN}${ARCHIVE_PATH}`);
    configUtils.set('hostSettings:siteId', SITE_ID);
    configUtils.set('hostSettings:export:webhookSecret', WEBHOOK_SECRET);
}

type CapturedRequest = {
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
};

function mockArchiveHost({status = 202} = {}) {
    const captured: CapturedRequest = {};

    nock(ARCHIVE_ORIGIN)
        .post(ARCHIVE_PATH)
        .reply(function (this: {req: {headers: Record<string, string>}}, uri: string, requestBody: Record<string, unknown>) {
            captured.headers = this.req.headers;
            captured.body = requestBody;
            return [status, {}];
        });

    return captured;
}

describe('Exports API: archive requests', function () {
    let agent: {
        get: (_url: string) => any;
        post: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
        loginAsEditor: () => Promise<void>;
        loginAsAuthor: () => Promise<void>;
        useZapierAdminAPIKey: () => Promise<void>;
    };

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
    });

    afterEach(async function () {
        nock.cleanAll();
        await configUtils.restore();
    });

    describe('As Unauthorized User', function () {
        it('Cannot request an export', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(403);
        });
    });

    describe('As Owner', function () {
        beforeAll(async function () {
            await agent.loginAsOwner();
        });

        it('Can request an export and sends a signed request to the archive host', async function () {
            configureArchiveHost();
            const captured = mockArchiveHost();

            await agent
                .post('/exports/')
                .body({components: {content: true, members: true, media: true}})
                .expectStatus(202);

            assert.ok(captured.body, 'Expected an outbound request to the archive host');

            assert.deepEqual(captured.body, {
                type: 'export',
                siteId: SITE_ID,
                requestedBy: fixtureManager.get('users', 0).email,
                components: {
                    content: true,
                    members: true,
                    analytics: false,
                    themes: false,
                    routes: false,
                    media: true
                }
            });

            assert.ok(captured.headers, 'Expected the outbound request headers to be captured');
            assert.equal(captured.headers['content-type'], 'application/json');
            assert.match(captured.headers['content-version'], /^v\d+\.\d+$/);

            const timestamp = captured.headers['x-ghost-request-timestamp'];
            assert.match(timestamp, /^\d+$/);

            // nock hands us the parsed body; the service signs the raw
            // JSON.stringify output, which re-stringifying reproduces exactly
            const rawBody = JSON.stringify(captured.body);
            assert.equal(captured.headers['content-length'], `${Buffer.byteLength(rawBody)}`);

            const expectedSignature = crypto
                .createHmac('sha256', WEBHOOK_SECRET)
                .update(`${timestamp}:${rawBody}`)
                .digest('base64');

            assert.equal(captured.headers['x-ghost-signature'], expectedSignature);
        });

        it('Ignores an email supplied in the request body', async function () {
            configureArchiveHost();
            const captured = mockArchiveHost();

            await agent
                .post('/exports/')
                .body({components: {content: true}, requestedBy: 'attacker@example.com'})
                .expectStatus(202);

            assert.ok(captured.body, 'Expected an outbound request to the archive host');
            assert.equal(captured.body.requestedBy, fixtureManager.get('users', 0).email);
        });

        it('Returns 404 when no archive host is configured', async function () {
            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(404);
        });

        it('Refuses to send an unsigned request when the secret is missing while the archive host is configured', async function () {
            configUtils.set('hostSettings:export:webhookUrl', `${ARCHIVE_ORIGIN}${ARCHIVE_PATH}`);
            configUtils.set('hostSettings:siteId', SITE_ID);

            // No archive host is mocked here: an outbound attempt would fail the test
            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(400);
        });

        it('Never exposes the webhook secret through the config endpoint', async function () {
            configureArchiveHost();

            await agent
                .get('/config/')
                .expectStatus(200)
                .expect(({body}: {body: {config: {hostSettings: {export: Record<string, unknown>}}}}) => {
                    const exportSettings = body.config.hostSettings.export;
                    assert.equal(exportSettings.webhookUrl, `${ARCHIVE_ORIGIN}${ARCHIVE_PATH}`);
                    assert.equal('webhookSecret' in exportSettings, false, 'The signing secret must never be serialized to clients');
                });
        });

        it('Refuses to send when the site id is missing while the archive host is configured', async function () {
            configUtils.set('hostSettings:export:webhookUrl', `${ARCHIVE_ORIGIN}${ARCHIVE_PATH}`);
            configUtils.set('hostSettings:export:webhookSecret', WEBHOOK_SECRET);
            configUtils.set('hostSettings:siteId', undefined);
            const captured = mockArchiveHost();

            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(400);

            assert.equal(captured.body, undefined, 'Expected no outbound request without a site id');
        });

        it('Returns 502 when the archive host rejects the request', async function () {
            configureArchiveHost();
            mockArchiveHost({status: 500});

            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(502);
        });

        it('Returns 400 when components is missing', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({})
                .expectStatus(400);
        });

        it('Returns 400 when components contains unknown keys', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: {content: true, database: true}})
                .expectStatus(400);
        });

        it('Returns 400 when component values are not booleans', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: {content: 'yes'}})
                .expectStatus(400);
        });

        it('Returns 400 when no component is selected', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: {content: false, members: false}})
                .expectStatus(400);
        });
    });

    describe('As Editor', function () {
        beforeAll(async function () {
            await agent.loginAsEditor();
        });

        it('Cannot request an export', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(403);
        });
    });

    describe('As Author', function () {
        beforeAll(async function () {
            await agent.loginAsAuthor();
        });

        it('Cannot request an export', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(403);
        });
    });

    describe('With an integration token', function () {
        beforeAll(async function () {
            await agent.useZapierAdminAPIKey();
        });

        // The exports segment is deliberately absent from the integration
        // token allowlist in admin/middleware.js - this is a staff-session
        // only action, and a later allowlist edit must not expose it.
        it('Cannot request an export', async function () {
            configureArchiveHost();

            await agent
                .post('/exports/')
                .body({components: ALL_COMPONENTS})
                .expectStatus(403);
        });
    });
});
