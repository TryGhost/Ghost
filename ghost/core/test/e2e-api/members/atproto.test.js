/**
 * E2E tests for ATProto OAuth endpoints.
 *
 * Uses nock to intercept all outbound HTTP calls (DNS + HTTPS) that the service
 * makes to external ATProto servers, so no real network traffic occurs.
 *
 * Security scenarios have explicit comments explaining the attack they prevent.
 */
const assert = require('node:assert/strict');
const nock = require('nock');
const {agentProvider, mockManager, fixtureManager, configUtils} = require('../../utils/e2e-framework');
const db = require('../../../core/server/data/db');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

let membersAgent;

/** Insert a state row directly into the DB (bypasses authorize() flow) */
async function insertState(overrides = {}) {
    const {generateKeyPair} = require('../../../core/server/services/atproto-auth/DPopHelper');
    const {generateCodeVerifier} = require('../../../core/server/services/atproto-auth/PkceHelper');
    const crypto = require('node:crypto');

    const {privateKeyJwk} = generateKeyPair();
    const id = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const row = {
        id,
        pkce_verifier: generateCodeVerifier(),
        dpop_private_key_jwk: privateKeyJwk,
        resolved_did: 'did:plc:test123456',
        pds_token_endpoint: 'https://pds.bsky.social/oauth/token',
        as_issuer: 'https://pds.bsky.social',
        redirect_url: null,
        email_required: false,
        expires_at: expiresAt,
        ...overrides
    };

    await db.knex('atproto_oauth_states').insert(row);
    return row;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ATProto OAuth – disabled', function () {
    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        await fixtureManager.init('members');
    });

    afterEach(function () {
        mockManager.restore();
        configUtils.restore();
        nock.cleanAll();
    });

    it('GET /.well-known/oauth-client-metadata → 404 when atproto disabled', async function () {
        configUtils.set('atproto:enabled', false);
        await membersAgent.get('/.well-known/oauth-client-metadata').expectStatus(404);
    });

    it('GET /members/atproto/authorize → 404 when atproto disabled', async function () {
        configUtils.set('atproto:enabled', false);
        await membersAgent.get('/atproto/authorize?handle=alice.bsky.social').expectStatus(404);
    });
});

describe('ATProto OAuth – client metadata', function () {
    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        await fixtureManager.init();
    });

    beforeEach(function () {
        configUtils.set('atproto:enabled', true);
        // Re-init the service so it picks up the config change
        const atprotoAuth = require('../../../core/server/services/atproto-auth');
        atprotoAuth.init();
    });

    afterEach(function () {
        mockManager.restore();
        configUtils.restore();
        nock.cleanAll();
    });

    it('GET /.well-known/oauth-client-metadata returns correct JSON', async function () {
        const res = await membersAgent
            .get('/.well-known/oauth-client-metadata')
            .expectStatus(200);

        const meta = JSON.parse(res.text);
        assert.ok(meta.client_id, 'must have client_id');
        assert.ok(Array.isArray(meta.redirect_uris), 'must have redirect_uris');
        assert.equal(meta.dpop_bound_access_tokens, true);
        assert.equal(meta.token_endpoint_auth_method, 'none');
        assert.equal(meta.scope, 'atproto');
        assert.ok(res.headers['cache-control']?.includes('public'));
    });
});

describe('ATProto OAuth – authorize endpoint', function () {
    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        await fixtureManager.init();
        configUtils.set('atproto:enabled', true);
    });

    afterEach(function () {
        mockManager.restore();
        nock.cleanAll();
    });

    it('returns 400 when handle param is missing', async function () {
        await membersAgent.get('/members/atproto/authorize').expectStatus(400);
    });

    it('returns 400 for a handle containing illegal characters', async function () {
        await membersAgent.get('/members/atproto/authorize?handle=<script>alert(1)</script>').expectStatus(400);
    });

    it('returns 400 for a URL-like handle', async function () {
        await membersAgent.get('/members/atproto/authorize?handle=https://evil.com').expectStatus(400);
    });
});

