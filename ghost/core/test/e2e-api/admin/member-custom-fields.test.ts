import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Member Custom Fields Admin API', function () {
    let agent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        delete: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
        loginAsEditor: () => Promise<void>;
    };

    // The key is minted server-side from the name, so callers pass just a name
    // (and optionally a type) and read the derived key off the result.
    async function createField(field: {name: string, type?: string}) {
        const {body} = await agent
            .post('members/custom_fields/')
            .body({members_custom_fields: [{type: 'short_text', ...field}]})
            .expectStatus(201);
        return body.members_custom_fields[0];
    }

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('membersCustomFields');
    });

    afterEach(async function () {
        mockManager.restore();
        await models.Base.knex('members_custom_fields').del();
        await models.Base.knex('actions').where('resource_type', 'member_custom_field').del();
    });

    describe('Definitions', function () {
        it('returns an empty list when no fields exist', async function () {
            const {body} = await agent.get('members/custom_fields/').expectStatus(200);
            assert.deepEqual(body.members_custom_fields, []);
        });

        it('creates a field, minting a slug key from the name', async function () {
            const created = await createField({name: 'Favourite topic'});
            assert.equal(created.key, 'favourite-topic');
            assert.equal(created.name, 'Favourite topic');
            assert.equal(created.type, 'short_text');
            // id is the DB primary key and must never be exposed over the API.
            assert.equal(created.id, undefined);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.equal(list.members_custom_fields.length, 1);

            const read = (await agent.get(`members/custom_fields/${created.key}/`).expectStatus(200)).body;
            assert.equal(read.members_custom_fields[0].key, 'favourite-topic');
        });

        it('mints a suffixed key when the derived slug collides', async function () {
            // Two distinct names can derive the same slug ("!" is stripped), so
            // the key is suffixed even though the names stay unique.
            const first = await createField({name: 'Favourite topic'});
            const second = await createField({name: 'Favourite topic!'});
            assert.equal(first.key, 'favourite-topic');
            assert.equal(second.key, 'favourite-topic-2');
        });

        it('rejects a duplicate name, case-insensitively', async function () {
            // The name is the human label and is globally unique; this 422 is what
            // the Settings UI surfaces as an inline error on the name field.
            await createField({name: 'Company'});
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'company', type: 'short_text'}]})
                .expectStatus(422);
        });

        it('rejects a name with no sluggable characters', async function () {
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: '!!!', type: 'short_text'}]})
                .expectStatus(422);
        });

        it('rejects a name that exceeds the maximum length', async function () {
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'a'.repeat(192), type: 'short_text'}]})
                .expectStatus(422);
        });

        it('rejects an unsupported type', async function () {
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'Topic', type: 'boolean'}]})
                .expectStatus(422);
        });

        it('rejects a create with no root key', async function () {
            // The framework rejects an empty/malformed body before the query runs,
            // which is the invariant the endpoint's `[0]` access relies on.
            await agent.post('members/custom_fields/').body({}).expectStatus(400);
        });

        it('renames a field but keeps the key and type immutable', async function () {
            const created = await createField({name: 'Favourite topic'});

            const renamed = (await agent
                .put(`members/custom_fields/${created.key}/`)
                .body({members_custom_fields: [{name: 'Topic'}]})
                .expectStatus(200)).body.members_custom_fields[0];
            assert.equal(renamed.name, 'Topic');
            assert.equal(renamed.key, created.key);

            await agent
                .put(`members/custom_fields/${created.key}/`)
                .body({members_custom_fields: [{key: 'different-key'}]})
                .expectStatus(422);

            await agent
                .put(`members/custom_fields/${created.key}/`)
                .body({members_custom_fields: [{type: 'long_text'}]})
                .expectStatus(422);
        });

        it('rejects renaming a field to another field\'s name', async function () {
            await createField({name: 'Company'});
            const other = await createField({name: 'Role'});
            await agent
                .put(`members/custom_fields/${other.key}/`)
                .body({members_custom_fields: [{name: 'Company'}]})
                .expectStatus(422);
        });

        it('404s reading, editing or deleting a non-existent field', async function () {
            // A key that doesn't exist reaches the service's not-found.
            const missing = 'does-not-exist';
            await agent.get(`members/custom_fields/${missing}/`).expectStatus(404);
            await agent
                .put(`members/custom_fields/${missing}/`)
                .body({members_custom_fields: [{name: 'Topic'}]})
                .expectStatus(404);
            await agent.delete(`members/custom_fields/${missing}/`).expectStatus(404);
        });

        it('archives a field, keeping its name and slug reserved', async function () {
            const first = await createField({name: 'Favourite topic'});

            await agent.delete(`members/custom_fields/${first.key}/`).expectStatus(204);

            // Archived: dropped from the active list...
            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.deepEqual(list.members_custom_fields, []);

            // ...its name stays reserved (uniqueness spans archived fields too)...
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'Favourite topic', type: 'short_text'}]})
                .expectStatus(422);

            // ...and so does its slug: a different name deriving the same slug is
            // suffixed rather than reusing (and resurrecting) the old key.
            const second = await createField({name: 'Favourite topic!'});
            assert.equal(second.key, 'favourite-topic-2');
        });

        it('frees a name for reuse once the archived field is renamed', async function () {
            const original = await createField({name: 'Company'});
            await agent.delete(`members/custom_fields/${original.key}/`).expectStatus(204);

            // The archived field still owns "Company", so rename it to release it...
            await agent
                .put(`members/custom_fields/${original.key}/`)
                .body({members_custom_fields: [{name: 'Company (old)'}]})
                .expectStatus(200);

            // ...now a fresh "Company" is accepted, with its own new key.
            const fresh = await createField({name: 'Company'});
            assert.equal(fresh.name, 'Company');
            assert.notEqual(fresh.key, original.key);
        });
    });

    describe('Field types', function () {
        // Data-driven over every declared field type: adding a type here (or in the
        // shared catalog) is a one-line change, not a whole new test.
        const CASES = [
            {type: 'short_text', name: 'A short text field'},
            {type: 'long_text', name: 'A long text field'},
            {type: 'address', name: 'A home address'}
        ];

        CASES.forEach(({type, name}) => {
            it(`creates a ${type} field`, async function () {
                const created = await createField({name, type});
                assert.equal(created.type, type);
                assert.ok(created.key);
            });
        });
    });

    describe('records actions in the history (via the actions API)', function () {
        let actorId: string;

        const customFieldActions = async () => {
            const {body} = await agent.get('actions/?filter=resource_type:member_custom_field').expectStatus(200);
            return body.actions;
        };

        beforeAll(async function () {
            actorId = (await agent.get('users/me/').expectStatus(200)).body.users[0].id;
        });

        it('records an "added" action when a field is created', async function () {
            const field = await createField({name: 'Favourite topic'});

            const actions = await customFieldActions();
            assert.equal(actions.length, 1);
            assert.equal(actions[0].event, 'added');
            assert.equal(actions[0].resource_id, field.key);
            assert.equal(actions[0].actor_type, 'user');
            assert.equal(actions[0].actor_id, actorId);
        });

        it('records an "edited" action when a field is renamed', async function () {
            const field = await createField({name: 'Favourite topic'});
            await agent
                .put(`members/custom_fields/${field.key}/`)
                .body({members_custom_fields: [{name: 'Topic'}]})
                .expectStatus(200);

            const edited = (await customFieldActions()).find((a: {event: string}) => a.event === 'edited');
            assert.ok(edited, 'an edited action should be recorded');
            assert.equal(edited.resource_id, field.key);
            assert.equal(edited.actor_id, actorId);
        });

        it('records no action when a rename does not change the name', async function () {
            const field = await createField({name: 'Favourite topic'});
            await agent
                .put(`members/custom_fields/${field.key}/`)
                .body({members_custom_fields: [{name: 'Favourite topic'}]})
                .expectStatus(200);

            const edited = (await customFieldActions()).find((a: {event: string}) => a.event === 'edited');
            assert.equal(edited, undefined, 'a no-op rename should not record an action');
        });

        it('records an "archived" action when a field is archived', async function () {
            const field = await createField({name: 'Favourite topic'});
            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(204);

            const archived = (await customFieldActions()).find((a: {event: string}) => a.event === 'archived');
            assert.ok(archived, 'an archived action should be recorded');
            assert.equal(archived.resource_id, field.key);
            assert.equal(archived.actor_id, actorId);
        });
    });

    describe('Authorization', function () {
        // The full role matrix is pinned in migration.test.js; here we only prove
        // the endpoint enforces the permission — a role without it is rejected.
        beforeAll(async function () {
            await agent.loginAsEditor();
        });

        afterAll(async function () {
            await agent.loginAsOwner();
        });

        it('forbids a role without permission from browsing', async function () {
            await agent.get('members/custom_fields/').expectStatus(403);
        });

        it('forbids a role without permission from creating', async function () {
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'Topic', type: 'short_text'}]})
                .expectStatus(403);
        });
    });

    describe('Flag disabled', function () {
        beforeEach(function () {
            mockManager.restore();
            mockManager.mockLabsDisabled('membersCustomFields');
        });

        it('404s the definitions endpoint', async function () {
            await agent.get('members/custom_fields/').expectStatus(404);
        });
    });
});
