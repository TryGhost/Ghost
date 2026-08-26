import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// Filtering members by their custom field values. Values live in a separate table as
// one leaf row per field (a composite address stores one row per part), reached
// through the model's `custom_fields` relation. A filter names the field by its stable
// key and matches on value; both halves of a `(key + value)` pair must match the same
// leaf:
//   (custom_fields.key:'company'+custom_fields.value:'Ghost')
//   (custom_fields.key:'shipping_address'+custom_fields.value.country:'GB')
// These tests pin the behaviour end to end over the real browse endpoint.
describe('Members filtering by custom fields', function () {
    let agent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
    };

    async function createField(field: {name: string, type?: string}) {
        const {body} = await agent
            .post('members/custom_fields/')
            .body({members_custom_fields: [{type: 'short_text', ...field}]})
            .expectStatus(201);
        return body.members_custom_fields[0];
    }

    let memberCounter = 0;
    async function createMember(customFields?: Record<string, unknown>, labels?: string[]): Promise<{id: string, email: string}> {
        memberCounter += 1;
        const email = `cf-filter-${memberCounter}@example.com`;
        const member: Record<string, unknown> = {email};
        if (labels) {
            member.labels = labels.map(name => ({name}));
        }
        const {body} = await agent
            .post('members/')
            .body({members: [member]})
            .expectStatus(201);
        const id = body.members[0].id;
        if (customFields) {
            await agent
                .put(`members/${id}/`)
                .body({members: [{custom_fields: customFields}]})
                .expectStatus(200);
        }
        return {id, email};
    }

    async function browse(filter: string): Promise<string[]> {
        const {body} = await agent
            .get(`members/?filter=${encodeURIComponent(filter)}`)
            .expectStatus(200);
        return body.members.map((m: {email: string}) => m.email);
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
        await models.Base.knex('members_labels').del();
        await models.Base.knex('members').del();
    });

    describe('text fields', function () {
        it('filters by equality on a short text value', async function () {
            await createField({name: 'Company'});
            const ghost = await createMember({company: 'Ghost'});
            await createMember({company: 'Acme'});
            await createMember();

            const matched = await browse("(custom_fields.key:'company'+custom_fields.value:'Ghost')");
            assert.deepEqual(matched, [ghost.email]);
        });

        it('filters by a contains match on a short text value', async function () {
            await createField({name: 'Company'});
            const a = await createMember({company: 'Ghost Foundation'});
            const b = await createMember({company: 'Ghosting Inc'});
            await createMember({company: 'Acme'});

            const matched = await browse("(custom_fields.key:'company'+custom_fields.value:~'Ghost')");
            assert.deepEqual(matched.sort(), [a.email, b.email].sort());
        });

        it('finds members with no value for a field (is empty)', async function () {
            await createField({name: 'Company'});
            await createMember({company: 'Ghost'});
            const noCompanyA = await createMember({}, ['prospect']);
            const noCompanyB = await createMember();

            const matched = await browse("custom_fields.key:-'company'");
            assert.deepEqual(matched.sort(), [noCompanyA.email, noCompanyB.email].sort());
        });

        it('finds members that have any value for a field (is set)', async function () {
            await createField({name: 'Company'});
            const ghost = await createMember({company: 'Ghost'});
            const acme = await createMember({company: 'Acme'});
            await createMember();

            const matched = await browse("custom_fields.key:'company'");
            assert.deepEqual(matched.sort(), [ghost.email, acme.email].sort());
        });

        // Archiving hides a field from the admin dropdown but leaves it filterable through
        // the API: its rows stay, so is-not-set still means "no value for this field", not
        // match-nobody.
        it('keeps an archived field filterable: is-not-set matches members with no value', async function () {
            const field = await createField({name: 'Company'});
            await createMember({company: 'Ghost'});
            const noCompany = await createMember();
            await agent
                .put(`members/custom_fields/${field.key}/`)
                .body({members_custom_fields: [{status: 'archived'}]})
                .expectStatus(200);

            const matched = await browse("custom_fields.key:-'company'");
            assert.deepEqual(matched, [noCompany.email]);
        });
    });

    describe('address fields', function () {
        it('filters by a subfield inside the address (country)', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            const uk = await createMember({
                'shipping_address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            await createMember({
                'shipping_address': {line1: '5 Main St', city: 'Boston', postal_code: '02101', country: 'US'}
            });
            await createMember();

            const matched = await browse("(custom_fields.key:'shipping_address'+custom_fields.value.country:'GB')");
            assert.deepEqual(matched, [uk.email]);
        });

        it('finds members with no address set', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            await createMember({
                'shipping_address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            const noAddress = await createMember();

            const matched = await browse("custom_fields.key:-'shipping_address'");
            assert.deepEqual(matched, [noAddress.email]);
        });

        it('finds members who have a value for a subfield (part is set)', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            const withCountry = await createMember({'shipping_address': {city: 'London', country: 'GB'}});
            await createMember({'shipping_address': {city: 'Boston'}});
            await createMember();

            const matched = await browse("(custom_fields.key:'shipping_address'+custom_fields.path:'country')");
            assert.deepEqual(matched, [withCountry.email]);
        });

        it('finds members missing a subfield (part is not set), including those with no address', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            await createMember({'shipping_address': {city: 'London', country: 'GB'}});
            const cityOnly = await createMember({'shipping_address': {city: 'Boston'}});
            const noAddress = await createMember();

            const matched = await browse("(custom_fields.key:'shipping_address'+custom_fields.path:-'country')");
            assert.deepEqual(matched.sort(), [cityOnly.email, noAddress.email].sort());
        });

        it('matches a subfield case-insensitively (contains)', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            const london = await createMember({
                'shipping_address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            await createMember({
                'shipping_address': {line1: '5 Main St', city: 'Boston', postal_code: '02101', country: 'US'}
            });

            const matched = await browse("(custom_fields.key:'shipping_address'+custom_fields.value.city:~'LONDON')");
            assert.deepEqual(matched, [london.email]);
        });
    });

    describe('negation', function () {
        // A negated value clause must stay on the same joined row as the key
        // clause: "company is-not Ghost" means the member's *company* row isn't
        // Ghost, not that the member has no row valued Ghost anywhere. The Acme
        // member here also carries a team valued Ghost, which a split query would
        // wrongly use to exclude them.
        it('excludes a value on the same field row (is-not)', async function () {
            await createField({name: 'Company'});
            await createField({name: 'Team'});
            const acmeGhostTeam = await createMember({company: 'Acme', team: 'Ghost'});
            const acme = await createMember({company: 'Acme'});
            await createMember({company: 'Ghost'});
            await createMember();

            const matched = await browse("(custom_fields.key:'company'+custom_fields.value:-'Ghost')");
            assert.deepEqual(matched.sort(), [acmeGhostTeam.email, acme.email].sort());
        });

        it('excludes a substring on the same field row (does-not-contain)', async function () {
            await createField({name: 'Company'});
            const acme = await createMember({company: 'Acme'});
            await createMember({company: 'Ghost Foundation'});
            await createMember();

            const matched = await browse("(custom_fields.key:'company'+custom_fields.value:-~'Ghost')");
            assert.deepEqual(matched, [acme.email]);
        });

        // "country is not GB" asks for members who HAVE an address whose country
        // isn't GB. A member with the GB address is excluded, and so is a member with
        // no address at all — the key discriminator requires the field to be present.
        it('excludes an address subfield value (is-not) and members with no address', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            const us = await createMember({
                'shipping_address': {line1: '5 Main St', city: 'Boston', postal_code: '02101', country: 'US'}
            });
            await createMember({
                'shipping_address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            await createMember();

            const matched = await browse("(custom_fields.key:'shipping_address'+custom_fields.value.country:-'GB')");
            assert.deepEqual(matched, [us.email]);
        });
    });

    describe('behind the flag', function () {
        it('rejects a custom field filter when the flag is off', async function () {
            await createField({name: 'Company'});
            await createMember({company: 'Ghost'});
            mockManager.mockLabsDisabled('membersCustomFields');

            // With the feature off the relation is not registered, so the filter
            // references an unknown relation and the request is rejected rather than
            // quietly returning custom-field-filtered results.
            await agent
                .get(`members/?filter=${encodeURIComponent("(custom_fields.key:'company'+custom_fields.value:'Ghost')")}`)
                .expectStatus(400);
        });
    });

    describe('invalid grammar', function () {
        // A value or path clause names no field on its own — it means something only paired
        // with a key in the same leaf, which arrives as a group. An unpaired one is rejected
        // rather than passed through to a storage column that does not exist.
        it('rejects a value clause with no field key', async function () {
            await agent
                .get(`members/?filter=${encodeURIComponent("custom_fields.value:'Ghost'")}`)
                .expectStatus(400);
        });

        it('rejects a part-presence clause with no field key', async function () {
            await agent
                .get(`members/?filter=${encodeURIComponent("custom_fields.path:'country'")}`)
                .expectStatus(400);
        });

        // A recognised (key + …) compound that also carries a clause naming no leaf
        // column is rejected rather than silently dropped, which would leave a wider
        // match on the key alone.
        it('rejects an unsupported clause inside a field compound', async function () {
            await agent
                .get(`members/?filter=${encodeURIComponent("(custom_fields.key:'company'+custom_fields.invalid:'x')")}`)
                .expectStatus(400);
        });
    });

    describe('composition with other filters', function () {
        it('combines a custom field with a label relation filter', async function () {
            await createField({name: 'Company'});
            const target = await createMember({company: 'Ghost'}, ['vip']);
            await createMember({company: 'Ghost'}, ['prospect']);
            await createMember({company: 'Acme'}, ['vip']);

            const matched = await browse("label:'vip'+(custom_fields.key:'company'+custom_fields.value:'Ghost')");
            assert.deepEqual(matched, [target.email]);
        });

        it('combines two custom fields using OR', async function () {
            await createField({name: 'Company'});
            await createField({name: 'Industry'});
            const ghost = await createMember({company: 'Ghost'});
            const tech = await createMember({industry: 'Tech'});
            await createMember({company: 'Acme', industry: 'Retail'});

            const matched = await browse("(custom_fields.key:'company'+custom_fields.value:'Ghost'),(custom_fields.key:'industry'+custom_fields.value:'Tech')");
            assert.deepEqual(matched.sort(), [ghost.email, tech.email].sort());
        });

        // Two whole-field is-set filters carry no value, so neither needs a group of its
        // own and they arrive as one flat conjunction of key clauses. That reads as a
        // compound describing a single leaf unless the transformer counts the keys.
        it('combines two whole-field is-set filters using AND', async function () {
            await createField({name: 'Company'});
            await createField({name: 'Industry'});
            const both = await createMember({company: 'Ghost', industry: 'Tech'});
            await createMember({company: 'Acme'});
            await createMember({industry: 'Retail'});

            const matched = await browse("custom_fields.key:'company'+custom_fields.key:'industry'");
            assert.deepEqual(matched, [both.email]);
        });

        it('combines a whole-field is-set filter with a value filter on another field', async function () {
            await createField({name: 'Company'});
            await createField({name: 'Industry'});
            const target = await createMember({company: 'Ghost', industry: 'Tech'});
            await createMember({company: 'Acme', industry: 'Tech'});
            await createMember({company: 'Ghost'});

            const matched = await browse("custom_fields.key:'industry'+(custom_fields.key:'company'+custom_fields.value:'Ghost')");
            assert.deepEqual(matched, [target.email]);
        });
    });

    // A saved segment is only useful if it works everywhere the members list feeds a
    // filter, not just the list view. Export and bulk actions run the same NQL, so the
    // custom_fields relation has to be served on those paths too.
    describe('in export and bulk actions', function () {
        it('exports only members a custom-field filter matches', async function () {
            await createField({name: 'Company'});
            const ghost = await createMember({company: 'Ghost'});
            const acme = await createMember({company: 'Acme'});

            const filter = encodeURIComponent("(custom_fields.key:'company'+custom_fields.value:'Ghost')");
            const {text} = await agent.get(`members/upload/?limit=all&filter=${filter}`).expectStatus(200);

            assert.ok(text.includes(ghost.email), 'exports the matching member');
            assert.ok(!text.includes(acme.email), 'excludes a non-matching member');
        });

        it('bulk-acts on only members a custom-field filter matches', async function () {
            await createField({name: 'Company'});
            const ghost = await createMember({company: 'Ghost'});
            await createMember({company: 'Acme'});
            const label = await models.Label.add({name: 'cf-bulk-target'});

            const filter = encodeURIComponent("(custom_fields.key:'company'+custom_fields.value:'Ghost')");
            const {body} = await agent
                .put(`members/bulk/?filter=${filter}`)
                .body({bulk: {action: 'addLabel', meta: {label: {id: label.id, name: 'cf-bulk-target'}}}})
                .expectStatus(200);

            assert.equal(body.bulk.meta.stats.successful, 1);

            const labelled = await browse("label:'cf-bulk-target'");
            assert.deepEqual(labelled, [ghost.email]);
        });
    });
});
