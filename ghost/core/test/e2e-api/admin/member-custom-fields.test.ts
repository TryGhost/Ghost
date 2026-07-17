import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const events = require('../../../core/server/lib/common/events');

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

    let memberCounter = 0;
    async function createMember(): Promise<string> {
        memberCounter += 1;
        const {body} = await agent
            .post('members/')
            .body({members: [{email: `custom-fields-${memberCounter}@example.com`}]})
            .expectStatus(201);
        return body.members[0].id;
    }

    async function readValues(memberId: string) {
        const {body} = await agent.get(`members/${memberId}/`).expectStatus(200);
        return body.members[0].custom_fields;
    }

    async function setValues(memberId: string, customFields: Record<string, unknown>, status = 200) {
        const {body} = await agent
            .put(`members/${memberId}/`)
            .body({members: [{custom_fields: customFields}]})
            .expectStatus(status);
        return body;
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
        await models.Base.knex('members_custom_field_values').del();
        await models.Base.knex('members_custom_fields').del();
        await models.Base.knex('members').del();
        await models.Base.knex('actions').whereIn('resource_type', ['member', 'member_custom_field']).del();
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
        // shared catalog) is a one-line change, not a whole new test. `value` is a
        // valid example, and proves the type survives a round trip through
        // whichever storage column it routes to.
        const CASES = [
            {type: 'short_text', name: 'A short text field', value: 'Ghosts'},
            {type: 'long_text', name: 'A long text field', value: 'A '.repeat(5000).trim()},
            {
                type: 'address',
                name: 'A home address',
                value: {line1: '62 Ghost Lane', line2: 'Apt 3', city: 'Dublin', state: 'Leinster', postal_code: 'D02 AF30', country: 'IE'}
            }
        ];

        CASES.forEach(({type, name}) => {
            it(`creates a ${type} field`, async function () {
                const created = await createField({name, type});
                assert.equal(created.type, type);
                assert.ok(created.key);
            });
        });

        CASES.forEach(({type, name, value}) => {
            it(`round-trips a ${type} value`, async function () {
                const field = await createField({name, type});
                const memberId = await createMember();

                await setValues(memberId, {[field.key]: value});

                assert.deepEqual(await readValues(memberId), {[field.key]: value});
            });
        });
    });

    describe('Values', function () {
        it('returns an empty object for a member with no values set', async function () {
            await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            assert.deepEqual(await readValues(memberId), {});
        });

        it('echoes the values back on the edit response', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            const {body} = await agent
                .put(`members/${memberId}/`)
                .body({members: [{custom_fields: {[field.key]: 'Ghosts'}}]})
                .expectStatus(200);

            assert.deepEqual(body.members[0].custom_fields, {[field.key]: 'Ghosts'});
        });

        it('carries values on browse only when asked, like tiers', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            const plain = (await agent.get('members/').expectStatus(200)).body;
            assert.equal(plain.members[0].custom_fields, undefined);

            const included = (await agent.get('members/?include=custom_fields').expectStatus(200)).body;
            assert.deepEqual(included.members[0].custom_fields, {[field.key]: 'Ghosts'});
        });

        it('gives each member on a browse page its own values', async function () {
            // Behaviour, not mechanism: every member on the page gets their own
            // values and no one else's, and a member with none gets an empty
            // object. (The bulk-lookup implementation is the reason browse stays
            // off an N+1, but that's an implementation detail this doesn't couple
            // to — it asserts the result, not the query count.)
            const field = await createField({name: 'Favourite topic'});
            const first = await createMember();
            const second = await createMember();
            const third = await createMember();
            await setValues(first, {[field.key]: 'Ghosts'});
            await setValues(third, {[field.key]: 'Opera'});

            const {body} = await agent.get('members/?include=custom_fields').expectStatus(200);
            const byId = new Map(body.members.map((m: {id: string}) => [m.id, m]));

            assert.deepEqual((byId.get(first) as any).custom_fields, {[field.key]: 'Ghosts'});
            // A member with no values gets an empty object, not a missing key.
            assert.deepEqual((byId.get(second) as any).custom_fields, {});
            assert.deepEqual((byId.get(third) as any).custom_fields, {[field.key]: 'Opera'});
        });

        it('updates a value that is already set', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: 'Ghosts'});
            await setValues(memberId, {[field.key]: 'Opera'});

            assert.deepEqual(await readValues(memberId), {[field.key]: 'Opera'});
        });

        it('leaves fields it does not mention alone', async function () {
            const topic = await createField({name: 'Favourite topic'});
            const company = await createField({name: 'Company'});
            const memberId = await createMember();
            await setValues(memberId, {[topic.key]: 'Ghosts', [company.key]: 'Ghost'});

            await setValues(memberId, {[topic.key]: 'Opera'});

            assert.deepEqual(await readValues(memberId), {[topic.key]: 'Opera', [company.key]: 'Ghost'});
        });

        it('leaves values alone on an edit that does not mention custom fields at all', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            await agent.put(`members/${memberId}/`).body({members: [{name: 'Renamed'}]}).expectStatus(200);

            assert.deepEqual(await readValues(memberId), {[field.key]: 'Ghosts'});
        });

        it('clears a value with null, without touching the others', async function () {
            const topic = await createField({name: 'Favourite topic'});
            const company = await createField({name: 'Company'});
            const memberId = await createMember();
            await setValues(memberId, {[topic.key]: 'Ghosts', [company.key]: 'Ghost'});

            await setValues(memberId, {[topic.key]: null});

            assert.deepEqual(await readValues(memberId), {[company.key]: 'Ghost'});
        });

        it('clears a text value with an empty string', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            await setValues(memberId, {[field.key]: ''});

            assert.deepEqual(await readValues(memberId), {});
        });

        it('rejects an empty string for a non-text field rather than clearing it', async function () {
            // '' clears a text field (an emptied input), but for a non-text type
            // it isn't a clear — it's an invalid value, and nothing is coerced.
            const field = await createField({name: 'Home address', type: 'address'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: ''}, 422);
        });

        it('omits a stored value whose type is no longer valid, without failing the read', async function () {
            // Stored data outlives the catalog: if a value's field type is later
            // dropped or renamed, reading the member must degrade — omit that one
            // value — not fail the whole payload.
            const good = await createField({name: 'Favourite topic'});
            const stale = await createField({name: 'Legacy field'});
            const memberId = await createMember();
            await setValues(memberId, {[good.key]: 'Ghosts', [stale.key]: 'kept'});

            // Corrupt the stored field's type directly, past the service's immutability.
            await models.Base.knex('members_custom_fields').where('key', stale.key).update({type: 'no_longer_a_type'});

            assert.deepEqual(await readValues(memberId), {[good.key]: 'Ghosts'});
        });

        it('rejects custom_fields when creating a member', async function () {
            // Setting values on create is a later vertical; the API rejects rather
            // than silently dropping them, so the gap is explicit.
            const field = await createField({name: 'Favourite topic'});

            await agent
                .post('members/')
                .body({members: [{email: 'create-with-values@example.com', custom_fields: {[field.key]: 'Ghosts'}}]})
                .expectStatus(422);
        });

        it('clearing a value that was never set is a no-op', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: null});

            assert.deepEqual(await readValues(memberId), {});
        });

        it('rejects an unknown field key', async function () {
            const memberId = await createMember();

            const body = await setValues(memberId, {not_a_field: 'x'}, 422);

            assert.equal(body.errors[0].property, 'custom_fields.not_a_field');
        });

        it('rejects a value for an archived field', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(204);

            await setValues(memberId, {[field.key]: 'Ghosts'}, 422);
        });

        it('hides the values of an archived field, but keeps them', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(204);

            assert.deepEqual(await readValues(memberId), {});
            // The row survives archiving — the definition is what went away, and
            // the value is still attached to it.
            const rows = await models.Base.knex('members_custom_field_values').where('member_id', memberId);
            assert.equal(rows.length, 1);
        });

        it('rejects a value that is the wrong type for the field', async function () {
            const field = await createField({name: 'Favourite topic', type: 'short_text'});
            const memberId = await createMember();

            const body = await setValues(memberId, {[field.key]: {not: 'a string'}}, 422);

            assert.equal(body.errors[0].property, `custom_fields.${field.key}`);
        });

        it('points at the offending sub-field of a composite value', async function () {
            const field = await createField({name: 'Home address', type: 'address'});
            const memberId = await createMember();

            const body = await setValues(
                memberId,
                {[field.key]: {line1: '62 Ghost Lane', city: 'Dublin', country: 'IE'}},
                422
            );

            assert.equal(body.errors[0].property, `custom_fields.${field.key}.postal_code`);
        });

        it('strips unknown sub-fields of a composite value', async function () {
            const field = await createField({name: 'Home address', type: 'address'});
            const memberId = await createMember();
            const address = {line1: '62 Ghost Lane', city: 'Dublin', postal_code: 'D02', country: 'IE'};

            await setValues(memberId, {[field.key]: {...address, sneaky: 'x'}});

            assert.deepEqual(await readValues(memberId), {[field.key]: address});
        });

        it('applies nothing when one value in the batch is invalid', async function () {
            const topic = await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            await setValues(memberId, {[topic.key]: 'Ghosts', not_a_field: 'x'}, 422);

            assert.deepEqual(await readValues(memberId), {});
        });

        it('does not apply the rest of the member edit when a value is invalid', async function () {
            const memberId = await createMember();

            await agent
                .put(`members/${memberId}/`)
                .body({members: [{name: 'Should not persist', custom_fields: {not_a_field: 'x'}}]})
                .expectStatus(422);

            const {body} = await agent.get(`members/${memberId}/`).expectStatus(200);
            assert.equal(body.members[0].name, null);
        });

        it('drops a member\'s values when the member is deleted', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            await agent.delete(`members/${memberId}/`).expectStatus(204);

            const rows = await models.Base.knex('members_custom_field_values').where('member_id', memberId);
            assert.deepEqual(rows, []);
        });

        it('accepts a long_text value at the byte limit', async function () {
            const field = await createField({name: 'Bio', type: 'long_text'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: 'a'.repeat(65535)});

            assert.equal((await readValues(memberId))[field.key].length, 65535);
        });

        it('rejects a long_text value over the byte limit', async function () {
            const field = await createField({name: 'Bio', type: 'long_text'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: 'a'.repeat(65536)}, 422);
        });

        it('bounds long_text in bytes, not characters', async function () {
            // 21,846 three-byte characters is 65,538 bytes: comfortably inside any
            // character-based reading of the limit, and past what the column holds.
            const field = await createField({name: 'Bio', type: 'long_text'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: '€'.repeat(21846)}, 422);

            // One character fewer is 65,535 bytes exactly, and is accepted.
            await setValues(memberId, {[field.key]: '€'.repeat(21845)});
            assert.equal((await readValues(memberId))[field.key].length, 21845);
        });

        it('rejects an over-long address sub-field', async function () {
            const field = await createField({name: 'Home address', type: 'address'});
            const memberId = await createMember();

            const body = await setValues(
                memberId,
                {[field.key]: {line1: 'a'.repeat(256), city: 'Dublin', postal_code: 'D02', country: 'IE'}},
                422
            );

            assert.equal(body.errors[0].property, `custom_fields.${field.key}.line1`);
        });

        it('rejects an over-long postal code', async function () {
            const field = await createField({name: 'Home address', type: 'address'});
            const memberId = await createMember();

            await setValues(
                memberId,
                {[field.key]: {line1: '62 Ghost Lane', city: 'Dublin', postal_code: 'D'.repeat(33), country: 'IE'}},
                422
            );
        });

        it('keeps values separate per member', async function () {
            const field = await createField({name: 'Favourite topic'});
            const first = await createMember();
            const second = await createMember();

            await setValues(first, {[field.key]: 'Ghosts'});
            await setValues(second, {[field.key]: 'Opera'});

            assert.deepEqual(await readValues(first), {[field.key]: 'Ghosts'});
            assert.deepEqual(await readValues(second), {[field.key]: 'Opera'});
        });

        async function memberEditedActions(memberId: string) {
            return models.Base.knex('actions').where({resource_id: memberId, resource_type: 'member', event: 'edited'});
        }

        // Runs `fn` while counting `member.edited` common events (the signal
        // webhooks listen to) for the given member.
        async function countMemberEditedEvents(memberId: string, fn: () => Promise<void>): Promise<number> {
            let fired = 0;
            const handler = (model: {id: string}) => {
                if (model && model.id === memberId) {
                    fired += 1;
                }
            };
            events.on('member.edited', handler);
            try {
                await fn();
            } finally {
                events.removeListener('member.edited', handler);
            }
            return fired;
        }

        it('fires member.edited (audit action and the webhook event) when only custom fields change', async function () {
            // A values-only edit doesn't touch the member row, so the member's own
            // save fires nothing — the custom-field write re-fires the member's
            // edited signals itself, like a labels edit: the audit action and the
            // member.edited event webhooks listen to.
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await models.Base.knex('actions').where('resource_id', memberId).del();

            const editedEvents = await countMemberEditedEvents(memberId, () => setValues(memberId, {[field.key]: 'Ghosts'}));

            assert.equal(editedEvents, 1);
            assert.equal((await memberEditedActions(memberId)).length, 1);
        });

        it('fires a single member.edited when the edit changes the member too', async function () {
            // The member's own save already fires it; the custom-field write must
            // not add a second.
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await models.Base.knex('actions').where('resource_id', memberId).del();

            const editedEvents = await countMemberEditedEvents(memberId, async () => {
                await agent.put(`members/${memberId}/`)
                    .body({members: [{name: 'Renamed', custom_fields: {[field.key]: 'Ghosts'}}]})
                    .expectStatus(200);
            });

            assert.equal(editedEvents, 1);
            assert.equal((await memberEditedActions(memberId)).length, 1);
        });

        it('fires member.edited when a full PUT resends unchanged member fields with a custom-field change', async function () {
            // A client may PUT the whole member unchanged except for a custom field.
            // The native save is then a no-op, so keying off the actual save
            // (model._changed), not the request body, is what still fires the event.
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            const {body} = await agent.get(`members/${memberId}/`).expectStatus(200);
            const {email} = body.members[0];
            await models.Base.knex('actions').where('resource_id', memberId).del();

            const editedEvents = await countMemberEditedEvents(memberId, async () => {
                await agent.put(`members/${memberId}/`)
                    .body({members: [{email, custom_fields: {[field.key]: 'Ghosts'}}]})
                    .expectStatus(200);
            });

            assert.equal(editedEvents, 1);
            assert.equal((await memberEditedActions(memberId)).length, 1);
        });

        it('fires no member.edited when the custom_fields object is empty', async function () {
            const memberId = await createMember();
            await models.Base.knex('actions').where('resource_id', memberId).del();

            const editedEvents = await countMemberEditedEvents(memberId, () => setValues(memberId, {}));

            assert.equal(editedEvents, 0);
            assert.equal((await memberEditedActions(memberId)).length, 0);
        });
    });

    describe('Values with the flag disabled', function () {
        beforeEach(function () {
            mockManager.restore();
            mockManager.mockLabsDisabled('membersCustomFields');
        });

        it('ignores custom_fields on a member edit and never returns them', async function () {
            // The field and value are set up with the flag on, then the flag goes
            // off for the request under test.
            mockManager.restore();
            mockManager.mockLabsEnabled('membersCustomFields');
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});
            mockManager.restore();
            mockManager.mockLabsDisabled('membersCustomFields');

            await agent
                .put(`members/${memberId}/`)
                .body({members: [{name: 'Renamed', custom_fields: {[field.key]: 'Opera'}}]})
                .expectStatus(200);

            const {body} = await agent.get(`members/${memberId}/?include=custom_fields`).expectStatus(200);
            assert.equal(body.members[0].custom_fields, undefined);
            assert.equal(body.members[0].name, 'Renamed');

            // The value the request tried to write was dropped with the flag off.
            mockManager.restore();
            mockManager.mockLabsEnabled('membersCustomFields');
            assert.deepEqual(await readValues(memberId), {[field.key]: 'Ghosts'});
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
