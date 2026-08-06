import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const supertest = require('supertest');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const {mockManager} = require('../../utils/e2e-framework');

// The importer reading custom field values back out of a members CSV, exercised at the
// API boundary. Its sibling members-exporter-custom-fields covers the write direction;
// together they are the round trip. The mapping (a column named for a field, or mapped
// onto one) and the validation (a value failing its field type fails its row) are the
// two behaviours proven here; the end-to-end export -> import loop lives in
// members-export-import.
describe('Members import — custom fields', function () {
    let request: {post: (_url: string) => any; get: (_url: string) => any};

    // The key is minted server-side from the name, so callers read it off the result.
    async function createField(name: string, type: string): Promise<string> {
        const res = await (request.post(localUtils.API.getApiQuery('members/custom_fields/')) as any)
            .set('Origin', config.get('url'))
            .send({members_custom_fields: [{name, type}]})
            .expect(201);
        return res.body.members_custom_fields[0].key;
    }

    // Upload a CSV built inline. `mapping` is the header -> target map the mapping step
    // sends; omitted, the importer reads each column under its own name (which is how an
    // exported file, whose headers already are the field targets, re-imports untouched).
    async function importCSV(csv: string, mapping?: Record<string, string>): Promise<any> {
        const csvPath = path.join(os.tmpdir(), `members-import-cf-${Date.now()}-${Math.random().toString(16).slice(2)}.csv`);
        fs.writeFileSync(csvPath, csv);
        try {
            let req = (request.post(localUtils.API.getApiQuery('members/upload/')) as any)
                .set('Origin', config.get('url'));
            for (const [header, target] of Object.entries(mapping ?? {})) {
                req = req.field(`mapping[${header}]`, target);
            }
            return await req.attach('membersfile', csvPath).expect('Content-Type', /json/);
        } finally {
            fs.unlinkSync(csvPath);
        }
    }

    const findMember = async (email: string): Promise<any> => {
        const res = await (request.get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(email)}&include=custom_fields`)) as any)
            .set('Origin', config.get('url'))
            .expect(200);
        return res.body.members.find((m: {email: string}) => m.email === email);
    };

    // The rows behind a member's values, which is the only place the storage model is
    // visible: the API hands back an assembled value either way.
    const storedLeaves = async (email: string): Promise<Array<{path: string, value_text: string}>> => {
        const member = await findMember(email);
        return models.Base.knex('members_custom_field_values')
            .where('member_id', member.id)
            .orderBy('path')
            .select('path', 'value_text');
    };

    beforeAll(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'newsletters', 'members:newsletters');
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockLabsEnabled('membersCustomFields');
    });

    afterEach(async function () {
        mockManager.restore();
        await models.Base.knex('members_custom_field_values').del();
        await models.Base.knex('members_custom_fields').del();
        await models.Base.knex('actions').whereIn('resource_type', ['member', 'member_custom_field']).del();
    });

    // An exported file re-imports with no mapping: its header is already the field target.
    it('reads a namespaced column onto a member with no mapping', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-auto@example.com';

        const res = await importCSV(`email,custom_fields.${key}\n${email},Bex\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.equal(member.custom_fields?.[key], 'Bex');
    });

    // A blank cell must not wipe an existing value: it means "no data for this row", the
    // same way a blank name or note column leaves the member's field untouched.
    it('leaves an existing value untouched when its column is blank on re-import', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-blank-keeps@example.com';

        await importCSV(`email,custom_fields.${key}\n${email},Bex\n`);
        assert.equal((await findMember(email)).custom_fields?.[key], 'Bex');

        const res = await importCSV(`email,custom_fields.${key}\n${email},\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        assert.equal((await findMember(email)).custom_fields?.[key], 'Bex', 'the blank cell did not clear the value');
    });

    it('maps an arbitrary header onto a custom field', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-mapped@example.com';

        const res = await importCSV(`Email Address,Preferred Name\n${email},Bex\n`, {'Email Address': 'email', 'Preferred Name': `custom_fields.${key}`});
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.equal(member.custom_fields?.[key], 'Bex');
    });

    it('reads an address from its sub-field columns', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-address@example.com';

        const csv = [
            `email,custom_fields.${key}.line1,custom_fields.${key}.city,custom_fields.${key}.postal_code,custom_fields.${key}.country`,
            `${email},1 High Street,London,E1 6AN,GB`,
            ''
        ].join('\n');

        const res = await importCSV(csv);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.deepEqual(member.custom_fields?.[key], {line1: '1 High Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'});
    });

    // No sub-field is required, so a spreadsheet carrying only part of an address
    // imports the part it has instead of failing the row.
    it('imports a row whose address fills only some sub-fields', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-partial-address@example.com';

        const res = await importCSV(`email,custom_fields.${key}.city\n${email},London\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.deepEqual(member.custom_fields?.[key], {city: 'London'});
    });

    // The sub-field equivalent of the blank-cell rule above: a sub-field is a field, so a
    // row writes the ones it fills and leaves the rest alone. Without this a file naming
    // one column would replace the whole address, clearing five it never mentioned.
    it('leaves the rest of a stored address alone when a file names only some of its columns', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-address-merge@example.com';
        const columns = ['line1', 'city', 'postal_code', 'country'].map(sub => `custom_fields.${key}.${sub}`).join(',');

        await importCSV(`email,${columns}\n${email},1 High Street,London,E1 6AN,GB\n`);
        assert.deepEqual((await findMember(email)).custom_fields?.[key], {line1: '1 High Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'});

        const res = await importCSV(`email,custom_fields.${key}.line1\n${email},2 Low Street\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        assert.deepEqual(
            (await findMember(email)).custom_fields?.[key],
            {line1: '2 Low Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'},
            'the columns the file did not carry kept their stored values'
        );
    });

    // The case worth pinning, because it surprises people: emptying a cell does not clear
    // the stored sub-field. A sub-field is a field, and a blank cell reads as "no data for
    // this row" there exactly as it does for a blank `name` column. No field, core or
    // custom, can be cleared through an import.
    it('keeps a stored sub-field when its column is present but blank', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-address-blank-cell@example.com';
        const columns = ['line1', 'city', 'postal_code', 'country'].map(sub => `custom_fields.${key}.${sub}`).join(',');

        await importCSV(`email,${columns}\n${email},1 High Street,London,E1 6AN,GB\n`);

        // The member moves somewhere with no postal code, so the publisher empties that
        // cell and re-imports.
        const res = await importCSV(`email,${columns}\n${email},"Flat 3, 8 Wan Chai Road",Hong Kong,,HK\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        assert.deepEqual(
            (await findMember(email)).custom_fields?.[key],
            {line1: 'Flat 3, 8 Wan Chai Road', city: 'Hong Kong', postal_code: 'E1 6AN', country: 'HK'},
            'the blanked cell left the stored postal code alone'
        );
    });

    // Where messy country codes actually come from: a spreadsheet exported from something
    // else, where the column was typed by hand over several years.
    it('normalises the case of an imported country code', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-country-case@example.com';

        const res = await importCSV(`email,custom_fields.${key}.country\n${email},gb\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        assert.deepEqual((await findMember(email)).custom_fields?.[key], {country: 'GB'});
    });

    // A stray space is not data. Read as a value it would make this address all-whitespace,
    // fail its "at least one part" rule, and take the member's name and email down with it.
    it('reads a whitespace-only address cell as blank rather than failing the row', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-address-space@example.com';

        const res = await importCSV(`email,custom_fields.${key}.city\n${email},"   "\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.equal(member.custom_fields?.[key], undefined, 'the whitespace cell set no address');
    });

    // The parts of an address are rows, so an import that names one column touches one
    // row and leaves its siblings where they are. Asserting the rows rather than the
    // assembled value is what pins the storage itself: read back through the API these
    // two cases look identical.
    it('writes one row per part, and touches only the parts a file names', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-leaf-rows@example.com';
        const columns = ['line1', 'city', 'country'].map(sub => `custom_fields.${key}.${sub}`).join(',');

        await importCSV(`email,${columns}\n${email},1 High Street,London,GB\n`);
        assert.deepEqual(await storedLeaves(email), [
            {path: 'city', value_text: 'London'},
            {path: 'country', value_text: 'GB'},
            {path: 'line1', value_text: '1 High Street'}
        ]);

        await importCSV(`email,custom_fields.${key}.city\n${email},Bristol\n`);
        assert.deepEqual(await storedLeaves(email), [
            {path: 'city', value_text: 'Bristol'},
            {path: 'country', value_text: 'GB'},
            {path: 'line1', value_text: '1 High Street'}
        ], 'only the named part moved');
    });

    // A composite can still be invalid, and when it is the whole row fails like any other.
    it('fails a row whose address has a malformed sub-field', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-bad-address@example.com';

        const res = await importCSV(`email,custom_fields.${key}.country\n${email},IRL\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        // Read next to a spreadsheet, so it names the column down to the sub-field.
        assert.equal(
            res.body.meta.stats.invalid[0].error,
            `custom_fields.${key}.country: Enter a 2-letter country code, like US.`
        );

        assert.equal(await findMember(email), undefined, 'the failed row created no member');
    });

    // A reason carries the punctuation of the copy it quotes; this one has a comma in it.
    it('carries a row\'s reasons as a list, so punctuation inside one cannot split it', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-reason-list@example.com';

        const res = await importCSV(`email,custom_fields.${key}.country\n${email},IRL\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.invalid.length, 1);

        const reason = `custom_fields.${key}.country: Enter a 2-letter country code, like US.`;
        assert.deepEqual(res.body.meta.stats.invalid[0].errors, [reason]);
        assert.equal(res.body.meta.stats.invalid[0].error, reason);
    });

    it('fails a row whose value is too long for its field type', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-too-long@example.com';

        const res = await importCSV(`email,custom_fields.${key}\n${email},${'x'.repeat(256)}\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.equal(
            res.body.meta.stats.invalid[0].error,
            `custom_fields.${key}: Use 255 characters or fewer.`
        );

        assert.equal(await findMember(email), undefined);
    });

    // An unrecognised column is dropped, not an error, so the member still imports.
    it('drops a namespaced column that names no active field', async function () {
        await createField('Nickname', 'short_text');
        const email = 'cf-unknown-col@example.com';

        const res = await importCSV(`email,custom_fields.does_not_exist\n${email},anything\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 0);

        assert.notEqual(await findMember(email), undefined);
    });

    // Off, no field is active, so even a column for a defined field is dropped like any
    // unknown one -- the value is never written.
    it('ignores custom field columns when the feature is disabled', async function () {
        const key = await createField('Nickname', 'short_text');
        mockManager.mockLabsDisabled('membersCustomFields');
        const email = 'cf-flag-off@example.com';

        const res = await importCSV(`email,custom_fields.${key}\n${email},Bex\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 0);

        const member = await findMember(email);
        const values = await models.Base.knex('members_custom_field_values').where('member_id', member.id);
        assert.equal(values.length, 0, 'no value written for a defined field while the feature was off');
    });

    // The export guards a leading =/+/-/@ with an apostrophe; the import strips it, so the
    // value doesn't gain an apostrophe each round trip.
    it('strips the export formula guard from a value', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-formula@example.com';

        const res = await importCSV(`email,custom_fields.${key}\n${email},'=SUM(A1:A9)\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.equal(member.custom_fields?.[key], '=SUM(A1:A9)');
    });
});
