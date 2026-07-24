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

    // The column a matching export produced re-imports with no mapping: its header is
    // already the field target, so the importer reads it straight through.
    it('reads a namespaced column onto a member with no mapping', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-auto@example.com';

        const res = await importCSV(`email,custom_fields.${key}\n${email},Bex\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember(email);
        assert.equal(member.custom_fields?.[key], 'Bex');
    });

    // Re-importing a member with a blank custom field cell must not wipe the value they
    // already hold: a blank cell in a bulk file means "no data for this row", the same way
    // a blank name or note column leaves the existing member field untouched.
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

    // A publisher's own column name is pointed at a field through the mapping step, the
    // same channel the core fields are mapped through.
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

    // A composite carrying some but not all of its required sub-fields is an invalid
    // value, so the whole row fails and is reported -- like any other invalid import row.
    it('fails a row whose address is missing a required sub-field', async function () {
        const key = await createField('Shipping Address', 'address');
        const email = 'cf-partial-address@example.com';

        // city alone, no line1/postal_code/country.
        const res = await importCSV(`email,custom_fields.${key}.city\n${email},London\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.match(res.body.meta.stats.invalid[0].error, /Shipping Address/);

        assert.equal(await findMember(email), undefined, 'the failed row created no member');
    });

    it('fails a row whose value is too long for its field type', async function () {
        const key = await createField('Nickname', 'short_text');
        const email = 'cf-too-long@example.com';

        const res = await importCSV(`email,custom_fields.${key}\n${email},${'x'.repeat(256)}\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.match(res.body.meta.stats.invalid[0].error, /Nickname/);

        assert.equal(await findMember(email), undefined);
    });

    // A column naming no active field is dropped, not an error: the member imports and
    // simply carries no value for it. The write boundary stays closed to anything the
    // definitions do not recognise.
    it('drops a namespaced column that names no active field', async function () {
        await createField('Nickname', 'short_text');
        const email = 'cf-unknown-col@example.com';

        const res = await importCSV(`email,custom_fields.does_not_exist\n${email},anything\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 0);

        assert.notEqual(await findMember(email), undefined);
    });

    // With the feature off no field is active, so a custom_fields.* column is carried
    // through and dropped exactly as an unknown column always was -- the member imports.
    it('ignores custom field columns when the feature is disabled', async function () {
        mockManager.mockLabsDisabled('membersCustomFields');
        const email = 'cf-flag-off@example.com';

        const res = await importCSV(`email,custom_fields.nickname\n${email},Bex\n`);
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 0);
    });

    // The export guards a formula-like value with a leading apostrophe; the import
    // strips it back off, so the value does not gain an apostrophe on every round trip.
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
