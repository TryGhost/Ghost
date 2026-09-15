const assert = require('node:assert/strict');
const sinon = require('sinon');

const AtprotoAuthService = require('../../../../../core/server/services/atproto-auth/atproto-auth-service');
const {generateKeyPair} = require('../../../../../core/server/services/atproto-auth/dpop-helper');
const {generateCodeVerifier} = require('../../../../../core/server/services/atproto-auth/pkce-helper');

function buildService() {
    const storeStub = {
        create: sinon.stub().resolves('test-state-id'),
        findAndConsume: sinon.stub().resolves(null),
        createPendingEmail: sinon.stub().resolves('pending-id-123'),
        consumePendingEmail: sinon.stub().resolves(null),
        _knex: null
    };

    const membersApiStub = {
        members: {
            get: sinon.stub().resolves(null),
            create: sinon.stub().resolves({get: () => 'transient-id', id: 'member-123'}),
            update: sinon.stub().resolves({})
        },
        sendEmailWithMagicLink: sinon.stub().resolves()
    };

    const config = {
        get: (key) => {
            if (key === 'atproto:plcDirectory') {
                return 'https://plc.directory';
            }
            return undefined;
        }
    };

    const urlUtils = {
        getSiteUrl: () => 'https://example.com/'
    };

    const service = new AtprotoAuthService({
        config,
        urlUtils,
        getMembersApi: () => Promise.resolve(membersApiStub),
        settingsCache: {get: () => 'Test Site'},
        db: {}
    });

    service._store = storeStub;

    return {service, storeStub, membersApiStub};
}

function makeValidState(overrides) {
    const {privateKeyJwk} = generateKeyPair();
    return Object.assign({
        pkceVerifier: generateCodeVerifier(),
        dpopPrivateKeyJwk: privateKeyJwk,
        resolvedDid: 'did:plc:test123',
        pdsTokenEndpoint: 'https://pds.example.com/oauth/token',
        asIssuer: 'https://pds.example.com',
        redirectUrl: null,
        emailRequired: false
    }, overrides);
}

describe('AtprotoAuthService – SDK integration', function () {
    it('initializes a NodeOAuthClient instance for the OAuth flow', async function () {
        const {service} = buildService();
        const client = await service._getSdkClient();
        assert.ok(client);
        assert.equal(typeof client.authorize, 'function');
        assert.equal(typeof client.callback, 'function');
    });
});

describe('AtprotoAuthService – callback() security', function () {
    it('throws UnauthorizedError when state is not found', async function () {
        const {service, storeStub} = buildService();
        storeStub.findAndConsume.resolves(null);

        await assert.rejects(
            () => service.callback('code123', 'unknown-state', 'https://pds.example.com'),
            err => err.errorType === 'UnauthorizedError' || err.name === 'UnauthorizedError' || err.statusCode === 401
        );
    });

    it('throws UnauthorizedError when iss mismatches stored asIssuer (mix-up attack)', async function () {
        const {service, storeStub} = buildService();
        storeStub.findAndConsume.resolves(makeValidState({asIssuer: 'https://legitimate.pds.com'}));

        service._exchangeCode = sinon.stub().resolves({access_token: 'tok', sub: 'did:plc:test123'});

        await assert.rejects(
            () => service.callback('code123', 'valid-state', 'https://attacker.evil.com'),
            err => (err.message || '').includes('Issuer mismatch') || (err.message || '').includes('mix-up')
        );
    });

    it('throws UnauthorizedError when token sub mismatches resolved DID (DID substitution)', async function () {
        const {service, storeStub} = buildService();
        storeStub.findAndConsume.resolves(makeValidState({
            resolvedDid: 'did:plc:original',
            asIssuer: 'https://pds.example.com'
        }));

        service._exchangeCode = sinon.stub().resolves({
            access_token: 'tok',
            sub: 'did:plc:attacker-did',
            email: 'attacker@example.com',
            email_verified: true
        });

        await assert.rejects(
            () => service.callback('code123', 'valid-state', 'https://pds.example.com'),
            err => (err.message || '').includes('sub') || (err.message || '').includes('DID')
        );
    });

    it('redirects to email-required flow when token has no verified email', async function () {
        const {service, storeStub} = buildService();
        storeStub.findAndConsume.resolves(makeValidState({asIssuer: 'https://pds.example.com'}));
        storeStub.createPendingEmail.resolves('pending-123');

        service._exchangeCode = sinon.stub().resolves({access_token: 'tok', sub: 'did:plc:test123'});

        const result = await service.callback('code123', 'valid-state', 'https://pds.example.com');
        assert.equal(result.needsEmail, true);
        assert.equal(result.pendingId, 'pending-123');
        assert.equal(result.member, null);
    });

    it('returns member when email is present and verified', async function () {
        const {service, storeStub, membersApiStub} = buildService();
        const fakeMember = {get: () => 'transient-id', id: 'member-456'};
        membersApiStub.members.create.resolves(fakeMember);
        storeStub.findAndConsume.resolves(makeValidState({asIssuer: 'https://pds.example.com'}));

        service._exchangeCode = sinon.stub().resolves({
            access_token: 'tok',
            sub: 'did:plc:test123',
            email: 'alice@example.com',
            email_verified: true
        });

        const result = await service.callback('code123', 'valid-state', 'https://pds.example.com');
        assert.equal(result.needsEmail, false);
        assert.equal(result.member, fakeMember);
    });

    it('throws when code or state params are missing', async function () {
        const {service} = buildService();
        await assert.rejects(() => service.callback('', 'state', null));
        await assert.rejects(() => service.callback('code', '', null));
    });
});

describe('AtprotoAuthService – _sanitizeRedirectUrl()', function () {
    it('accepts a same-origin URL', function () {
        const {service} = buildService();
        const result = service._sanitizeRedirectUrl('https://example.com/after-login');
        assert.equal(result, 'https://example.com/after-login');
    });

    it('rejects an off-origin URL (open redirect prevention)', function () {
        const {service} = buildService();
        assert.equal(service._sanitizeRedirectUrl('https://attacker.com/steal'), null);
    });

    it('returns null for non-string input', function () {
        const {service} = buildService();
        assert.equal(service._sanitizeRedirectUrl(null), null);
        assert.equal(service._sanitizeRedirectUrl(undefined), null);
    });

    it('returns null for a javascript: URL', function () {
        const {service} = buildService();
        assert.equal(service._sanitizeRedirectUrl('javascript:alert(1)'), null);
    });
});

describe('AtprotoAuthService – getClientMetadata()', function () {
    it('returns required ATProto OAuth fields', function () {
        const {service} = buildService();
        const meta = service.getClientMetadata();
        assert.equal(meta.client_id, 'https://example.com/.well-known/oauth-client-metadata');
        assert.deepEqual(meta.redirect_uris, ['https://example.com/members/atproto/callback']);
        assert.equal(meta.dpop_bound_access_tokens, true);
        assert.equal(meta.token_endpoint_auth_method, 'none');
        assert.equal(meta.scope, 'atproto');
    });
});
