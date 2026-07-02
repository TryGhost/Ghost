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
    };

    async function createField(field: {key: string, name: string, type?: string}) {
        const {body} = await agent
            .post('members/custom_fields/')
            .body({member_custom_fields: [{type: 'text', ...field}]})
            .expectStatus(201);
        return body.member_custom_fields[0];
    }

    async function createMember(email: string) {
        const {body} = await agent
            .post('members/')
            .body({members: [{email, name: email}]})
            .expectStatus(201);
        return body.members[0].id;
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
        await models.Base.knex('member_custom_field_values').del();
        await models.Base.knex('member_custom_fields').del();
        await models.Base.knex('actions').where('resource_type', 'member_custom_field').del();
        await models.Base.knex('members').del();
    });

    describe('Definitions', function () {
        it('returns an empty list when no fields exist', async function () {
            const {body} = await agent.get('members/custom_fields/').expectStatus(200);
            assert.deepEqual(body.member_custom_fields, []);
        });

        it('creates, lists, and reads a text field', async function () {
            const created = await createField({key: 'favourite_topic', name: 'Favourite topic'});
            assert.equal(created.key, 'favourite_topic');
            assert.equal(created.name, 'Favourite topic');
            assert.equal(created.type, 'text');
            assert.ok(created.id);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.equal(list.member_custom_fields.length, 1);

            const read = (await agent.get(`members/custom_fields/${created.id}/`).expectStatus(200)).body;
            assert.equal(read.member_custom_fields[0].key, 'favourite_topic');
        });

        it('rejects a duplicate key', async function () {
            await createField({key: 'favourite_topic', name: 'Favourite topic'});
            await agent
                .post('members/custom_fields/')
                .body({member_custom_fields: [{key: 'favourite_topic', name: 'Another', type: 'text'}]})
                .expectStatus(422);
        });

        it('rejects an invalid key format', async function () {
            await agent
                .post('members/custom_fields/')
                .body({member_custom_fields: [{key: 'Favourite Topic', name: 'X', type: 'text'}]})
                .expectStatus(422);
        });

        it('rejects a dotted key (namespace reserved)', async function () {
            await agent
                .post('members/custom_fields/')
                .body({member_custom_fields: [{key: 'ns.topic', name: 'X', type: 'text'}]})
                .expectStatus(422);
        });

        it('rejects an unsupported type', async function () {
            await agent
                .post('members/custom_fields/')
                .body({member_custom_fields: [{key: 'topic', name: 'X', type: 'boolean'}]})
                .expectStatus(422);
        });


        it('renames a field but keeps the key immutable', async function () {
            const created = await createField({key: 'favourite_topic', name: 'Favourite topic'});

            const renamed = (await agent
                .put(`members/custom_fields/${created.id}/`)
                .body({member_custom_fields: [{name: 'Topic'}]})
                .expectStatus(200)).body.member_custom_fields[0];
            assert.equal(renamed.name, 'Topic');
            assert.equal(renamed.key, 'favourite_topic');

            await agent
                .put(`members/custom_fields/${created.id}/`)
                .body({member_custom_fields: [{key: 'different_key'}]})
                .expectStatus(422);
        });

        it('hard-deletes a field and cascades its values', async function () {
            const field = await createField({key: 'favourite_topic', name: 'Favourite topic'});
            const memberId = await createMember('cascade@example.com');

            await agent
                .put(`members/${memberId}/`)
                .body({members: [{custom_fields: {favourite_topic: 'gardening'}}]})
                .expectStatus(200);

            // Confirm the value is set (observable via the API), then delete the field.
            let read = (await agent.get(`members/${memberId}/?include=custom_fields`).expectStatus(200)).body;
            assert.deepEqual(read.members[0].custom_fields, {favourite_topic: 'gardening'});

            await agent.delete(`members/custom_fields/${field.id}/`).expectStatus(204);

            // Re-create the same key: if the value had survived the field deletion it
            // would reappear here. It doesn't — proving the value was cascaded away.
            await createField({key: 'favourite_topic', name: 'Favourite topic'});
            read = (await agent.get(`members/${memberId}/?include=custom_fields`).expectStatus(200)).body;
            assert.deepEqual(read.members[0].custom_fields, {});
        });
    });

    describe('Member values', function () {
        let memberId: string;

        beforeEach(async function () {
            await createField({key: 'favourite_topic', name: 'Favourite topic'});
            memberId = await createMember('member@example.com');
        });

        async function readCustomFields() {
            const {body} = await agent.get(`members/${memberId}/?include=custom_fields`).expectStatus(200);
            return body.members[0].custom_fields;
        }

        it('sets and reads a value', async function () {
            await agent
                .put(`members/${memberId}/`)
                .body({members: [{custom_fields: {favourite_topic: 'gardening'}}]})
                .expectStatus(200);

            assert.deepEqual(await readCustomFields(), {favourite_topic: 'gardening'});
        });

        it('updates an existing value (upsert)', async function () {
            await agent.put(`members/${memberId}/`).body({members: [{custom_fields: {favourite_topic: 'gardening'}}]}).expectStatus(200);
            await agent.put(`members/${memberId}/`).body({members: [{custom_fields: {favourite_topic: 'cycling'}}]}).expectStatus(200);

            assert.deepEqual(await readCustomFields(), {favourite_topic: 'cycling'});
        });

        it('clears a value with null', async function () {
            await agent.put(`members/${memberId}/`).body({members: [{custom_fields: {favourite_topic: 'gardening'}}]}).expectStatus(200);
            await agent.put(`members/${memberId}/`).body({members: [{custom_fields: {favourite_topic: null}}]}).expectStatus(200);

            assert.deepEqual(await readCustomFields(), {});
        });

        it('does not expose custom_fields without the include', async function () {
            await agent.put(`members/${memberId}/`).body({members: [{custom_fields: {favourite_topic: 'gardening'}}]}).expectStatus(200);

            const {body} = await agent.get(`members/${memberId}/`).expectStatus(200);
            assert.equal(body.members[0].custom_fields, undefined);
        });

        it('rejects an unknown key and leaves the member untouched', async function () {
            await agent
                .put(`members/${memberId}/`)
                .body({members: [{name: 'Changed', custom_fields: {nope: 'x'}}]})
                .expectStatus(422);

            const {body} = await agent.get(`members/${memberId}/`).expectStatus(200);
            assert.equal(body.members[0].name, 'member@example.com');
        });

        it('rejects a value of the wrong type', async function () {
            await agent
                .put(`members/${memberId}/`)
                .body({members: [{custom_fields: {favourite_topic: 123}}]})
                .expectStatus(422);
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
            const field = await createField({key: 'favourite_topic', name: 'Favourite topic'});

            const actions = await customFieldActions();
            assert.equal(actions.length, 1);
            assert.equal(actions[0].event, 'added');
            assert.equal(actions[0].resource_id, field.id);
            assert.equal(actions[0].actor_type, 'user');
            assert.equal(actions[0].actor_id, actorId);
        });

        it('records an "edited" action when a field is renamed', async function () {
            const field = await createField({key: 'favourite_topic', name: 'Favourite topic'});
            await agent
                .put(`members/custom_fields/${field.id}/`)
                .body({member_custom_fields: [{name: 'Topic'}]})
                .expectStatus(200);

            const edited = (await customFieldActions()).find((a: {event: string}) => a.event === 'edited');
            assert.ok(edited, 'an edited action should be recorded');
            assert.equal(edited.resource_id, field.id);
            assert.equal(edited.actor_id, actorId);
        });

        it('records a "deleted" action when a field is deleted', async function () {
            const field = await createField({key: 'favourite_topic', name: 'Favourite topic'});
            await agent.delete(`members/custom_fields/${field.id}/`).expectStatus(204);

            const deleted = (await customFieldActions()).find((a: {event: string}) => a.event === 'deleted');
            assert.ok(deleted, 'a deleted action should be recorded');
            assert.equal(deleted.resource_id, field.id);
            assert.equal(deleted.actor_id, actorId);
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

        it('ignores custom_fields on member edit', async function () {
            // A field exists, but the flag is off for this edit.
            mockManager.restore();
            mockManager.mockLabsEnabled('membersCustomFields');
            await createField({key: 'favourite_topic', name: 'Favourite topic'});
            const memberId = await createMember('flagoff@example.com');

            mockManager.restore();
            mockManager.mockLabsDisabled('membersCustomFields');
            await agent
                .put(`members/${memberId}/`)
                .body({members: [{custom_fields: {favourite_topic: 'gardening'}}]})
                .expectStatus(200);

            // Re-enable the flag and read back: nothing was written while it was off.
            mockManager.restore();
            mockManager.mockLabsEnabled('membersCustomFields');
            const {body} = await agent.get(`members/${memberId}/?include=custom_fields`).expectStatus(200);
            assert.deepEqual(body.members[0].custom_fields, {});
        });
    });
});
