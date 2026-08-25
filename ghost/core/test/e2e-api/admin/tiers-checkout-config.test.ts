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

    // Otherwise the same field is asked for twice on one page: once as a question, and
    // once as whatever the source collects on its own.
    it('refuses a field the site does not have', async function () {
      const body = await setCheckout({ custom_fields: [{ key: 'no_such_field' }] }, 422);
      assert.match(body.errors[0].context, /Unknown custom field/);
    });
  });

  describe('What the checkout collects for itself', function () {
    // Collecting and choosing where it lands are one statement, because a publisher
    // makes them as one choice: a checkbox and the field beside it.
    it('collects a port and binds its destination in one write', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping({ allowed_countries: ['GB', 'ie'] }));
      assert.deepEqual((await readCheckout()).shipping, {
        collect: true,
        // Uppercased on the way in, so one country is one value.
        allowed_countries: ['GB', 'IE'],
        // Named nowhere for the recipient, so Ghost made somewhere.
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: 'delivery_address' },
      });
    });

    // Turning collection on is a publisher saying they want the data. Making them build a
    // field for it first turns one checkbox into an errand, so Ghost builds one.
    it('makes somewhere for what it collects when the request names nowhere', async function () {
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

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
      );
    });

    // Provisioning twice is the ordinary case: a publisher turns collection off, then on
    // again. A second "Shipping Address" beside the first would split one thing across two
    // columns of every export.
    it('reuses the field it made rather than making another', async function () {
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });
      await setCheckout({ shipping: { collect: false } });
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

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

    // A key and a name are separately unique, so they run out separately. A publisher's own
    // "Shipping Address" takes both: the name because it is called that, and the key because
    // that is what the name mints to.
    it('works around a name and key a publisher has already used', async function () {
      // A short_text field is not somewhere an address goes, so this one cannot be adopted.
      await createField({ name: 'Shipping Address', type: 'short_text' });

      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      const provisioned = body.members_custom_fields.find(
        (field: { type: string }) => field.type === 'address',
      );
      assert.equal(provisioned.name, 'Shipping Address (2)');
      assert.equal(provisioned.key, 'shipping_address_2');
      assert.equal((await readCheckout()).shipping.address.custom_field_key, provisioned.key);

      // And having had to work around the clash, it does not have to work around it again.
      // The binding records the key it settled on, so turning collection off and on finds
      // that rather than looking past the same obstruction and making a third field.
      await setCheckout({ shipping: { collect: false } });
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      const { body: after } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.deepEqual(
        after.members_custom_fields
          .filter((field: { type: string }) => field.type === 'address')
          .map((field: { key: string }) => field.key),
        ['shipping_address_2'],
      );
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'shipping_address_2');
    });

    // Only the name is taken here: the publisher renamed a field to it, so the key that name
    // would mint to is still free. The field gets the key it wanted under a numbered label.
    it('keeps the key it intended when only the name is taken', async function () {
      const theirs = await createField({ name: 'Delivery address', type: 'address' });
      await agent
        .put(`members/custom_fields/${theirs.key}/`)
        .body({ members_custom_fields: [{ name: 'Shipping Address' }] })
        .expectStatus(200);

      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      const provisioned = body.members_custom_fields.find(
        (field: { key: string }) => field.key === 'shipping_address',
      );
      assert.equal(provisioned.name, 'Shipping Address (2)');
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'shipping_address');
    });

    // The key is the field's identity and the name is not, so renaming what Ghost made
    // cannot cost a publisher a second copy of it. This is the case a name-matched reuse
    // got wrong: the field held everything collected so far, and a new one took the writes.
    it('finds the field it made again after a publisher renames it', async function () {
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });
      await agent
        .put('members/custom_fields/shipping_address/')
        .body({ members_custom_fields: [{ name: 'Delivery address' }] })
        .expectStatus(200);

      await setCheckout({ shipping: { collect: false } });
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

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

    // A field of the right type under the key that names it is that field, whoever made it.
    it('collects into a field the publisher already keeps under that key', async function () {
      const theirs = await createField({ name: 'Shipping Address', type: 'address' });
      assert.equal(theirs.key, 'shipping_address');

      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.equal(
        body.members_custom_fields.filter((field: { type: string }) => field.type === 'address')
          .length,
        1,
        'nothing was made beside it',
      );
      assert.equal((await readCheckout()).shipping.address.custom_field_key, theirs.key);
    });

    // Binding to it would succeed and collect nothing until someone restored it, which a
    // publisher has no way to see. Minting past it would leave two.
    // Turning collection on always succeeds. An archived destination is still where this
    // goes, so the binding is kept and nothing new is made; the archiving does what it does
    // everywhere else, which is stop the collecting until someone restores the field.
    it('keeps its destination when the publisher archives it', async function () {
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });
      await setCheckout({ shipping: { collect: false } });
      await agent
        .put('members/custom_fields/shipping_address/')
        .body({ members_custom_fields: [{ status: 'archived' }] })
        .expectStatus(200);

      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      const { body } = await agent
        .get('members/custom_fields/?filter=status:[active,archived]')
        .expectStatus(200);
      assert.deepEqual(
        body.members_custom_fields
          .filter((field: { type: string }) => field.type === 'address')
          .map((field: { key: string }) => field.key),
        ['shipping_address'],
        'nothing was made beside the one it already had',
      );

      // Bound, but with nowhere active to land, so the checkout asks for nothing.
      const bindings = await models.Base.knex('members_custom_field_bindings')
        .where('port', 'shipping_address')
        .select();
      assert.equal(bindings.length, 1);
      assert.equal((await readCheckout()).shipping.address.custom_field_key, null);
    });

    // A field appearing in a publisher's list without them creating it is exactly the case
    // the history is for, and it is theirs from that point on: the same "added" entry a
    // field they typed gets, attributed to whoever turned the collection on.
    it('records the fields it made in the history', async function () {
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

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

    // The phone number is the port whose key is not its own name: Stripe calls what it
    // returns `phone`, and the publisher's list calls where it lands Shipping Phone. So the
    // two are asserted together, because a declaration that muddled them would bind a
    // checkout to a field nobody could find.
    it('makes a field for the phone number under its own name', async function () {
      await setCheckout({ phone: { collect: true } });

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

    // A publisher stated one thing, so it either happened or it did not. The shipping step
    // has two destinations and settles them in order, so a request can get as far as making
    // a field for the first and then be refused on the second — and the field it made must
    // not outlive the request that failed. Nothing else would ever remove it: it would sit
    // in the publisher's list, made by a change they were told did not happen.
    it('leaves nothing behind when a later part of the same request is refused', async function () {
      // An address cannot be collected into short_text, so naming this one is refused —
      // but only after the recipient's name has already been given a field of its own.
      const theirs = await createField({ name: 'Delivery address', type: 'short_text' });

      await setCheckout(
        {
          shipping: {
            collect: true,
            allowed_countries: ['GB'],
            address: { custom_field_key: theirs.key },
          },
        },
        422,
      );

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

    // A field a publisher already keeps addresses in is the destination they meant.
    it('names its own destination when the request does', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping());

      const { body } = await agent.get('members/custom_fields/').expectStatus(200);
      assert.equal(
        body.members_custom_fields.filter((field: { type: string }) => field.type === 'address')
          .length,
        1,
        'nothing was provisioned for a destination that was named',
      );
    });

    // Turning it on is one decision; where a parcel goes is not something Ghost can guess.
    it('still refuses to collect an address without a country to deliver to', async function () {
      const body = await setCheckout({ shipping: { collect: true } }, 422);
      assert.match(body.errors[0].context, /at least one country/);
    });

    // The destination is site-wide, so it is one answer however many tiers collect it.
    it('reports the destination against the thing collected', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });

    // An address form cannot be rendered without a country list. Stripe's reference
    // calls it optional, but an empty collection object form-encodes to nothing, so a
    // request built that way never asks Stripe to collect anything at all.
    it('refuses to collect an address without countries to collect it in', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      const body = await setCheckout(shipping({ allowed_countries: undefined }), 422);
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

    // Turning collection off takes the countries with it, so turning it back on cannot
    // quietly resume delivering somewhere the publisher has since stopped delivering.
    it('forgets where a publisher delivered once they stop collecting', async function () {
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });
      assert.equal((await readCheckout()).shipping, undefined);

      const body = await setCheckout(
        { shipping: { collect: true, address: { custom_field_key: 'delivery_address' } } },
        422,
      );
      assert.match(body.errors[0].context, /at least one country/);
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

    // Turning collection off leaves the row behind with every flag false, so "has a
    // configuration row" is not the same question as "configured something".
    it('leaves out a tier that turned everything back off', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });

      const { body } = await agent.get('tiers/checkout_config/').expectStatus(200);
      assert.deepEqual(body.tiers_checkout_config, []);
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

    // The state this used to have to survive — a tier that says it collects while nothing
    // says where — is now unreachable, because the binding is what says both.
    it('collects nothing when the binding is deleted out from under a tier', async function () {
      await collectShipping();
      await models.Base.knex('members_custom_field_bindings').del();

      assert.deepEqual(await readCheckout(), { tier_id: tierId, custom_fields: [] });
    });

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
      // kept elsewhere, so its binding is untouched: one destination going does not take
      // the rest of the collection with it.
      const bindings = await models.Base.knex('members_custom_field_bindings')
        .where('port', 'shipping_address')
        .select();
      assert.deepEqual(bindings, []);
      assert.equal((await readCheckout()).shipping.address.custom_field_key, null);
    });

    it('keeps the binding when a definition is archived, and resumes on restore', async function () {
      await collectShipping();
      await setStatus('delivery_address', 'archived');

      // Archiving is reversible, so the binding waits rather than being torn out.
      const [binding] = await models.Base.knex('members_custom_field_bindings')
        .where('port', 'shipping_address')
        .select();
      assert.equal(binding.custom_field_key, 'delivery_address');

      await setStatus('delivery_address', 'active');
      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });
  });

  // A destination belongs to a tier, not to the site: the binding is keyed by tier and
  // port, so each tier names its own and one turning collection off says nothing about
  // any other. What these pin is that the two stay independent in both directions.
  // Asking for a field and collecting into it are two writers aimed at one destination.
  // The checkout would show the widget and the question together, and whichever the
  // webhook writes second wins, so a member's typed answer is replaced by what Stripe
  // returned without anything saying so.
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

  // What a publisher chose is the thing worth remembering. Working a destination out again
  // from anything else can only ever answer "where would Ghost have put this", which is a
  // different question from "where does this tier already put it", and the two differ
  // exactly when the publisher has said something.
  describe('A destination the publisher chose', function () {
    it('is still theirs after turning collection off and on', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      assert.equal(
        (await readCheckout()).shipping.address.custom_field_key,
        'delivery_address',
        'the field they named, not the one Ghost would have made',
      );
    });

    // Another tier settling the same port first must not decide this one's destination for
    // it: each tier keeps what it was told, and only a tier that has never said anything
    // takes the site's existing answer.
    it('is not replaced by an older binding from another tier', async function () {
      const [existing] = await models.Base.knex('products').where('id', tierId);
      const secondId = 'ffffffffffffffffffffffff';
      await models.Base.knex('products').insert({
        ...existing,
        id: secondId,
        name: 'Digital',
        slug: 'digital-second',
      });

      // The other tier goes first, so its binding is the older one.
      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({
          tiers_checkout_config: [{ shipping: { collect: true, allowed_countries: ['GB'] } }],
        })
        .expectStatus(200);

      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });
      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      assert.equal(
        (await readCheckout()).shipping.address.custom_field_key,
        'delivery_address',
        'this tier kept its own destination',
      );
    });
  });

  // A binding now outlives the collection it carries, so it can be left pointing at a field
  // whose life moves on without it. What the database does to it, and what the reads make of
  // what is left, is the whole of that.
  describe('When a destination outlives its collection', function () {
    const bindingsFor = (port: string) =>
      models.Base.knex('members_custom_field_bindings').where('port', port).select();

    it('takes a binding that stopped collecting with the field it pointed at', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });

      // Deleting takes archiving first, which is the API's own rule. The cascade below is
      // the database's, and it does not care that this binding had stopped collecting.
      await setStatus('delivery_address', 'archived');
      await agent.delete('members/custom_fields/delivery_address/').expectStatus(204);

      assert.deepEqual(await bindingsFor('shipping_address'), []);
    });

    // Nothing is left to remember, so this is the one case where turning it on again is
    // allowed to reach for a new field.
    it('makes a new destination once the old one is gone', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setStatus('delivery_address', 'archived');
      await agent.delete('members/custom_fields/delivery_address/').expectStatus(204);

      await setCheckout({ shipping: { collect: true, allowed_countries: ['GB'] } });

      assert.equal(
        (await readCheckout()).shipping.address.custom_field_key,
        'shipping_address',
        'and it is the one Ghost keeps for this port',
      );
    });

    it('keeps a binding that stopped collecting when its field is archived', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());
      await setCheckout({ shipping: { collect: false } });
      await setStatus('delivery_address', 'archived');

      const [binding] = await bindingsFor('shipping_address');
      assert.equal(binding.custom_field_key, 'delivery_address');
      assert.equal(Boolean(binding.active), false);
    });

    // Deleting the tier takes its bindings, so a stopped one cannot outlive the thing that
    // configured it either.
    it('takes a binding that stopped collecting with its tier', async function () {
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
          tiers_checkout_config: [{ shipping: { collect: true, allowed_countries: ['GB'] } }],
        })
        .expectStatus(200);
      await agent
        .put(`tiers/${secondId}/checkout_config/`)
        .body({ tiers_checkout_config: [{ shipping: { collect: false } }] })
        .expectStatus(200);

      await models.Base.knex('products').where('id', secondId).del();

      assert.deepEqual(
        (await bindingsFor('shipping_address')).map(
          (row: { product_id: string }) => row.product_id,
        ),
        [],
      );
    });
  });

  // The sharpest edge of a binding that outlives its collection: a tier turning something on
  // for the first time can inherit a destination that has since been archived, and collect
  // nothing without being told.
  //
  // That is the right answer even so. Archiving a bound field already stops the tier that
  // bound it, silently and by design, so the publisher is in that state before a second tier
  // joins it, and restoring the field fixes both at once. Making this tier a field of its own
  // instead would point two tiers at two different fields for the same thing, which is the
  // split every part of this is arranged to avoid, and it would show up as two address
  // fields the moment they restored the first.
  describe('A destination archived before another tier wants it', function () {
    it('is inherited as it stands, rather than replaced', async function () {
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
        .body({
          tiers_checkout_config: [{ shipping: { collect: true, allowed_countries: ['GB'] } }],
        })
        .expectStatus(200);

      const [binding] = await models.Base.knex('members_custom_field_bindings')
        .where({ product_id: secondId, port: 'shipping_address' })
        .select();
      assert.equal(binding.custom_field_key, 'delivery_address', 'the same field as the first');

      const { body: fields } = await agent
        .get('members/custom_fields/?filter=status:[active,archived]')
        .expectStatus(200);
      assert.deepEqual(
        fields.members_custom_fields
          .filter((field: { type: string }) => field.type === 'address')
          .map((field: { key: string }) => field.key),
        ['delivery_address'],
        'and no second address field was made for it',
      );

      // Reported the way an archived destination is reported everywhere: collecting, with
      // nowhere for the address to land until the publisher restores it.
      const { body } = await agent.get(`tiers/${secondId}/checkout_config/`).expectStatus(200);
      assert.equal(body.tiers_checkout_config[0].shipping.address.custom_field_key, null);

      await setStatus('delivery_address', 'active');
      const { body: restored } = await agent
        .get(`tiers/${secondId}/checkout_config/`)
        .expectStatus(200);
      assert.equal(
        restored.tiers_checkout_config[0].shipping.address.custom_field_key,
        'delivery_address',
        'and restoring it fixes both tiers at once',
      );
    });
  });

  // One checkout must never both ask for a field and collect into it: the page would show
  // the question and the widget together, and the webhook would write whichever it reached
  // last over the other, replacing the member's own answer with nothing to say it had. A
  // publisher who names such a destination is refused and told why. One who names nothing
  // cannot be refused, so they get a field of their own instead.
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

    // The other half of the same rule. The row stays and stops collecting, because it is
    // the only record of where this tier already sends this, and working that out again
    // from anything else is a guess that a rename would get wrong.
    it('remembers the destination once no tier wants it', async function () {
      await createField({ name: 'Delivery address', type: 'address' });
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });

      const bindings = await models.Base.knex('members_custom_field_bindings')
        .where('port', 'shipping_address')
        .select();
      assert.equal(bindings.length, 1, 'the row is still there');
      assert.equal(bindings[0].custom_field_key, 'delivery_address');

      // Off, so the tier reports nothing and the checkout asks for nothing.
      assert.deepEqual(await readCheckout(), { tier_id: tierId, custom_fields: [] });

      // And on again, it is the same field rather than a second one beside it.
      await setCheckout(shipping({ address: undefined }));
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
