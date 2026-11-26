import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

const {
  agentProvider,
  fixtureManager,
  hostLimits,
  mockManager,
} = require('../../utils/e2e-framework');
const { knex } = require('../../../core/server/data/db');

type Field = {
  key: string;
  name: string;
  type: string;
  status: string;
  settings?: unknown;
  access: { member: string };
};
type ExportData = { members_metafields?: unknown[] };
type Export = { db: [{ meta: { version: string }; data: ExportData }] };

type Problem = { help: string; message: string };

type Member = { id: string; email: string; metafields?: { custom?: Record<string, unknown> } };

type ApiRequest = Promise<{
  body: { members_metafields: Field[]; members: Member[]; problems: Problem[] } & Export;
  text: string;
}> & {
  body(payload: object): ApiRequest;
  attach(field: string, file: string): ApiRequest;
  expectStatus(status: number): ApiRequest;
};

type AdminAgent = {
  get(url: string): ApiRequest;
  post(url: string): ApiRequest;
  put(url: string): ApiRequest;
  loginAsOwner(): Promise<void>;
};

const ANIMALS = { options: ['Dog', 'Cat'], multiple: true };

// A members CSV carries what each member holds in each custom field, by the field's key. A site
// export carries the fields themselves, and an import adds them to the site under the same keys,
// so the CSV's values, segments and checkout settings name the same fields after the import.
describe('Custom fields in a site export and import', function () {
  let agent: AdminAgent;
  let directory: string;

  /** Every custom field the site has, archived ones included, in the site's order. */
  async function browse(): Promise<Field[]> {
    const { body } = await agent
      .get(`members/metafields/custom/?filter=${encodeURIComponent('status:[active,archived]')}`)
      .expectStatus(200);
    return body.members_metafields.map(({ key, name, type, status, settings, access }) => ({
      key,
      name,
      type,
      status,
      ...(settings === undefined ? {} : { settings }),
      access,
    }));
  }

  const names = async () => (await browse()).map(({ name }) => name);

  async function add(field: object): Promise<Field> {
    const { body } = await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [field] })
      .expectStatus(201);
    return body.members_metafields[0];
  }

  async function edit(key: string, changes: object) {
    await agent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [changes] })
      .expectStatus(200);
  }

  async function removeFields() {
    await knex('members_metafields').del();
  }

  /** What a site export holds of the site's custom fields. */
  async function exportFields(): Promise<ExportData> {
    const { body } = await agent.get('db/').expectStatus(200);
    return { members_metafields: body.db[0].data.members_metafields };
  }

  /** Imports `data` as a site export, and returns the problems the import reports about fields. */
  async function importData(data: ExportData): Promise<Problem[]> {
    const file = path.join(directory, 'export.json');
    await fs.writeFile(file, JSON.stringify({ db: [{ meta: { version: '6.0.0' }, data }] }));
    const { body } = await agent.post('db/').attach('importfile', file).expectStatus(200);
    return body.problems.filter(({ help }) => help === 'Custom field');
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-fields-import-e2e-'));
  });

  afterAll(async function () {
    await fs.remove(directory);
  });

  afterEach(async function () {
    mockManager.restore();
    await hostLimits.restoreHostLimits();
    await removeFields();
    await knex('members').del();
    await knex('actions').where('resource_type', 'member_custom_field').del();
  });

  it('brings the custom fields of an exported site back, in their order', async function () {
    await add({ name: 'Company', type: 'short_text', access: { member: 'write' } });
    await add({ name: 'Favourite animals', type: 'list', settings: ANIMALS });
    await add({ name: 'Delivery address', type: 'address' });
    // A renamed field keeps its key, so the import can't derive the key from the name.
    await edit('company', { name: 'Employer' });
    await edit('delivery_address', { status: 'archived' });
    await agent
      .put('members/metafields/custom/')
      .body({
        members_metafields: [
          { key: 'favourite_animals' },
          { key: 'company' },
          { key: 'delivery_address' },
        ],
      })
      .expectStatus(200);
    const before = await browse();
    const exported = await exportFields();
    await removeFields();

    const problems = await importData(exported);

    assert.deepEqual(await browse(), before);
    assert.deepEqual(
      before.map(({ key }) => key),
      ['favourite_animals', 'company', 'delivery_address'],
    );
    assert.deepEqual(problems, []);
  });

  it('brings a member’s values back from the members CSV after the site import', async function () {
    mockManager.mockMail();
    await add({ name: 'Company', type: 'short_text' });
    await edit('company', { name: 'Employer' });
    const { body: created } = await agent
      .post('members/')
      .body({
        members: [{ email: 'round-trip@example.com', metafields: { custom: { company: 'Acme' } } }],
      })
      .expectStatus(201);
    const { text: csv } = await agent.get('members/upload/?limit=all').expectStatus(200);
    const exported = await exportFields();
    await knex('members').where('id', created.members[0].id).del();
    await removeFields();

    await importData(exported);
    const file = path.join(directory, 'members.csv');
    await fs.writeFile(file, csv);
    await agent.post('members/upload/').attach('membersfile', file).expectStatus(201);

    const { body } = await agent
      .get(
        `members/?filter=${encodeURIComponent("email:'round-trip@example.com'")}&include=metafields`,
      )
      .expectStatus(200);
    assert.deepEqual(body.members[0].metafields?.custom, { company: 'Acme' });
  });

  it('adds the fields of the file after the site’s own', async function () {
    await add({ name: 'Company', type: 'short_text' });
    const exported = await exportFields();
    await removeFields();
    await add({ name: 'Shoe size', type: 'short_text' });

    await importData(exported);

    assert.deepEqual(await names(), ['Shoe size', 'Company']);
  });

  it('adds nothing when a file is imported again', async function () {
    await add({ name: 'Company', type: 'short_text' });
    await add({ name: 'Favourite animals', type: 'list', settings: ANIMALS });
    const exported = await exportFields();
    await removeFields();

    await importData(exported);
    const imported = await browse();
    const problems = await importData(exported);

    assert.deepEqual(await browse(), imported);
    assert.deepEqual(
      problems.map(({ message }) => message),
      [
        'Custom field was not imported because the site already has it.',
        'Custom field was not imported because the site already has it.',
      ],
    );
  });

  it('keeps the key of a field whose name the site gives another field', async function () {
    await add({ name: 'Company', type: 'short_text' });
    const exported = await exportFields();
    await removeFields();
    await add({ name: 'Employer', type: 'short_text' });
    await edit('employer', { name: 'company' });

    await importData(exported);

    assert.deepEqual(
      (await browse()).map(({ key, name }) => ({ key, name })),
      [
        { key: 'employer', name: 'company' },
        { key: 'company', name: 'Company (2)' },
      ],
    );
  });

  it('numbers a name the database counts as another field’s', async function () {
    // The names differ by an accent, which MySQL's default collation ignores.
    await add({ name: 'Cafe', type: 'short_text' });

    await importData({ members_metafields: [exportedField({ key: 'cafe_accent', name: 'Café' })] });

    assert.deepEqual(
      (await browse()).map(({ key, name }) => ({ key, name })),
      [
        { key: 'cafe', name: 'Cafe' },
        { key: 'cafe_accent', name: 'Café (2)' },
      ],
    );
  });

  // Custom fields had to be asked for before an export held them by default.
  it('accepts asking an export for the custom fields', async function () {
    await add({ name: 'Company', type: 'short_text' });

    const { body } = await agent.get('db/?include=members_metafields').expectStatus(200);

    assert.deepEqual(
      body.db[0].data.members_metafields?.map((row) => (row as { key: string }).key),
      ['company'],
    );
  });

  it('leaves out a field that cannot be one and imports the rest', async function () {
    const problems = await importData({
      members_metafields: [
        exportedField({
          key: 'pets',
          name: 'Pets',
          type: 'list',
          settings: '{"options":["Dog"],"multiple":true}',
        }),
        exportedField({ key: 'company', name: 'Company', sort_order: 1 }),
        exportedField({ key: 'shoe_size', name: 'Shoe size', type: 'shoe', sort_order: 2 }),
      ],
    });

    assert.deepEqual(await names(), ['Company']);
    assert.deepEqual(
      problems.map(({ message }) => message),
      [
        'Custom field was not imported because it could not be read.',
        'Custom field was not imported: Give the list at least 2 options.',
      ],
    );
  });

  it('imports a field another namespace holds as nothing', async function () {
    await importData({
      members_metafields: [exportedField({ namespace: 'app_shop', key: 'size', name: 'Size' })],
    });

    assert.deepEqual(await browse(), []);
  });

  it('leaves the fields out of a site whose plan has no custom fields', async function () {
    await hostLimits.setHostLimits({
      limitCustomFields: {
        disabled: true,
        error: 'Custom fields are available on the Publisher plan and above.',
      },
    });

    const problems = await importData({
      members_metafields: [exportedField({ key: 'company', name: 'Company' })],
    });

    await hostLimits.restoreHostLimits();
    assert.deepEqual(await browse(), []);
    assert.deepEqual(
      problems.map(({ message }) => message),
      [
        'Custom field was not imported: Custom fields are available on the Publisher plan and above.',
      ],
    );
  });
});

/** A `members_metafields` row as an export holds one, a short text field unless `row` says. */
function exportedField(row: Record<string, unknown>) {
  return {
    id: '0123456789abcdef01234567',
    namespace: 'custom',
    type: 'short_text',
    settings: null,
    status: 'active',
    member_access: 'none',
    sort_order: 0,
    created_at: '2026-11-26T10:00:00.000Z',
    updated_at: null,
    ...row,
  };
}