describe('ATProto OAuth – callback security', function () {
    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        await fixtureManager.init('members');
        configUtils.set('atproto:enabled', true);
    });

    afterEach(async function () {
        mockManager.restore();
        nock.cleanAll();
        // Clean state tables
        await db.knex('atproto_oauth_states').truncate();
        await db.knex('atproto_pending_email').truncate();
    });

    it('returns 400 when code param is missing', async function () {
        await membersAgent
            .get('/members/atproto/callback?state=abc&iss=https://pds.bsky.social')
            .expectStatus(400);
    });

    it('returns 400 when state param is missing', async function () {
        await membersAgent
            .get('/members/atproto/callback?code=abc&iss=https://pds.bsky.social')
            .expectStatus(400);
    });

    it('returns 401 for an unknown state ID (brute-force guard)', async function () {
        await membersAgent
            .get('/members/atproto/callback?code=code&state=' + '0'.repeat(64) + '&iss=https://pds.bsky.social')
            .expectStatus(401);
    });

    it('returns 401 for an expired state', async function () {
        const row = await insertState({expires_at: new Date(Date.now() - 1000)});
        await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://pds.bsky.social`)
            .expectStatus(401);
    });

    it('returns 401 for a state replay (second request with same state)', async function () {
        // We mock the token endpoint to return success on first call
        nock('https://pds.bsky.social')
            .post('/oauth/token')
            .reply(200, {
                access_token: 'tok',
                token_type: 'DPoP',
                sub: 'did:plc:test123456',
                email: 'alice@example.com',
                email_verified: true
            });

        const row = await insertState();

        // First call consumes the state
        await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://pds.bsky.social`)
            .expectStatus(302); // success redirects

        // Second call – state is gone
        await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://pds.bsky.social`)
            .expectStatus(401);
    });

    /**
     * Mix-up attack: an attacker tricks the user into starting a flow with a
     * legitimate PDS, then substitutes their own PDS's iss in the callback so
     * the server thinks it's talking to the legitimate one.
     */
    it('returns 401 when iss mismatches the stored asIssuer (mix-up attack)', async function () {
        const row = await insertState({as_issuer: 'https://legitimate.pds.com'});
        await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://attacker.evil.com`)
            .expectStatus(401);
    });

    /**
     * DID substitution: the attacker controls a PDS and returns a different
     * DID in the token sub claim than the one that was resolved from the handle.
     */
    it('returns 401 when token sub mismatches the resolved DID (DID substitution)', async function () {
        const row = await insertState({resolved_did: 'did:plc:victim', as_issuer: 'https://pds.bsky.social'});

        nock('https://pds.bsky.social')
            .post('/oauth/token')
            .reply(200, {
                access_token: 'tok',
                token_type: 'DPoP',
                // Attacker returns their own DID
                sub: 'did:plc:attacker',
                email: 'attacker@example.com',
                email_verified: true
            });

        await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://pds.bsky.social`)
            .expectStatus(401);
    });

    it('redirects to email-required when token has no verified email', async function () {
        const row = await insertState({as_issuer: 'https://pds.bsky.social'});

        nock('https://pds.bsky.social')
            .post('/oauth/token')
            .reply(200, {
                access_token: 'tok',
                token_type: 'DPoP',
                sub: 'did:plc:test123456'
                // No email claim
            });

        const res = await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://pds.bsky.social`)
            .expectStatus(302);

        assert.ok(
            res.headers.location?.includes('/members/atproto/needs-email'),
            `redirect should go to needs-email, got: ${res.headers.location}`
        );
        // Should NOT set a session cookie
        const cookies = res.headers['set-cookie'] || [];
        assert.ok(!cookies.some(c => c.includes('members-ssr')), 'should not set session cookie when email is missing');
    });

    it('open redirect: redirect_url pointing to external domain is ignored', async function () {
        const row = await insertState({
            redirect_url: 'https://attacker.com/steal',
            as_issuer: 'https://pds.bsky.social'
        });

        nock('https://pds.bsky.social')
            .post('/oauth/token')
            .reply(200, {
                access_token: 'tok',
                token_type: 'DPoP',
                sub: 'did:plc:test123456',
                email: 'open-redirect-test@example.com',
                email_verified: true
            });

        const res = await membersAgent
            .get(`/members/atproto/callback?code=code&state=${row.id}&iss=https://pds.bsky.social`)
            .expectStatus(302);

        assert.ok(
            !res.headers.location?.startsWith('https://attacker.com'),
            'should not redirect to external domain'
        );
    });
});

describe('ATProto OAuth – exclusive mode', function () {
    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        await fixtureManager.init('members');
    });

    afterEach(function () {
        mockManager.restore();
        configUtils.restore();
    });

    it('POST /members/api/send-magic-link → 405 when atproto:exclusive is true', async function () {
        configUtils.set('atproto:exclusive', true);
        await membersAgent
            .post('/api/send-magic-link')
            .body({email: 'test@example.com', emailType: 'signin'})
            .expectStatus(405);
    });

    it('POST /members/api/verify-otc → 405 when atproto:exclusive is true', async function () {
        configUtils.set('atproto:exclusive', true);
        await membersAgent
            .post('/api/verify-otc')
            .body({otc: '123456', otcRef: 'ref'})
            .expectStatus(405);
    });

    it('POST /members/api/send-magic-link works normally when atproto:exclusive is false', async function () {
        configUtils.set('atproto:exclusive', false);
        mockManager.mockMail();
        // Should reach the endpoint (400 for missing integrity token, not 405)
        await membersAgent
            .post('/api/send-magic-link')
            .body({email: 'test@example.com', emailType: 'signin'})
            .expectStatus(400);
    });
});
