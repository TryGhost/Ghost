import assert from 'node:assert/strict';

const Papa = require('papaparse');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

const CORE_COLUMNS = [
    'id',
    'email',
    'name',
    'note',
    'subscribed_to_emails',
    'complimentary_plan',
    'stripe_customer_id',
    'created_at',
    'deleted_at',
    'labels',
    'tiers',
    'gift_id'
];

const ADDRESS_SUB_FIELDS = ['line1', 'line2', 'city', 'state', 'postal_code', 'country'];

/** Custom field columns are namespaced so a minted key can never take a core column. */
function columnFor(key: string, subField?: string) {
    return subField ? `custom_fields.${key}.${subField}` : `custom_fields.${key}`;
}

function addressColumnsFor(key: string) {
    return ADDRESS_SUB_FIELDS.map(sub => columnFor(key, sub));
}

const FULL_ADDRESS = {
    line1: '1 High Street',
    line2: 'Flat 2',
    city: 'London',
    state: 'Greater London',
    postal_code: 'E1 6AN',
    country: 'GB'
};

// Only the sub-fields the type requires; line2 and state are optional.
const MINIMAL_ADDRESS = {
    line1: '9 Long Lane',
    city: 'Bristol',
    postal_code: 'BS1 4DJ',
    country: 'GB'
};

