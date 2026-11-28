import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const { knex } = require('../../../core/server/data/db');

type Tier = { id: string; slug: string; name: string; type: string };
type ExportData = Record<string, unknown[]>;
type Export = { db: [{ meta: { version: string }; data: ExportData }] };
type Problem = { help: string; message: string };

type ApiRequest = Promise<{
  body: { checkout_config: [Record<string, unknown>]; tiers: Tier[]; problems: Problem[] } & Export;
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

/** What a site export holds that the checkout settings are made of, with the tiers they name. */
const CHECKOUT_TABLES = [
  'members_metafields',
  'members_metafield_bindings',
  'stripe_checkout_config',
  'tier_requirements',
  'tier_requirement_tiers',
  'products',
  'stripe_products',
  'stripe_prices',
];

const DESIGN = {
  customize: true,
  button_color: '#ff5a1f',
  background_color: '#ffffff',
  border_style: 'pill',
  font_family: 'roboto_slab',
};

const FIELDS = [
  { name: 'Delivery address', type: 'address' },
  { name: 'Recipient name', type: 'short_text' },
  { name: 'Phone', type: 'phone' },
];

const shipping = (over: Record<string, unknown> = {}) => ({
  collect: true,
  address: { custom_field_key: 'delivery_address' },
  name: { custom_field_key: 'recipient_name' },
  ...over,
});

const phone = { collect: true, custom_field_key: 'phone' };

// Stripe Checkout's settings say how checkout pages look and what they ask buyers for on which
// paid tiers, saving each answer into a custom field. A site export carries them, and an import
// saves them on the site, on the site's tiers and into the custom fields the import adds.
describe('Stripe Checkout settings in a site export and import', function () {
  let agent: AdminAgent;
  let directory: string;
  let paidTier: Tier;

  async function readCheckout() {
    const { body } = await agent.get('stripe/checkout/config/').expectStatus(200);
    return body.checkout_config[0];
  }

  async function setCheckout(config: object) {
    await agent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [config] })
      .expectStatus(200);
  }

  async function addFields() {
    for (const field of FIELDS) {
      await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [field] })
        .expectStatus(201);
    }
  }

  async function removeCheckout() {
    await knex('stripe_checkout_config').del();
    await knex('members_metafield_bindings').del();
    await knex('tier_requirement_tiers').del();
    await knex('tier_requirements').del();
    await knex('members_metafields').del();
  }

  /** What a site export holds of the site's checkout settings. */
  async function exportCheckout(): Promise<ExportData> {
    const { body } = await agent.get('db/').expectStatus(200);
    const { data } = body.db[0];
    return Object.fromEntries(CHECKOUT_TABLES.map((table) => [table, data[table]]));
  }

  /** Imports `data` as a site export, and returns the problems the import reports about it. */
  async function importData(data: ExportData): Promise<Problem[]> {
    const file = path.join(directory, 'export.json');
    await fs.writeFile(file, JSON.stringify({ db: [{ meta: { version: '6.0.0' }, data }] }));
    const { body } = await agent.post('db/').attach('importfile', file).expectStatus(200);
    return body.problems.filter(({ help }) => help === 'Checkout setting');
  }

  /** A file holding the custom fields an export of this site holds, and `data` beside them. */
  async function withFields(data: ExportData): Promise<ExportData> {
    await addFields();
    const { members_metafields: fields } = await exportCheckout();
    await removeCheckout();
    return { members_metafields: fields, ...data };
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'checkout-import-e2e-'));
    const { body } = await agent.get('tiers/?limit=all').expectStatus(200);
    const found = body.tiers.find(({ type }) => type === 'paid');
    assert.ok(found);
    paidTier = found;
  });

  afterAll(async function () {
    await fs.remove(directory);
  });

  afterEach(async function () {
    await removeCheckout();
    await knex('actions')
      .whereIn('resource_type', ['stripe_checkout_config', 'member_custom_field'])
      .del();
  });

  it('brings the checkout settings of an exported site back', async function () {
    await addFields();
    await setCheckout({
      design: DESIGN,
      shipping: shipping({ tier_ids: [paidTier.id], allowed_countries: ['GB', 'IE'] }),
      phone,
    });
    const before = await readCheckout();
    const exported = await exportCheckout();
    await removeCheckout();

    const problems = await importData(exported);

    assert.deepEqual(await readCheckout(), before);
    assert.deepEqual(
      before.shipping,
      shipping({
        tier_ids: [paidTier.id],
        allowed_countries: ['GB', 'IE'],
      }),
    );
    assert.deepEqual(problems, []);
  });

  it('asks on the tier the site has under the slug of the file’s tier', async function () {
    const fileTierId = '0123456789abcdef01234567';
    const file = await withFields({
      products: [{ ...paidTier, id: fileTierId }],
      tier_requirements: [{ requirement: 'phone', tier_scope: 'selected_paid', countries: null }],
      tier_requirement_tiers: [{ requirement: 'phone', product_id: fileTierId }],
      members_metafield_bindings: [
        { port: 'checkout.phone', metafield_namespace: 'custom', metafield_key: 'phone' },
      ],
    });

    await importData(file);

    assert.deepEqual((await readCheckout()).phone, { ...phone, tier_ids: [paidTier.id] });
  });

  it('leaves out a part none of whose tiers are on the site', async function () {
    const file = await withFields({
      tier_requirements: [{ requirement: 'phone', tier_scope: 'selected_paid', countries: null }],
      tier_requirement_tiers: [{ requirement: 'phone', product_id: '0123456789abcdef01234567' }],
      members_metafield_bindings: [
        { port: 'checkout.phone', metafield_namespace: 'custom', metafield_key: 'phone' },
      ],
    });

    const problems = await importData(file);

    assert.deepEqual((await readCheckout()).phone, { collect: false });
    assert.deepEqual(
      problems.map(({ message }) => message),
      ['Checkout setting was not imported because none of its tiers were imported.'],
    );
  });

  it('leaves out shipping whose countries cannot be read', async function () {
    const file = await withFields({
      tier_requirements: [{ requirement: 'shipping', tier_scope: 'all_paid', countries: '["GB",' }],
      members_metafield_bindings: [
        {
          port: 'checkout.shipping.address',
          metafield_namespace: 'custom',
          metafield_key: 'delivery_address',
        },
        {
          port: 'checkout.shipping.name',
          metafield_namespace: 'custom',
          metafield_key: 'recipient_name',
        },
      ],
    });

    const problems = await importData(file);

    assert.deepEqual((await readCheckout()).shipping, { collect: false });
    assert.deepEqual(
      problems.map(({ message }) => message),
      ['Checkout setting was not imported because its countries could not be read.'],
    );
  });

  // A part's tiers are taken out of it as they are deleted, and one left with none asks on none.
  it('imports a part limited to no tiers as off', async function () {
    const file = await withFields({
      tier_requirements: [{ requirement: 'phone', tier_scope: 'selected_paid', countries: null }],
      members_metafield_bindings: [
        { port: 'checkout.phone', metafield_namespace: 'custom', metafield_key: 'phone' },
      ],
    });

    const problems = await importData(file);

    assert.deepEqual((await readCheckout()).phone, { collect: false });
    assert.deepEqual(problems, []);
  });

  it('leaves out a part whose field is not on the site and imports the rest', async function () {
    const problems = await importData({
      stripe_checkout_config: [
        { slug: 'default', design: JSON.stringify({ ...DESIGN, customize: undefined }) },
      ],
      tier_requirements: [{ requirement: 'phone', tier_scope: 'all_paid', countries: null }],
      members_metafield_bindings: [
        { port: 'checkout.phone', metafield_namespace: 'custom', metafield_key: 'phone' },
      ],
    });

    const saved = await readCheckout();
    assert.deepEqual(saved.design, DESIGN);
    assert.deepEqual(saved.phone, { collect: false });
    assert.deepEqual(
      problems.map(({ message }) => message),
      ['Checkout setting was not imported: Choose a custom field the site already has.'],
    );
  });

  it('keeps what the site collects that the file’s site did not', async function () {
    await addFields();
    await setCheckout({ phone });

    await importData({
      stripe_checkout_config: [
        { slug: 'default', design: JSON.stringify({ ...DESIGN, customize: undefined }) },
      ],
    });

    const saved = await readCheckout();
    assert.deepEqual(saved.design, DESIGN);
    assert.deepEqual(saved.phone, phone);
  });
});
