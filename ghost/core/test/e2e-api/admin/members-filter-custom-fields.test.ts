import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// Filtering members by their custom field values. Values live in a separate table as
// one leaf row per field (a composite address stores one row per part), reached
// through the model's `custom_fields` relation. A filter names the field by its stable
// key and matches on value; the field's key is resolved to its stored id, and both
// halves of a `(key + value)` pair must match the same leaf:
//   (custom_fields.key:'company'+custom_fields.value:'Ghost')
//   (custom_fields.key:'shipping-address'+custom_fields.value.country:'GB')
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

        // An archived field's key no longer resolves. "is not set" must then match
        // nobody, not invert to match-all and silently widen the segment.
        it('matches nobody for is-not-set of an archived field', async function () {
            const field = await createField({name: 'Company'});
            await createMember({company: 'Ghost'});
            await createMember();
            await agent
                .put(`members/custom_fields/${field.key}/`)
                .body({members_custom_fields: [{status: 'archived'}]})
                .expectStatus(200);

            const matched = await browse("custom_fields.key:-'company'");
            assert.deepEqual(matched, []);
        });
    });

    describe('address fields', function () {
        it('filters by a subfield inside the address (country)', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            const uk = await createMember({
                'shipping-address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            await createMember({
                'shipping-address': {line1: '5 Main St', city: 'Boston', postal_code: '02101', country: 'US'}
            });
            await createMember();

            const matched = await browse("(custom_fields.key:'shipping-address'+custom_fields.value.country:'GB')");
            assert.deepEqual(matched, [uk.email]);
        });

        it('finds members with no address set', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            await createMember({
                'shipping-address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            const noAddress = await createMember();

            const matched = await browse("custom_fields.key:-'shipping-address'");
            assert.deepEqual(matched, [noAddress.email]);
        });

        it('matches a subfield case-insensitively (contains)', async function () {
            await createField({name: 'Shipping address', type: 'address'});
            const london = await createMember({
                'shipping-address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            await createMember({
                'shipping-address': {line1: '5 Main St', city: 'Boston', postal_code: '02101', country: 'US'}
            });

            const matched = await browse("(custom_fields.key:'shipping-address'+custom_fields.value.city:~'LONDON')");
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
                'shipping-address': {line1: '5 Main St', city: 'Boston', postal_code: '02101', country: 'US'}
            });
            await createMember({
                'shipping-address': {line1: '1 King St', city: 'London', postal_code: 'EC1', country: 'GB'}
            });
            await createMember();

            const matched = await browse("(custom_fields.key:'shipping-address'+custom_fields.value.country:-'GB')");
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
    });
});