describe('Members API — exportCSV with custom fields', function () {
    let agent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
    };

    // The key is minted server-side from the name, so callers read it off the result.
    async function createField(name: string, type: string) {
        const {body} = await agent
            .post('members/custom_fields/')
            .body({members_custom_fields: [{name, type}]})
            .expectStatus(201);
        return body.members_custom_fields[0];
    }

    async function archiveField(key: string) {
        await agent
            .put(`members/custom_fields/${key}/`)
            .body({members_custom_fields: [{status: 'archived'}]})
            .expectStatus(200);
    }

    let memberCounter = 0;
    async function createMember(customFields?: Record<string, unknown>) {
        memberCounter += 1;
        const email = `export-custom-fields-${memberCounter}@example.com`;
        const {body} = await agent
            .post('members/')
            .body({members: [{email}]})
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

    async function exportCSV() {
        const res = await agent.get('/members/upload/?limit=all').expectStatus(200);
        const parsed = Papa.parse(res.text.trim(), {header: true});
        return {
            columns: parsed.meta.fields as string[],
            rowFor: (id: string) => parsed.data.find((row: {id: string}) => row.id === id)
        };
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

    it('adds a column per active field, expanding an address into its sub-fields', async function () {
        const nickname = await createField('Nickname', 'short_text');
        const bio = await createField('Bio', 'long_text');
        const address = await createField('Shipping Address', 'address');

        await createMember();

        const {columns} = await exportCSV();

        assert.deepEqual(columns, [
            ...CORE_COLUMNS,
            columnFor(nickname.key),
            columnFor(bio.key),
            ...addressColumnsFor(address.key)
        ]);
    });

    it('exports the values a member has set', async function () {
        const nickname = await createField('Nickname', 'short_text');
        const bio = await createField('Bio', 'long_text');
        const address = await createField('Shipping Address', 'address');

        const member = await createMember({
            [nickname.key]: 'Bex',
            [bio.key]: 'Writes about trains.',
            [address.key]: FULL_ADDRESS
        });

        const {rowFor} = await exportCSV();
        const row = rowFor(member.id);

        assert.equal(row[columnFor(nickname.key)], 'Bex');
        assert.equal(row[columnFor(bio.key)], 'Writes about trains.');
        for (const sub of ADDRESS_SUB_FIELDS) {
            assert.equal(row[columnFor(address.key, sub)], FULL_ADDRESS[sub as keyof typeof FULL_ADDRESS]);
        }
    });

    it('leaves cells empty for fields a member has not filled in', async function () {
        const nickname = await createField('Nickname', 'short_text');
        const bio = await createField('Bio', 'long_text');
        const address = await createField('Shipping Address', 'address');

        const partial = await createMember({[nickname.key]: 'Sam'});
        const empty = await createMember();

        const {rowFor} = await exportCSV();

        const partialRow = rowFor(partial.id);
        assert.equal(partialRow[columnFor(nickname.key)], 'Sam');
        assert.equal(partialRow[columnFor(bio.key)], '');
        assert.equal(partialRow[columnFor(address.key, 'line1')], '');

        const emptyRow = rowFor(empty.id);
        assert.equal(emptyRow[columnFor(nickname.key)], '');
        assert.equal(emptyRow[columnFor(bio.key)], '');
        for (const sub of ADDRESS_SUB_FIELDS) {
            assert.equal(emptyRow[columnFor(address.key, sub)], '');
        }
    });

    it('leaves optional address sub-fields empty when the address omits them', async function () {
        const address = await createField('Shipping Address', 'address');

        const member = await createMember({[address.key]: MINIMAL_ADDRESS});

        const {rowFor} = await exportCSV();
        const row = rowFor(member.id);

        assert.equal(row[columnFor(address.key, 'line1')], MINIMAL_ADDRESS.line1);
        assert.equal(row[columnFor(address.key, 'city')], MINIMAL_ADDRESS.city);
        assert.equal(row[columnFor(address.key, 'postal_code')], MINIMAL_ADDRESS.postal_code);
        assert.equal(row[columnFor(address.key, 'country')], MINIMAL_ADDRESS.country);
        assert.equal(row[columnFor(address.key, 'line2')], '');
        assert.equal(row[columnFor(address.key, 'state')], '');
    });

    // The header is derived from the first row, so a field with no values anywhere
    // still has to reach the column list.
    it('includes the columns when no member has a value', async function () {
        const nickname = await createField('Nickname', 'short_text');

        await createMember();

        const {columns} = await exportCSV();

        assert.deepEqual(columns, [...CORE_COLUMNS, columnFor(nickname.key)]);
    });

    // JavaScript orders integer-like object keys before every other key, and the
    // header comes from the first row's key order. An unnamespaced numeric key
    // would jump the whole column list; the namespace is what keeps it in place.
    it('keeps a numeric key in insertion order rather than first', async function () {
        const numeric = await createField('2024', 'short_text');

        await createMember({[numeric.key]: 'a value'});

        const {columns} = await exportCSV();

        assert.deepEqual(columns, [...CORE_COLUMNS, columnFor(numeric.key)]);
    });

    it('escapes values that would otherwise break the CSV', async function () {
        const notes = await createField('Notes', 'short_text');

        const value = 'Smith, "Bex"\r\nsecond line';
        const member = await createMember({[notes.key]: value});

        const {rowFor} = await exportCSV();

        assert.equal(rowFor(member.id)[columnFor(notes.key)], value);
    });

    // papaparse's escapeFormulae guard, which the export has always applied to
    // every column. It prefixes the cell, so a formula-like value is deliberately
    // not byte-identical on the way out.
    it('defuses a value that a spreadsheet would read as a formula', async function () {
        const notes = await createField('Notes', 'short_text');

        const member = await createMember({[notes.key]: '=SUM(A1:A9)'});

        const {rowFor} = await exportCSV();

        assert.equal(rowFor(member.id)[columnFor(notes.key)], "'=SUM(A1:A9)");
    });

    // Pre-existing behaviour, pinned here because deleting the static header list
    // means nothing else describes what an empty export looks like.
    it('writes nothing at all when there are no members', async function () {
        await createField('Nickname', 'short_text');

        const res = await agent.get('/members/upload/?limit=all').expectStatus(200);

        assert.equal(res.text, '');
    });

    // Whether a name like this is reservable is the definitions layer's business,
    // not the export's — the namespace holds either way. The property itself is
    // pinned in the custom-field-types unit tests, where the colliding key is
    // constructed directly rather than minted.
    it('keeps a field named after a core column out of that column', async function () {
        const field = await createField('Email', 'short_text');

        const member = await createMember({[field.key]: 'not an email address'});

        const {columns, rowFor} = await exportCSV();
        const row = rowFor(member.id);

        assert.deepEqual(columns, [...CORE_COLUMNS, columnFor(field.key)]);
        assert.equal(row.email, member.email);
        assert.equal(row[columnFor(field.key)], 'not an email address');
    });

    it('excludes archived fields', async function () {
        const kept = await createField('Nickname', 'short_text');
        const archived = await createField('Old Field', 'short_text');

        const member = await createMember({
            [kept.key]: 'Bex',
            [archived.key]: 'stale value'
        });

        await archiveField(archived.key);

        const {columns, rowFor} = await exportCSV();

        assert.deepEqual(columns, [...CORE_COLUMNS, columnFor(kept.key)]);
        assert.equal(rowFor(member.id)[columnFor(kept.key)], 'Bex');
    });

    // Fields can only be created while the flag is on, so this is the site that
    // defined fields and then had the flag turned back off.
    it('omits custom field columns when the flag is disabled', async function () {
        const nickname = await createField('Nickname', 'short_text');

        const member = await createMember({[nickname.key]: 'Bex'});

        mockManager.mockLabsDisabled('membersCustomFields');

        const {columns, rowFor} = await exportCSV();

        assert.deepEqual(columns, CORE_COLUMNS);
        assert.equal(rowFor(member.id)[columnFor(nickname.key)], undefined);
    });
});
