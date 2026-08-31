import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Tier Checkout Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let tierId: string;

  async function createField(field: { name: string; type?: string }) {
    const { body } = await agent
      .post('members/custom_fields/')
      .body({ members_custom_fields: [{ type: 'short_text', ...field }] })
      .expectStatus(201);
    return body.members_custom_fields[0];
  }

  async function setStatus(key: string, status: 'active' | 'archived') {
    await agent
      .put(`members/custom_fields/${key}/`)
      .body({ members_custom_fields: [{ status }] })
      .expectStatus(200);
  }

  async function setCheckout(config: Record<string, unknown>, status = 200) {
    const { body } = await agent
      .put(`tiers/${tierId}/checkout_config/`)
      .body({ tiers_checkout_config: [config] })
      .expectStatus(status);
    return body;
  }

  async function readCheckout() {
    const { body } = await agent.get(`tiers/${tierId}/checkout_config/`).expectStatus(200);
    return body.tiers_checkout_config[0];
  }

  const shipping = (over: Record<string, unknown> = {}) => ({
    shipping: {
      collect: true,
      allowed_countries: ['GB'],
      name: { custom_field_key: 'shipping_name' },
      address: { custom_field_key: 'delivery_address' },
      ...over,
    },
  });

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();

    const { body } = await agent.get('tiers/?limit=1&filter=type:paid').expectStatus(200);
    tierId = body.tiers[0].id;
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('membersCustomFields');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('products_checkout_fields').del();
    await models.Base.knex('products_checkout_config').del();
    await models.Base.knex('members_custom_field_bindings').del();
    await models.Base.knex('members_custom_fields').del();
    // The history outlives the fields it describes, which is the point of it — but across
    // tests in one file it would leave each one reading the ones before.
    await models.Base.knex('actions').where('resource_type', 'member_custom_field').del();
    await models.Base.knex('products').where('id', 'ffffffffffffffffffffffff').del();
  });

  describe('Questions the checkout asks', function () {
    it('starts with nothing configured', async function () {
      assert.deepEqual(await readCheckout(), { tier_id: tierId, custom_fields: [] });
    });

    it('keeps the questions in the order they were given', async function () {
      const size = await createField({ name: 'T-shirt size' });
      const diet = await createField({ name: 'Dietary requirements' });

      await setCheckout({ custom_fields: [{ key: diet.key }, { key: size.key }] });

      const { custom_fields: questions } = await readCheckout();
      assert.deepEqual(
        questions.map((question: { key: string }) => question.key),
        ['dietary_requirements', 't_shirt_size'],
      );
    });

    // A question is optional unless a publisher chooses otherwise: a required question
    // at the payment step costs conversion.
    it("asks optionally, and under the field's own name, unless told otherwise", async function () {
      const size = await createField({ name: 'T-shirt size' });

      await setCheckout({ custom_fields: [{ key: size.key }] });
      assert.deepEqual(await readCheckout(), {
        tier_id: tierId,
        custom_fields: [{ key: 't_shirt_size', label: null, optional: true }],
      });

      await setCheckout({
        custom_fields: [{ key: size.key, label: 'Which size?', optional: false }],
      });
      assert.deepEqual((await readCheckout()).custom_fields, [
        { key: 't_shirt_size', label: 'Which size?', optional: false },
      ]);
    });

    it('states the whole list, so a question left out is no longer asked', async function () {
      const size = await createField({ name: 'T-shirt size' });
      const diet = await createField({ name: 'Dietary requirements' });
      await setCheckout({ custom_fields: [{ key: size.key }, { key: diet.key }] });

      await setCheckout({ custom_fields: [{ key: diet.key }] });
      assert.deepEqual(
        (await readCheckout()).custom_fields.map((question: { key: string }) => question.key),
        ['dietary_requirements'],
      );
    });

    it('refuses more questions than the processor will render', async function () {
      const keys = [];
      for (const name of ['One', 'Two', 'Three', 'Four']) {
        keys.push((await createField({ name })).key);
      }

      const body = await setCheckout({ custom_fields: keys.map((key) => ({ key })) }, 422);
      assert.match(body.errors[0].context, /at most 3 questions/);
    });

    // A publisher can name a field something no processor will render as a label, so
    // the label exists to be shorter than the name.
    it('refuses a question the processor could not label', async function () {
      const long = await createField({ name: `Tell us ${'x'.repeat(60)}` });

      const body = await setCheckout({ custom_fields: [{ key: long.key }] }, 422);
      assert.match(body.errors[0].context, /at most 50 characters/);

      await setCheckout({ custom_fields: [{ key: long.key, label: 'Tell us more' }] });
      assert.equal((await readCheckout()).custom_fields[0].label, 'Tell us more');
    });

    it('refuses a field type the processor cannot ask for', async function () {
      // Named so its key is not one of the things this checkout collects for itself,
      // which is refused earlier and for a different reason.
      const address = await createField({ name: 'Postal address', type: 'address' });

      const body = await setCheckout({ custom_fields: [{ key: address.key }] }, 422);
      assert.match(body.errors[0].context, /cannot be asked for at checkout/);
    });

    it('refuses the same field twice', async function () {
      const size = await createField({ name: 'T-shirt size' });

      const body = await setCheckout(
        { custom_fields: [{ key: size.key }, { key: size.key }] },
        422,
      );
      assert.match(body.errors[0].context, /already asks/);
    });

    it('refuses a field the site does not have', async function () {
      const body = await setCheckout({ custom_fields: [{ key: 'no_such_field' }] }, 422);
      assert.match(body.errors[0].context, /Unknown custom field/);
    });

    // A question's port is the field's own key, so a field keyed like something this
    // checkout already collects would want a port that is taken. Refused in its own
    // words, rather than left to the unique index to report unreadably.
    it('refuses a field keyed like something the checkout collects itself', async function () {
      const phone = await createField({ name: 'Phone' });
      assert.equal(phone.key, 'phone', 'the name mints the key the phone port uses');

      const body = await setCheckout({ custom_fields: [{ key: phone.key }] }, 422);
      assert.match(body.errors[0].context, /cannot be asked at checkout/);
    });
  });

  describe('What the checkout collects for itself', function () {
    // A country Stripe will not ship to fails the whole session create, so a publisher who
    // saved one would find every checkout for that tier broken and nothing to tell them
    // why. Refused at the point they choose it instead.
    it('refuses a country the processor will not ship to', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      // The usual slip for GB: two letters, looks like a country, and Stripe rejects it.
      const body = await setCheckout(shipping({ allowed_countries: ['UK'] }), 422);
      assert.match(body.errors[0].context, /will not ship to that country/);

      // Sanctioned, so a general list of countries has it and Stripe does not.
      const sanctioned = await setCheckout(shipping({ allowed_countries: ['KP'] }), 422);
      assert.match(sanctioned.errors[0].context, /will not ship to that country/);
    });

    // Collecting and choosing where it lands are one statement, because a publisher
    // makes them as one choice: a checkbox and the field beside it.
    it('collects a port and binds its destination in one write', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping({ allowed_countries: ['GB', 'ie'] }));
      assert.deepEqual((await readCheckout()).shipping, {
        collect: true,
        // Uppercased on the way in, so one country is one value.
        allowed_countries: ['GB', 'IE'],
        // Nothing kept the recipient's name yet, so a field was made under that key.
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: 'delivery_address' },
      });
    });

    // Turning collection on is a publisher saying they want the data. Making them build a
    // field for it first turns one checkbox into an errand, so naming a key the site does
    // not keep yet makes it.
    it('makes a field for a key the site does not keep yet', async function () {
      await setCheckout({
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      });

      assert.deepEqual((await readCheckout()).shipping, {
        collect: true,
        allowed_countries: ['GB'],
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: 'shipping_address' },
      });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { name: string; type: string }) => [
          field.name,
          field.type,
        ]),
        [
          ['Shipping Name', 'short_text'],
          ['Shipping Address', 'address'],
        ],
        'and it is listed under the name the port supplies',
      );
    });

    // Turning collection off and on again is the ordinary case. A second "Shipping Address"
    // beside the first would split one thing across two columns of every export.
    it('binds the field it made rather than making another', async function () {
      const collect = {
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      };
      await setCheckout(collect);
      await setCheckout({ shipping: { collect: false } });
      await setCheckout(collect);

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { key: string }) => field.key),
        ['shipping_name', 'shipping_address'],
      );
      assert.equal(
        (await readCheckout()).shipping.address.custom_field_key,
        'shipping_address',
        'and bound to it again',
      );
    });

    // Names are unique across the whole list, so the label a made field would be listed
    // under can be taken by something else. Numbering past it would leave a publisher with
    // two things called nearly the same, neither of them obviously the one collected into.
    it('refuses to make a field whose label is already taken', async function () {
      await createField({ name: 'Shipping Address', type: 'short_text' });

      await setCheckout(shipping(), 422);

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { key: string }) => field.key),
        ['shipping_address'],
        'and nothing was made under a numbered label instead',
      );
    });

    // The key is the field's identity and the name is not, so renaming what Ghost made
    // does not cost a publisher a second copy of it: the request names the same key and
    // finds the same field.
    it('binds the same field after a publisher renames it', async function () {
      const collect = {
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      };
      await setCheckout(collect);
      await agent
        .put('members/custom_fields/shipping_address/')
        .body({ members_custom_fields: [{ name: 'Delivery address' }] })
        .expectStatus(200);

      await setCheckout({ shipping: { collect: false } });
      await setCheckout(collect);

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields
          .filter((field: { type: string }) => field.type === 'address')
          .map((field: { key: string; name: string }) => [field.key, field.name]),
        [['shipping_address', 'Delivery address']],
        'the renamed field is still the one, and there is only one',
      );
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'shipping_address');
    });

    // A field of the right type under the key that was named is that field, whoever made it.
    it('collects into a field the publisher already keeps under that key', async function () {
      const theirs = await createField({ name: 'Shipping Address', type: 'address' });
      assert.equal(theirs.key, 'shipping_address');

      await setCheckout(shipping({ address: { custom_field_key: theirs.key } }));

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.equal(
        body.members_custom_fields.filter((field: { type: string }) => field.type === 'address')
          .length,
        1,
        'nothing was made beside it',
      );
      assert.equal((await readCheckout()).shipping.address.custom_field_key, theirs.key);
    });

    // Binding to it would succeed and collect nothing until someone restored it, which the
    // publisher who asked for the collection has no way to see. Restoring the field is one
    // step; working out why a checkout stopped asking is not.
    it('refuses a destination the publisher has archived', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setStatus('delivery_address', 'archived');

      const body = await setCheckout(shipping(), 422);
      assert.match(body.errors[0].context, /archived/);

      assert.deepEqual(
        await models.Base.knex('members_custom_field_bindings').select(),
        [],
        'and nothing was bound',
      );
    });

    // A field appearing in a publisher's list without them creating it is exactly the case
    // the history is for, and it is theirs from that point on: the same "added" entry a
    // field they typed gets, attributed to whoever turned the collection on.
    it('records the fields it made in the history', async function () {
      await setCheckout({
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      });

      const { body } = await agent
        .get('actions/?filter=resource_type:member_custom_field&limit=all')
        .expectStatus(200);
      // The name rides in the action's context; resource_id holds the row id. Sorted
      // because both were written in the same statement, so their order is not meaningful.
      const provisioned = body.actions
        .map((action: { event: string; actor_type: string; context: unknown }) => ({
          event: action.event,
          actorType: action.actor_type,
          ...(typeof action.context === 'string' ? JSON.parse(action.context) : action.context),
        }))
        .sort((a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key));

      assert.deepEqual(
        provisioned.map((action: { event: string; primary_name: string; actorType: string }) => [
          action.event,
          action.primary_name,
          action.actorType,
        ]),
        [
          ['added', 'Shipping Address', 'user'],
          ['added', 'Shipping Name', 'user'],
        ],
      );
    });

    // The phone number is the port whose name is not the publisher's word for it: Stripe
    // calls what it returns `phone`, and a field made for it is listed as Shipping Phone.
    // So the two are asserted together, because a declaration that muddled them would list
    // a publisher's field under the processor's own vocabulary.
    it('makes a field for the phone number under its own name', async function () {
      await setCheckout({ phone: { collect: true, custom_field_key: 'shipping_phone' } });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { key: string; name: string; type: string }) => [
          field.key,
          field.name,
          field.type,
        ]),
        [['shipping_phone', 'Shipping Phone', 'short_text']],
      );
      assert.equal((await readCheckout()).phone.custom_field_key, 'shipping_phone');
    });

    // A publisher stated one thing, so it either happened or it did not. Every custom field
    // a request names is now checked before anything at all is written, so a request that
    // will be refused never gets as far as creating one. This test holds that line: were
    // the checking ever to move back inside the writing, a refused request could leave a
    // field behind that nobody asked for, sitting in the publisher's list, made by a change
    // they were told did not happen.
    it('leaves nothing behind when a later part of the same request is refused', async function () {
      // An address cannot be collected into short_text, so naming this one is refused —
      // but only after the recipient's name has already been given a field of its own.
      const theirs = await createField({ name: 'Delivery address', type: 'short_text' });

      await setCheckout(shipping({ address: { custom_field_key: theirs.key } }), 422);

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { key: string }) => field.key),
        [theirs.key],
        'the field made for the recipient went back with the request',
      );
      assert.deepEqual(
        await models.Base.knex('members_custom_field_bindings').select(),
        [],
        'and so did the binding made before it',
      );
    });

    it('makes nothing when both destinations already exist', async function () {
      await createField({ name: 'Recipient', type: 'short_text' });
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping({ name: { custom_field_key: 'recipient' } }));

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { key: string }) => field.key),
        ['recipient', 'delivery_address'],
      );
    });

    // Turning it on is one decision; where the address lands is not something Ghost can
    // guess. Where the parcel goes it can: no countries means everywhere.
    it('still refuses to collect an address without saying where it lands', async function () {
      const body = await setCheckout({ shipping: { collect: true } }, 422);
      assert.match(body.errors[0].context, /which custom field this is collected into/);
    });

    // Ghost keeps no convention about where a collected value belongs, so a request that
    // collects without saying where is missing half the decision rather than deferring it.
    it('refuses to collect without saying where the value lands', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      const body = await setCheckout(shipping({ name: undefined }), 422);
      assert.match(body.errors[0].context, /which custom field this is collected into/);

      await setCheckout(shipping({ address: { custom_field_key: '' } }), 422);
      await setCheckout({ phone: { collect: true } }, 422);

      assert.deepEqual(await models.Base.knex('members_custom_field_bindings').select(), []);
    });

    // The destination is site-wide, so it is one answer however many tiers collect it.
    it('reports the destination against the thing collected', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });

    // Countries are a restriction, so naming none is not an incomplete request — it is a
    // publisher who delivers everywhere. Stored as the absence of a list rather than a
    // copy of every country, because that set moves: an enumeration saved today silently
    // becomes a restriction the day the processor adds one.
    it('delivers everywhere when the request names no countries', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping({ allowed_countries: undefined }));

      const config = await readCheckout();
      assert.equal(config.shipping.collect, true);
      assert.equal(
        'allowed_countries' in config.shipping,
        false,
        'everywhere reads back as no list, the same way it was written',
      );
    });

    // Naming none and naming an empty list are different statements. A publisher who
    // cleared the list said something, and it was not "deliver worldwide".
    it('refuses an empty list of countries', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      const body = await setCheckout(shipping({ allowed_countries: [] }), 422);
      assert.match(body.errors[0].context, /at least one country/);
    });

    it('refuses a country code that is not one', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      const body = await setCheckout(shipping({ allowed_countries: ['IRL'] }), 422);
      assert.match(body.errors[0].context, /2-letter country code/);
    });

    it('refuses a destination whose type is not what the port supplies', async function () {
      await createField({ name: 'Delivery notes', type: 'short_text' });

      const body = await setCheckout(
        shipping({ address: { custom_field_key: 'delivery_notes' } }),
        422,
      );
      assert.match(body.errors[0].context, /address field/);
    });

    // A key is stated rather than derived from a name now, so nothing has put it into
    // the shape Ghost's own keys take, and a request that gets it wrong is refused
    // rather than written into the column as given.
    it('makes one field when two ports name the same key that does not exist yet', async function () {
      await setCheckout({
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'contact' },
          address: { custom_field_key: 'delivery' },
        },
        phone: { collect: true, custom_field_key: 'contact' },
      });

      const { body } = await agent
        .get('members/custom_fields/?filter=status:[active,archived]')
        .expectStatus(200);
      const named = body.members_custom_fields.filter(
        (field: { key: string }) => field.key === 'contact',
      );
      assert.equal(named.length, 1, 'the key both ports named was made once');

      const { body: read } = await agent.get(`tiers/${tierId}/checkout_config/`).expectStatus(200);
      const [config] = read.tiers_checkout_config;
      assert.equal(config.shipping.name.custom_field_key, 'contact');
      assert.equal(config.phone.custom_field_key, 'contact');
    });

    it('refuses a key of a shape nothing could be keyed', async function () {
      const body = await setCheckout(
        { phone: { collect: true, custom_field_key: 'Shipping Phone' } },
        422,
      );
      assert.match(body.errors[0].context, /lowercase letters, numbers and underscores/);

      assert.deepEqual(await models.Base.knex('members_custom_fields').select(), []);
    });

    // A key is a property name on the plain object a member's values travel as, so one
    // naming something every object already has reads back as inherited rather than
    // absent. Both of these are well-formed keys, which is exactly why the format check
    // is not enough on its own.
    it('refuses a key that names something every object already has', async function () {
      for (const key of ['constructor', '__proto__']) {
        const body = await setCheckout({ phone: { collect: true, custom_field_key: key } }, 422);
        assert.match(body.errors[0].context, /cannot be used as a custom field key/);
      }

      assert.deepEqual(await models.Base.knex('members_custom_fields').select(), []);
    });

    // Minting holds back room for a numbering suffix; a stated key is written as given,
    // so what it has to fit in is the whole column and nothing less.
    it('refuses a key longer than the column that holds it', async function () {
      const body = await setCheckout(
        { phone: { collect: true, custom_field_key: 'a'.repeat(192) } },
        422,
      );
      assert.match(body.errors[0].context, /at most 191 characters/);

      assert.deepEqual(await models.Base.knex('members_custom_fields').select(), []);
    });

    // Which kinds of thing exist is the request schema's to state, so naming one that
    // does not is a malformed body rather than a lookup that came back empty.
    it('refuses a kind of thing nothing can collect', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(
        { inside_leg: { collect: true, custom_field_key: 'delivery_address' } },
        422,
      );
    });
  });

  describe('Naming one list and not the other', function () {
    // A client that knows about the questions must not erase the collection by staying
    // silent about it.
    it('leaves a list the request does not name alone', async function () {
      const size = await createField({ name: 'T-shirt size' });
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout({ custom_fields: [{ key: size.key }] });
      await setCheckout(shipping());

      const config = await readCheckout();
      assert.deepEqual(
        config.custom_fields.map((question: { key: string }) => question.key),
        ['t_shirt_size'],
      );
      assert.deepEqual(config.shipping, {
        collect: true,
        allowed_countries: ['GB'],
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: 'delivery_address' },
      });
    });

    // Every collectable thing shares one row, so leaving one alone is a property of
    // the write rather than of the storage.
    it('leaves a collectable thing the request does not name alone', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping());
      await setCheckout({ tax_number: { collect: true } });

      const config = await readCheckout();
      assert.equal(config.shipping.collect, true);
      assert.deepEqual(config.shipping.allowed_countries, ['GB']);
      assert.equal(config.tax_number.collect, true);
    });

    // A tax number is collected and not kept, so it is stated as an option beside the
    // countries rather than as a binding, and nothing is made to put it in.
    it('collects a tax number without keeping it anywhere', async function () {
      await setCheckout({ tax_number: { collect: true } });

      assert.deepEqual((await readCheckout()).tax_number, { collect: true });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(body.members_custom_fields, [], 'no field was made for it');

      assert.deepEqual(
        await models.Base.knex('members_custom_field_bindings').select(),
        [],
        'and nothing was bound',
      );
    });

    it('names nowhere to keep a tax number', async function () {
      await setCheckout({ tax_number: { collect: true, custom_field_key: 'anything' } }, 422);
    });

    // Turning collection back on is a fresh statement of where a publisher delivers, not a
    // resumption of the last one. Resuming without countries is therefore everywhere, and
    // must not quietly inherit the list from before — a tier that once delivered only to
    // GB would otherwise keep refusing everyone else, with nothing in the request saying so.
    it('stops collecting, and does not inherit the old countries when it resumes', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });
      assert.equal((await readCheckout()).shipping, undefined);

      await setCheckout(shipping({ allowed_countries: undefined }));

      const config = await readCheckout();
      assert.equal(config.shipping.collect, true);
      assert.equal(
        'allowed_countries' in config.shipping,
        false,
        'the GB it delivered to before came back with it',
      );
    });
  });

  describe('When a field stops being usable', function () {
    // Refused at write, tolerated at read. Archiving is reversible, so the question
    // waits for the field to come back rather than being torn out.
    it('keeps a question whose field was archived', async function () {
      const size = await createField({ name: 'T-shirt size' });
      await setCheckout({ custom_fields: [{ key: size.key }] });

      await setStatus(size.key, 'archived');
      assert.deepEqual(
        (await readCheckout()).custom_fields.map((question: { key: string }) => question.key),
        ['t_shirt_size'],
      );

      await setStatus(size.key, 'active');
      assert.deepEqual(
        (await readCheckout()).custom_fields.map((question: { key: string }) => question.key),
        ['t_shirt_size'],
      );
    });

    // Deleting is irreversible and already gated behind archiving, so the question goes
    // with the field rather than pointing at nothing.
    it('drops a question whose field was permanently deleted', async function () {
      const size = await createField({ name: 'T-shirt size' });
      await setCheckout({ custom_fields: [{ key: size.key }] });

      await setStatus(size.key, 'archived');
      await agent.delete(`members/custom_fields/${size.key}/`).expectStatus(204);

      assert.deepEqual((await readCheckout()).custom_fields, []);
    });
  });

  describe('Browsing every tier', function () {
    it('returns the tiers that ask for something, so a list needs one request', async function () {
      const size = await createField({ name: 'T-shirt size' });
      await setCheckout({ custom_fields: [{ key: size.key }] });

      const { body } = await agent.get('tiers/checkout_config/').expectStatus(200);
      assert.deepEqual(body.tiers_checkout_config, [
        {
          tier_id: tierId,
          custom_fields: [{ key: 't_shirt_size', label: null, optional: true }],
        },
      ]);
    });

    it('still lists a tier that turned everything back off, collecting nothing', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });

      const { body } = await agent.get('tiers/checkout_config/').expectStatus(200);
      assert.deepEqual(body.tiers_checkout_config, [{ tier_id: tierId, custom_fields: [] }]);
    });
  });

  // The litmus test for the data model: if someone administers this with plain SQL, what
  // states can they reach, and does anything break when they do. Each of these reaches a
  // state the API refuses to create, and asserts the system stays sane in it.
  describe('When the database is edited by hand', function () {
    async function collectShipping() {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
    }

    // The options row is the other half that could disagree. It holds no opinion about
    // whether anything is collected, so one left behind changes nothing.
    it('collects nothing when only the options row is left', async function () {
      await collectShipping();
      await models.Base.knex('members_custom_field_bindings').del();

      const [options] = await models.Base.knex('products_checkout_config').select();
      assert.ok(options, 'the options row outlived the collection');
      assert.deepEqual(await readCheckout(), { tier_id: tierId, custom_fields: [] });
    });

    it('takes the binding with the field when a definition is deleted', async function () {
      await collectShipping();
      // Deleting takes archiving first, which is the API's own rule; the cascade below
      // is the database's, and it is what a hand-written DELETE would hit too.
      await setStatus('delivery_address', 'archived');
      await agent.delete('members/custom_fields/delivery_address/').expectStatus(204);

      // Cascade, so no binding can name a field that is gone. The recipient's name is
      // kept elsewhere, so its binding survives — but a recipient with nowhere to send
      // the parcel is not a delivery, so the tier reports collecting nothing.
      assert.deepEqual(
        (await models.Base.knex('members_custom_field_bindings').select()).map(
          (row: { port: string }) => row.port,
        ),
        ['shipping_name'],
      );
      assert.equal((await readCheckout()).shipping, undefined);
    });

    it('keeps the binding when a definition is archived, and resumes on restore', async function () {
      await collectShipping();
      await setStatus('delivery_address', 'archived');

      // Archiving is reversible, so the binding waits rather than being torn out, and
      // the tier goes on reporting where the value goes.
      const [binding] = await models.Base.knex('members_custom_field_bindings')
        .where('port', 'shipping_address')
        .select();
      assert.equal(binding.custom_field_key, 'delivery_address');
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');

      await setStatus('delivery_address', 'active');
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });
  });

  // Asking for a field and collecting into it are two writers aimed at one destination:
  // the checkout shows the question and the widget together, and whichever the webhook
  // writes second is what the field holds. Allowed rather than refused, because a
  // destination is not exclusive — another tier can already be writing into the same
  // field — so refusing it here would only forbid the one arrangement Ghost can see.
  describe('One field, asked for and collected into', function () {
    it('accepts both, in one statement or in two', async function () {
      const field = await createField({ name: 'Contact' });

      await setCheckout({
        custom_fields: [{ key: field.key }],
        phone: { collect: true, custom_field_key: field.key },
      });

      const config = await readCheckout();
      assert.deepEqual(
        config.custom_fields.map((question: { key: string }) => question.key),
        [field.key],
      );
      assert.equal(config.phone.custom_field_key, field.key);
    });
  });

  // A destination is stated, not remembered. The request says where every value it
  // collects lands, so the same statement made twice reaches the same field and two tiers
  // making different statements keep them apart.
  describe('A destination the publisher chose', function () {
    it('is still theirs after turning collection off and on', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });
      await setCheckout(shipping());

      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });

    // Another tier binding the same port first says nothing about this one: each states
    // its own destination, and neither is worked out from what the other settled on.
    it('is not decided by another tier that bound the port first', async function () {
      const [existing] = await models.Base.knex('products').where('id', tierId);
      const secondId = 'ffffffffffffffffffffffff';
      await models.Base.knex('products').insert({
        ...existing,
        id: secondId,
        name: 'Digital',
        slug: 'digital-second',
      });

      await createField({ name: 'Delivery address', type: 'address' });
      await createField({ name: 'Digital address', type: 'address' });

      // The other tier goes first, so its binding is the older one.
      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({
          tiers_checkout_config: [shipping({ address: { custom_field_key: 'digital_address' } })],
        })
        .expectStatus(200);

      await setCheckout(shipping());

      assert.equal(
        (await readCheckout()).shipping.address.custom_field_key,
        'delivery_address',
        'this tier kept its own destination',
      );
      const { body } = await agent.get(`tiers/${secondId}/checkout_config/`).expectStatus(200);
      assert.equal(
        body.tiers_checkout_config[0].shipping.address.custom_field_key,
        'digital_address',
        'and the other kept its own',
      );
    });
  });

  // A binding is the collecting: there is one and the tier collects, or there is none and
  // it does not. What the database does to a row nobody is looking at is the whole of the
  // rest of it.
  describe('When collection stops', function () {
    const bindingsFor = (port: string) =>
      models.Base.knex('members_custom_field_bindings').where('port', port).select();

    it('forgets the binding rather than keeping it switched off', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });

      assert.deepEqual(await models.Base.knex('members_custom_field_bindings').select(), []);
      assert.deepEqual(await readCheckout(), { tier_id: tierId, custom_fields: [] });
    });

    // Nothing is left pointing at it, so the same request that made it once makes it again.
    it('makes the field again once it has been deleted', async function () {
      await setCheckout({
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      });
      await setCheckout({ shipping: { collect: false } });
      await setStatus('shipping_address', 'archived');
      await agent.delete('members/custom_fields/shipping_address/').expectStatus(204);

      await setCheckout({
        shipping: {
          collect: true,
          allowed_countries: ['GB'],
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      });

      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'shipping_address');
    });

    // Deleting the tier takes its bindings, so nothing it configured outlives it.
    it('takes a binding with its tier', async function () {
      const [existing] = await models.Base.knex('products').where('id', tierId);
      const secondId = 'ffffffffffffffffffffffff';
      await models.Base.knex('products').insert({
        ...existing,
        id: secondId,
        name: 'Digital',
        slug: 'digital-second',
      });

      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({
          tiers_checkout_config: [
            {
              shipping: {
                collect: true,
                allowed_countries: ['GB'],
                name: { custom_field_key: 'shipping_name' },
                address: { custom_field_key: 'shipping_address' },
              },
            },
          ],
        })
        .expectStatus(200);

      await models.Base.knex('products').where('id', secondId).del();

      assert.deepEqual(await bindingsFor('shipping_address'), []);
    });
  });

  // Archiving a bound field stops the tier that bound it, silently and by design. A second
  // tier asking to collect into the same field is a publisher walking into that state
  // rather than out of it, so it is refused where the first tier's collection is left
  // alone: one of them chose this before the archiving, and the other is choosing it after.
  describe('A destination archived before another tier wants it', function () {
    it('is refused, rather than bound to collect nothing', async function () {
      const [existing] = await models.Base.knex('products').where('id', tierId);
      const secondId = 'ffffffffffffffffffffffff';
      await models.Base.knex('products').insert({
        ...existing,
        id: secondId,
        name: 'Digital',
        slug: 'digital-second',
      });

      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setStatus('delivery_address', 'archived');

      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({ tiers_checkout_config: [shipping()] })
        .expectStatus(422);

      assert.deepEqual(
        await models.Base.knex('members_custom_field_bindings')
          .where('product_id', secondId)
          .select(),
        [],
      );

      // The tier that bound it first is untouched: it still reports where the address
      // goes, and restoring the field is what starts it collecting again.
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');

      await setStatus('delivery_address', 'active');
      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({ tiers_checkout_config: [shipping()] })
        .expectStatus(200);

      const { body: fields } = await agent
        .get('members/custom_fields/?filter=status:[active,archived]')
        .expectStatus(200);
      assert.deepEqual(
        fields.members_custom_fields
          .filter((field: { type: string }) => field.type === 'address')
          .map((field: { key: string }) => field.key),
        ['delivery_address'],
        'and no second address field was made along the way',
      );
    });
  });

  // A destination belongs to a tier, not to the site: the binding is keyed by tier and
  // port, so each tier names its own and one turning collection off says nothing about
  // any other. What these pin is that the two stay independent in both directions.
  describe('Two tiers, one destination', function () {
    it('leaves another tier collecting when this one stops', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      // Copied from the tier the suite already has, because what is being tested is
      // what happens between two of them rather than how one is made.
      const [existing] = await models.Base.knex('products').where('id', tierId);
      const secondId = 'ffffffffffffffffffffffff';
      await models.Base.knex('products').insert({
        ...existing,
        id: secondId,
        name: 'Digital',
        slug: 'digital-second',
      });

      await setCheckout(shipping());

      // The digital tier does not ship anything, so a publisher turns it off there.
      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({ tiers_checkout_config: [{ shipping: { collect: false } }] })
        .expectStatus(200);

      // The print tier never changed, so it must still be collecting into its field.
      const config = await readCheckout();
      assert.equal(config.shipping.collect, true);
      assert.equal(config.shipping.address.custom_field_key, 'delivery_address');
    });

    // The other half of the same rule. The field outlives every binding into it, because
    // it holds everything collected so far, and stating it again reaches the same one.
    it('keeps the field once no tier collects into it', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });

      // Off, so the tier reports nothing and the checkout asks for nothing.
      assert.deepEqual(await models.Base.knex('members_custom_field_bindings').select(), []);
      assert.deepEqual(await readCheckout(), { tier_id: tierId, custom_fields: [] });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields.map((field: { key: string }) => field.key),
        ['delivery_address', 'shipping_name'],
        'the fields it collected into are still there',
      );

      // And on again, it is the same field rather than a second one beside it.
      await setCheckout(shipping());
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });
  });

  // A tier that asks for nothing and a tier that does not exist read the same off the
  // join, and answering an empty configuration for the second would tell a client the
  // tier is there.
  describe('A tier that does not exist', function () {
    it('404s rather than reading as unconfigured', async function () {
      await agent.get('tiers/6a8dbb6a2668becb3f92f000/checkout_config/').expectStatus(404);
    });

    // Every table a write touches references the tier, so the tier is checked before any
    // of them is written. Otherwise the write reaches a foreign key and answers with a
    // database error, where reading the same tier answers 404.
    it('404s a write, rather than failing against a foreign key', async function () {
      await agent
        .put('tiers/6a8dbb6a2668becb3f92f000/checkout_config/')
        .body({ tiers_checkout_config: [{ tax_number: { collect: true } }] })
        .expectStatus(404);
    });
  });

  describe('Flag', function () {
    // Reading is open, because a tier that collects nothing reads the same either way and
    // the checkout has to build its session whatever the flag says. Configuring is not.
    it('still reads with the flag off', async function () {
      mockManager.mockLabsDisabled('membersCustomFields');
      const { body } = await agent.get(`tiers/${tierId}/checkout_config/`).expectStatus(200);
      assert.deepEqual(body.tiers_checkout_config[0].custom_fields, []);
    });

    it('cannot be configured with the flag off', async function () {
      mockManager.mockLabsDisabled('membersCustomFields');
      await agent
        .put(`tiers/${tierId}/checkout_config/`)
        .body({ tiers_checkout_config: [{ custom_fields: [] }] })
        .expectStatus(404);
    });

    // The tier resource is generally available, so this concept must not appear on it.
    it('adds nothing to the tier itself', async function () {
      const { body } = await agent.get(`tiers/${tierId}/`).expectStatus(200);
      assert.equal(body.tiers[0].checkout, undefined);
    });
  });
});
