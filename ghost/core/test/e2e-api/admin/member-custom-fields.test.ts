import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
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

    // Archiving is a status change over the same PUT the rename uses (no dedicated
    // /archive route), matching how newsletters move between active and archived.
    async function setStatus(key: string, status: 'active' | 'archived') {
        const {body} = await agent
            .put(`members/custom_fields/${key}/`)
            .body({members_custom_fields: [{status}]})
            .expectStatus(200);
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
            // A new field is active; status travels with the definition so the UI
            // can group active and archived fields from one list.
            assert.equal(created.status, 'active');
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
            // so the service always receives a non-empty array to create from.
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

        it('hides archived fields from the default list', async function () {
            const active = await createField({name: 'Favourite topic'});
            const archived = await createField({name: 'Company'});
            await setStatus(archived.key, 'archived');

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body.members_custom_fields;
            assert.equal(list.length, 1);
            assert.equal(list[0].key, active.key);
            assert.equal(list[0].status, 'active');
        });

        it('includes archived fields when the caller filters by status', async function () {
            const active = await createField({name: 'Favourite topic'});
            const archived = await createField({name: 'Company'});
            await setStatus(archived.key, 'archived');

            // Settings pulls active and archived in one request by overriding the
            // active-only default with an explicit status filter.
            const both = (await agent.get('members/custom_fields/?filter=status:[active,archived]').expectStatus(200))
                .body.members_custom_fields;
            const byKey = Object.fromEntries(both.map((f: {key: string}) => [f.key, f]));
            assert.equal(both.length, 2);
            assert.equal(byKey[active.key].status, 'active');
            assert.equal(byKey[archived.key].status, 'archived');

            // And archived-only for a dedicated view.
            const onlyArchived = (await agent.get('members/custom_fields/?filter=status:archived').expectStatus(200))
                .body.members_custom_fields;
            assert.equal(onlyArchived.length, 1);
            assert.equal(onlyArchived[0].key, archived.key);
        });

        it('keeps archived fields hidden when filtering on a non-status field', async function () {
            // A filter that doesn't mention status must not surface archived fields:
            // the active-only default still applies, so filtering by (say) type
            // can't leak them.
            const active = await createField({name: 'Favourite topic', type: 'short_text'});
            const archived = await createField({name: 'Company', type: 'short_text'});
            await setStatus(archived.key, 'archived');

            const list = (await agent.get('members/custom_fields/?filter=type:short_text').expectStatus(200))
                .body.members_custom_fields;
            assert.equal(list.length, 1);
            assert.equal(list[0].key, active.key);
        });

        it('rejects a malformed filter with a 400 rather than a 500', async function () {
            await createField({name: 'Favourite topic'});
            await agent.get('members/custom_fields/?filter=' + encodeURIComponent('status:')).expectStatus(400);
        });

        it('archives a field, keeping its name and slug reserved', async function () {
            const first = await createField({name: 'Favourite topic'});

            const archived = await setStatus(first.key, 'archived');
            assert.equal(archived.status, 'archived');

            // Archived: gone from the default list...
            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body.members_custom_fields;
            assert.deepEqual(list, []);

            // ...but still there, so its name stays reserved (uniqueness spans
            // archived fields too)...
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'Favourite topic', type: 'short_text'}]})
                .expectStatus(422);

            // ...and so does its slug: a different name deriving the same slug is
            // suffixed rather than reusing (and resurrecting) the old key.
            const second = await createField({name: 'Favourite topic!'});
            assert.equal(second.key, 'favourite-topic-2');
        });

        it('restores an archived field', async function () {
            const field = await createField({name: 'Favourite topic'});
            await setStatus(field.key, 'archived');

            const restored = await setStatus(field.key, 'active');
            assert.equal(restored.status, 'active');

            const read = (await agent.get(`members/custom_fields/${field.key}/`).expectStatus(200)).body;
            assert.equal(read.members_custom_fields[0].status, 'active');
        });

        it('frees a name for reuse once the archived field is renamed', async function () {
            const original = await createField({name: 'Company'});
            await setStatus(original.key, 'archived');

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

        it('refuses to permanently delete an active field', async function () {
            // Deleting is gated on the archived state: a publisher must archive
            // first, so permanent data loss is always a deliberate two-step.
            const field = await createField({name: 'Favourite topic'});

            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(422);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body.members_custom_fields;
            assert.equal(list.length, 1);
        });

        it('permanently deletes an archived field, freeing its name and slug', async function () {
            const original = await createField({name: 'Favourite topic'});
            await setStatus(original.key, 'archived');

            await agent.delete(`members/custom_fields/${original.key}/`).expectStatus(204);

            // Gone entirely — not in the list, and no longer readable.
            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body.members_custom_fields;
            assert.deepEqual(list, []);
            await agent.get(`members/custom_fields/${original.key}/`).expectStatus(404);

            // The row is gone, so the name and its base slug are free again: a
            // fresh field with the same name reclaims the original (unsuffixed) key.
            const fresh = await createField({name: 'Favourite topic'});
            assert.equal(fresh.key, 'favourite-topic');
        });
    });

    describe('Creating several definitions at once', function () {
        it('creates every definition in the request, in order', async function () {
            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Company', type: 'short_text'},
                    {name: 'Role', type: 'short_text'},
                    {name: 'Bio', type: 'long_text'}
                ]})
                .expectStatus(201);

            assert.deepEqual(
                body.members_custom_fields.map((field: {key: string}) => field.key),
                ['company', 'role', 'bio']
            );
            assert.equal(body.members_custom_fields[2].type, 'long_text');

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.equal(list.members_custom_fields.length, 3);
        });

        it('mints distinct keys when two definitions in the batch derive the same slug', async function () {
            // Within a batch each insert is visible to the next, so slug collision
            // resolves exactly as it would across two separate requests.
            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Favourite topic', type: 'short_text'},
                    {name: 'Favourite topic!', type: 'short_text'}
                ]})
                .expectStatus(201);

            assert.deepEqual(
                body.members_custom_fields.map((field: {key: string}) => field.key),
                ['favourite-topic', 'favourite-topic-2']
            );
        });

        it('writes nothing when any definition in the batch is invalid', async function () {
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Company', type: 'short_text'},
                    {name: 'Role', type: 'boolean'}
                ]})
                .expectStatus(422);

            // The valid first item must not survive the rejected request.
            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.deepEqual(list.members_custom_fields, []);
        });

        it('writes nothing when two definitions in the batch share a name', async function () {
            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Company', type: 'short_text'},
                    {name: 'company', type: 'short_text'}
                ]})
                .expectStatus(422);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.deepEqual(list.members_custom_fields, []);
        });

        it('names the offending field, and which one it was, when a batch item is invalid', async function () {
            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Company', type: 'short_text'},
                    {name: 'Role', type: 'short_text'},
                    {name: 'Bio', type: 'boolean'}
                ]})
                .expectStatus(422);

            // `property` stays the bare field name so a client can map it onto a
            // form input; the item pointer rides alongside it in context, which is
            // where the framework relocates the detail of a validation failure.
            assert.equal(body.errors[0].property, 'type');
            assert.match(body.errors[0].context, /Custom field 3 of 3\./);
        });

        it('does not point at an item when only one definition was sent', async function () {
            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name: 'Bio', type: 'boolean'}]})
                .expectStatus(422);

            assert.equal(body.errors[0].property, 'type');
            // context still carries the reason the item was rejected, just no
            // pointer to which one. Asserted as a string first so that if the
            // framework ever stops populating it this fails as an assertion
            // rather than throwing inside doesNotMatch.
            assert.equal(typeof body.errors[0].context, 'string');
            assert.doesNotMatch(body.errors[0].context, /Custom field \d+ of \d+/);
        });

        it('rejects a batch larger than a single request may create', async function () {
            // Work per request is bounded independently of the site ceiling: even
            // with room to spare, one request cannot ask for unbounded work.
            configUtils.set('members:customFields:maxDefinitions', 100000);
            const oversized = Array.from({length: 101}, (_unused, index) => ({
                name: `Field ${index}`,
                type: 'short_text'
            }));

            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: oversized})
                .expectStatus(422);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.deepEqual(list.members_custom_fields, []);
            await configUtils.restore();
        });

        it('writes nothing when a definition in the batch clashes with an existing one', async function () {
            await createField({name: 'Company'});

            await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Role', type: 'short_text'},
                    {name: 'Company', type: 'short_text'}
                ]})
                .expectStatus(422);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body.members_custom_fields;
            assert.deepEqual(list.map((field: {key: string}) => field.key), ['company']);
        });
    });

    describe('Operational limit on the number of definitions', function () {
        // The cap is an operator setting, not a release constant. Ghost containers
        // are stateless, so it is read from config on every create: these tests set
        // it directly and the very next request honours it, with no re-boot.
        afterEach(async function () {
            await configUtils.restore();
        });

        async function createFieldExpecting(name: string, status: number) {
            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [{name, type: 'short_text'}]})
                .expectStatus(status);
            return body;
        }

        it('rejects a create once the site is at the limit', async function () {
            configUtils.set('members:customFields:maxDefinitions', 2);

            await createField({name: 'Company'});
            await createField({name: 'Role'});

            const body = await createFieldExpecting('Bio', 403);
            assert.equal(body.errors[0].code, 'CUSTOM_FIELDS_LIMIT_REACHED');
            assert.deepEqual(body.errors[0].details, {limit: 2, total: 2, requested: 1});
            // At the ceiling, freeing a slot is the only way forward.
            assert.match(body.errors[0].context, /Delete a field you no longer need/);

            // The rejected field was not written.
            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.equal(list.members_custom_fields.length, 2);
        });

        it('applies a limit change to the very next request, with no restart', async function () {
            // This is the behaviour that makes the cap operable: raising it must take
            // effect immediately, which is only true if config is read per request.
            configUtils.set('members:customFields:maxDefinitions', 1);
            await createField({name: 'Company'});
            await createFieldExpecting('Role', 403);

            configUtils.set('members:customFields:maxDefinitions', 2);
            const created = await createField({name: 'Role'});
            assert.equal(created.key, 'role');

            // ...and lowering it blocks the next create just as immediately.
            configUtils.set('members:customFields:maxDefinitions', 1);
            await createFieldExpecting('Bio', 403);
        });

        it('leaves definitions already over a lowered limit in place', async function () {
            configUtils.set('members:customFields:maxDefinitions', 3);
            await createField({name: 'Company'});
            await createField({name: 'Role'});
            await createField({name: 'Bio'});

            // Lowering the cap below the current count is a valid operator action.
            // It stops new definitions; it never removes existing ones.
            configUtils.set('members:customFields:maxDefinitions', 1);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
            assert.equal(list.members_custom_fields.length, 3);

            const body = await createFieldExpecting('Location', 403);
            assert.deepEqual(body.errors[0].details, {limit: 1, total: 3, requested: 1});
        });

        it('counts archived definitions towards the limit, and frees a slot only on delete', async function () {
            configUtils.set('members:customFields:maxDefinitions', 2);
            await createField({name: 'Company'});
            const spare = await createField({name: 'Role'});

            // Archiving is reversible and keeps the row (and its members' values),
            // so it releases nothing.
            await setStatus(spare.key, 'archived');
            const body = await createFieldExpecting('Bio', 403);
            assert.deepEqual(body.errors[0].details, {limit: 2, total: 2, requested: 1});

            // Deleting the archived field is what actually frees the slot.
            await agent.delete(`members/custom_fields/${spare.key}/`).expectStatus(204);
            const created = await createField({name: 'Bio'});
            assert.equal(created.key, 'bio');
        });

        it('restores an archived definition while at the limit', async function () {
            // Restoring changes no row count, so the cap has nothing to say about it.
            configUtils.set('members:customFields:maxDefinitions', 2);
            await createField({name: 'Company'});
            const archived = await createField({name: 'Role'});
            await setStatus(archived.key, 'archived');

            const restored = await setStatus(archived.key, 'active');
            assert.equal(restored.status, 'active');
        });

        it('rejects a batch that would cross the limit, writing none of it', async function () {
            configUtils.set('members:customFields:maxDefinitions', 3);
            await createField({name: 'Company'});

            // Two slots remain, so a batch of three is refused outright rather than
            // being applied up to the remaining space.
            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Role', type: 'short_text'},
                    {name: 'Bio', type: 'short_text'},
                    {name: 'Location', type: 'short_text'}
                ]})
                .expectStatus(403);
            assert.deepEqual(body.errors[0].details, {limit: 3, total: 1, requested: 3});

            // The site still has room, just not for three. Telling this operator to
            // delete something would be wrong, so the message says how much room
            // is actually left.
            assert.match(body.errors[0].context, /You can add 2 more\./);

            const list = (await agent.get('members/custom_fields/').expectStatus(200)).body.members_custom_fields;
            assert.deepEqual(list.map((field: {key: string}) => field.key), ['company']);
        });

        it('accepts a batch that exactly fills the remaining space', async function () {
            configUtils.set('members:customFields:maxDefinitions', 3);
            await createField({name: 'Company'});

            const {body} = await agent
                .post('members/custom_fields/')
                .body({members_custom_fields: [
                    {name: 'Role', type: 'short_text'},
                    {name: 'Bio', type: 'short_text'}
                ]})
                .expectStatus(201);
            assert.equal(body.members_custom_fields.length, 2);
        });

        it('rejects every create when the limit is zero', async function () {
            configUtils.set('members:customFields:maxDefinitions', 0);
            const body = await createFieldExpecting('Company', 403);
            assert.deepEqual(body.errors[0].details, {limit: 0, total: 0, requested: 1});
        });

        // A setting that can't be read as a ceiling must neither disable the feature
        // nor remove the safeguard. Several of these coerce to 0 through `Number()`,
        // which would stop creation site-wide; treating them as "no limit" instead
        // would mean a typo silently removes the protection. Both are wrong: they
        // fall back to the default. Only an explicit 0 disables creation.
        const unreadableSettings: [string, unknown][] = [
            ['an unreadable string', 'not-a-number'],
            ['false', false],
            ['null', null],
            ['an empty string', ''],
            ['an array', []],
            ['a negative number', -5],
            ['a fraction', 2.5],
            ['an unsafely large number', 1e21]
        ];

        unreadableSettings.forEach(([description, value]) => {
            it(`falls back to the default ceiling when the setting is ${description}`, async function () {
                configUtils.set('members:customFields:maxDefinitions', value);
                await createField({name: 'Company'});

                const list = (await agent.get('members/custom_fields/').expectStatus(200)).body;
                assert.equal(list.members_custom_fields.length, 1);
            });
        });

        it('enforces the shipped ceiling, not an absent one, when the setting is unreadable', async function () {
            // The checks above only prove creation still works. This proves a
            // ceiling is genuinely still in force: fill the shipped one exactly,
            // then watch the next create be refused against it.
            //
            // The expected ceiling comes from the config provider rather than from
            // the module that resolves it, so this asserts against what Ghost
            // actually ships rather than against the implementation's own idea of
            // it. Read before the override, which is what makes it unreadable.
            const shipped = configUtils.config.get('members:customFields:maxDefinitions');
            configUtils.set('members:customFields:maxDefinitions', 'not-a-number');

            // Filled in batches rather than one create at a time: a hundred-odd
            // sequential authenticated requests trip Ghost's spam prevention and
            // leave later tests failing on 403s. The chunk sits comfortably under
            // the per-request cap so this holds if the shipped ceiling moves.
            const chunk = 50;
            for (let created = 0; created < shipped; created += chunk) {
                await agent
                    .post('members/custom_fields/')
                    .body({members_custom_fields: Array.from(
                        {length: Math.min(chunk, shipped - created)},
                        (_unused, index) => ({name: `Field ${created + index}`, type: 'short_text'})
                    )})
                    .expectStatus(201);
            }

            const body = await createFieldExpecting('One too many', 403);
            assert.deepEqual(body.errors[0].details, {limit: shipped, total: shipped, requested: 1});
        });

        it('honours a numeric limit supplied as a string', async function () {
            // Config set through an environment variable arrives as a string.
            configUtils.set('members:customFields:maxDefinitions', '1');
            await createField({name: 'Company'});
            await createFieldExpecting('Role', 403);
        });

        it('does not record an activity-log entry for a create the limit rejected', async function () {
            configUtils.set('members:customFields:maxDefinitions', 1);
            await createField({name: 'Company'});
            await createFieldExpecting('Role', 403);

            const actions = await models.Base.knex('actions')
                .where('resource_type', 'member_custom_field')
                .select('resource_id');
            assert.deepEqual(actions.map((action: {resource_id: string}) => action.resource_id), ['company']);
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
            await setStatus(field.key, 'archived');

            await setValues(memberId, {[field.key]: 'Ghosts'}, 422);
        });

        it('hides the values of an archived field, but keeps them', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            await setStatus(field.key, 'archived');

            assert.deepEqual(await readValues(memberId), {});
            // The row survives archiving — only the definition was hidden, and the
            // value is still attached to it (restoring the field brings it back).
            const rows = await models.Base.knex('members_custom_field_values').where('member_id', memberId);
            assert.equal(rows.length, 1);
        });

        it('drops a field\'s values when the field is permanently deleted', async function () {
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            await setValues(memberId, {[field.key]: 'Ghosts'});

            // Archive then delete — the FK cascade removes the member's value with
            // the definition, so a permanent delete takes the data with it.
            await setStatus(field.key, 'archived');
            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(204);

            const rows = await models.Base.knex('members_custom_field_values').where('member_id', memberId);
            assert.equal(rows.length, 0);
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
            await setStatus(field.key, 'archived');

            const archived = (await customFieldActions()).find((a: {event: string}) => a.event === 'archived');
            assert.ok(archived, 'an archived action should be recorded');
            assert.equal(archived.resource_id, field.key);
            assert.equal(archived.actor_id, actorId);
        });

        it('records a "restored" action when an archived field is restored', async function () {
            const field = await createField({name: 'Favourite topic'});
            await setStatus(field.key, 'archived');
            await setStatus(field.key, 'active');

            const restored = (await customFieldActions()).find((a: {event: string}) => a.event === 'restored');
            assert.ok(restored, 'a restored action should be recorded');
            assert.equal(restored.resource_id, field.key);
            assert.equal(restored.actor_id, actorId);
        });

        it('records no action when the status does not change', async function () {
            const field = await createField({name: 'Favourite topic'});
            await setStatus(field.key, 'active');

            const archived = (await customFieldActions()).find((a: {event: string}) => a.event === 'archived');
            const restored = (await customFieldActions()).find((a: {event: string}) => a.event === 'restored');
            assert.equal(archived, undefined, 'a no-op status change should not record an action');
            assert.equal(restored, undefined, 'a no-op status change should not record an action');
        });

        it('records a "deleted" action when an archived field is permanently deleted', async function () {
            const field = await createField({name: 'Favourite topic'});
            await setStatus(field.key, 'archived');
            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(204);

            const deleted = (await customFieldActions()).find((a: {event: string}) => a.event === 'deleted');
            assert.ok(deleted, 'a deleted action should be recorded');
            assert.equal(deleted.resource_id, field.key);
            assert.equal(deleted.actor_id, actorId);
        });

        it('records the whole lifecycle as an ordered, attributed, named timeline', async function () {
            // One field, driven through every transition over the public HTTP API;
            // the assertions read only the action-log API, never the service.
            const field = await createField({name: 'Delivery address'});
            await agent
                .put(`members/custom_fields/${field.key}/`)
                .body({members_custom_fields: [{name: 'Shipping address'}]})
                .expectStatus(200);
            await setStatus(field.key, 'archived');
            await setStatus(field.key, 'active');
            await setStatus(field.key, 'archived');
            await agent.delete(`members/custom_fields/${field.key}/`).expectStatus(204);

            // Oldest-first by id: action ids are bson ObjectIds, so they sort in
            // creation order even for events that land in the same second (which
            // created_at ordering can't disambiguate).
            const timeline = (await customFieldActions())
                .filter((a: {resource_id: string}) => a.resource_id === field.key)
                .sort((a: {id: string}, b: {id: string}) => (a.id < b.id ? -1 : 1));

            const parseContext = (a: {context: unknown}) =>
                (typeof a.context === 'string' ? JSON.parse(a.context) : a.context) as {primary_name?: string; previous_name?: string};

            // The full ordered story, including the repeated archive.
            assert.deepEqual(
                timeline.map((a: {event: string}) => a.event),
                ['added', 'edited', 'archived', 'restored', 'archived', 'deleted']
            );

            // Every entry is attributed and carries the field's name — no anonymous
            // logs, and the delete still says what the field was after its row is gone.
            for (const a of timeline) {
                assert.equal(a.actor_id, actorId, `the ${a.event} action is attributed`);
                assert.ok(parseContext(a)?.primary_name, `the ${a.event} action names the field`);
            }

            // Names track the field at each point; the rename also records what it was.
            assert.equal(parseContext(timeline[0]).primary_name, 'Delivery address');
            assert.equal(parseContext(timeline[1]).primary_name, 'Shipping address');
            assert.equal(parseContext(timeline[1]).previous_name, 'Delivery address');
            assert.equal(parseContext(timeline[5]).primary_name, 'Shipping address');
        });
    });

    describe('records member custom field value changes in the history (via the actions API)', function () {
        // `context` is a text column, so the API hands it back as a JSON string —
        // Admin parses it before reading `action_name`, and so does this.
        const parseContext = (action: {context: string | null}) => (typeof action.context === 'string' ? JSON.parse(action.context) : action.context);

        // Read back over the API the history log is served from, not the table,
        // so what Admin receives is what's asserted — `context` included.
        const memberEditedActionsViaApi = async (memberId: string) => {
            const {body} = await agent
                .get(`actions/?filter=resource_id:'${memberId}'%2Bresource_type:member&include=actor`)
                .expectStatus(200);
            return body.actions.filter((action: {event: string}) => action.event === 'edited');
        };

        it('marks a values-only edit as a custom-field change', async function () {
            // The payload that makes the whole feature auditable: without
            // action_name the log can't tell this from a name change.
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            await setValues(memberId, {[field.key]: 'Ghosts'});

            const actions = await memberEditedActionsViaApi(memberId);
            assert.equal(actions.length, 1);
            assert.equal(parseContext(actions[0]).action_name, 'custom_fields_edited');
            assert.equal(actions[0].resource_id, memberId);
            // The row still has to say who the member is and who changed them —
            // action_name titles the entry, it doesn't replace the rest of it.
            assert.ok(parseContext(actions[0]).primary_name, 'the action should name the member');
            assert.equal(actions[0].actor_type, 'user');
        });

        it('leaves a plain member edit unmarked', async function () {
            const memberId = await createMember();

            await agent
                .put(`members/${memberId}/`)
                .body({members: [{name: 'Renamed'}]})
                .expectStatus(200);

            const actions = await memberEditedActionsViaApi(memberId);
            assert.equal(actions.length, 1);
            assert.equal(parseContext(actions[0]).action_name, undefined);
        });

        it('leaves an edit that changes the member too unmarked', async function () {
            // The member's own save already fired the one action for this edit, and
            // it covers a change to the member itself — marking it as a custom-field
            // change would hide the rename behind the wrong label. The generic
            // "Member edited" is the honest title for a mixed edit.
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();

            await agent
                .put(`members/${memberId}/`)
                .body({members: [{name: 'Renamed', custom_fields: {[field.key]: 'Ghosts'}}]})
                .expectStatus(200);

            const actions = await memberEditedActionsViaApi(memberId);
            assert.equal(actions.length, 1);
            assert.equal(parseContext(actions[0]).action_name, undefined);
        });

        it('marks a full PUT that only really changes a custom field', async function () {
            // The Admin member editor resends the whole member, so the save is a
            // no-op and only the custom field actually changed.
            const field = await createField({name: 'Favourite topic'});
            const memberId = await createMember();
            const {body} = await agent.get(`members/${memberId}/`).expectStatus(200);
            const {email} = body.members[0];

            await agent
                .put(`members/${memberId}/`)
                .body({members: [{email, custom_fields: {[field.key]: 'Ghosts'}}]})
                .expectStatus(200);

            const actions = await memberEditedActionsViaApi(memberId);
            assert.equal(actions.length, 1);
            assert.equal(parseContext(actions[0]).action_name, 'custom_fields_edited');
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
