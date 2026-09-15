const assert = require('node:assert/strict');
const knex = require('knex');
const OAuthStateStore = require('../../../../../core/server/services/atproto-auth/oauth-state-store');

function buildTestDb() {
    return knex({client: 'better-sqlite3', connection: ':memory:', useNullAsDefault: true});
}

async function createSchema(db) {
    await db.schema.createTable('atproto_oauth_states', (t) => {
        t.string('id', 64).primary();
        t.string('pkce_verifier', 191).notNullable();
        t.text('dpop_private_key_jwk').notNullable();
        t.string('resolved_did', 2048).notNullable();
        t.string('pds_token_endpoint', 2048).notNullable();
        t.string('as_issuer', 2048).notNullable();
        t.string('redirect_url', 2048).nullable();
        t.boolean('email_required').notNullable().defaultTo(false);
        t.datetime('expires_at').notNullable();
    });
    await db.schema.createTable('atproto_pending_email', (t) => {
        t.string('id', 64).primary();
        t.string('verified_did', 2048).notNullable();
        t.datetime('expires_at').notNullable();
    });
}

const SAMPLE = {
    pkceVerifier: 'test-verifier',
    dpopPrivateKeyJwk: '{"kty":"EC"}',
    resolvedDid: 'did:plc:test123',
    pdsTokenEndpoint: 'https://pds.example.com/oauth/token',
    asIssuer: 'https://pds.example.com',
    redirectUrl: null
};

describe('OAuthStateStore', function () {
    let db;
    let store;

    beforeEach(async function () {
        db = buildTestDb();
        await createSchema(db);
        store = new OAuthStateStore(db);
    });

    afterEach(async function () {
        await db.destroy();
    });

    // ------------------------------------------------------------------
    // OAuth state rows
    // ------------------------------------------------------------------

    it('create() inserts a row and returns a 64-char hex state ID', async function () {
        const id = await store.create(SAMPLE);
        assert.ok(typeof id === 'string');
        assert.equal(id.length, 64);
        assert.ok(/^[0-9a-f]+$/.test(id));
        const row = await db('atproto_oauth_states').where({id}).first();
        assert.ok(row);
        assert.equal(row.resolved_did, 'did:plc:test123');
    });

    it('findAndConsume() returns the row data', async function () {
        const id = await store.create(SAMPLE);
        const result = await store.findAndConsume(id);
        assert.ok(result !== null);
        assert.equal(result.resolvedDid, 'did:plc:test123');
        assert.equal(result.pkceVerifier, 'test-verifier');
    });

    it('findAndConsume() deletes the row (single-use — replay prevented)', async function () {
        const id = await store.create(SAMPLE);
        await store.findAndConsume(id);
        const second = await store.findAndConsume(id);
        assert.equal(second, null);
    });

    it('findAndConsume() returns null for an unknown state ID', async function () {
        const result = await store.findAndConsume('0'.repeat(64));
        assert.equal(result, null);
    });

    it('findAndConsume() returns null for an expired row (and still deletes it)', async function () {
        const id = await store.create(SAMPLE);
        await db('atproto_oauth_states').where({id}).update({expires_at: new Date(Date.now() - 1000)});
        const result = await store.findAndConsume(id);
        assert.equal(result, null);
        const row = await db('atproto_oauth_states').where({id}).first();
        assert.equal(row, undefined);
    });

    it('deleteExpired() removes only expired rows', async function () {
        const liveId = await store.create(SAMPLE);
        const expiredId = await store.create(SAMPLE);
        await db('atproto_oauth_states').where({id: expiredId}).update({expires_at: new Date(Date.now() - 1000)});

        await store.deleteExpired();

        const live = await db('atproto_oauth_states').where({id: liveId}).first();
        const expired = await db('atproto_oauth_states').where({id: expiredId}).first();
        assert.ok(live, 'live row should still exist');
        assert.equal(expired, undefined, 'expired row should be deleted');
    });

    it('two create() calls produce unique IDs', async function () {
        const id1 = await store.create(SAMPLE);
        const id2 = await store.create(SAMPLE);
        assert.notEqual(id1, id2);
    });

    // ------------------------------------------------------------------
    // Pending-email rows
    // ------------------------------------------------------------------

    it('createPendingEmail() stores a DID and returns a 64-char ID', async function () {
        const id = await store.createPendingEmail('did:plc:abc');
        assert.equal(id.length, 64);
        const row = await db('atproto_pending_email').where({id}).first();
        assert.equal(row.verified_did, 'did:plc:abc');
    });

    it('consumePendingEmail() returns the DID and deletes the row', async function () {
        const id = await store.createPendingEmail('did:plc:abc');
        const did = await store.consumePendingEmail(id);
        assert.equal(did, 'did:plc:abc');
        const row = await db('atproto_pending_email').where({id}).first();
        assert.equal(row, undefined);
    });

    it('consumePendingEmail() returns null on second call (replay prevented)', async function () {
        const id = await store.createPendingEmail('did:plc:abc');
        await store.consumePendingEmail(id);
        const second = await store.consumePendingEmail(id);
        assert.equal(second, null);
    });

    it('consumePendingEmail() returns null for expired row', async function () {
        const id = await store.createPendingEmail('did:plc:abc');
        await db('atproto_pending_email').where({id}).update({expires_at: new Date(Date.now() - 1000)});
        const result = await store.consumePendingEmail(id);
        assert.equal(result, null);
    });

    it('consumePendingEmail() returns null for unknown ID', async function () {
        const result = await store.consumePendingEmail('0'.repeat(64));
        assert.equal(result, null);
    });
});
