import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
// From the catalog, which is where a client reads it too. A browser takes the
// structure-only entry point so it does not carry the validator; this runs in Node,
// where that costs nothing.
const { subFieldsOf } = require('@tryghost/custom-field-types');

// Custom fields are staff-only. Nothing in the members API is written to expose or
// accept them — the member response is built from a field whitelist that predates the
// feature, and the update path drops unknown keys — but nothing asserted it. These pin
// the two endpoints that hand a member their own payload. Other member-facing surfaces
// (newsletter preferences, theme member data, the comments author shape) narrow through
// their own whitelists and are not covered here.
describe('Member Custom Fields Members API', function () {
  let adminAgent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let membersAgent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    loginAs: (_email: string) => Promise<void>;
  };
  let memberId: string;
  let fieldKey: string;
  let fieldCounter = 0;

  async function readValuesAsStaff() {
    const { body } = await adminAgent.get(`members/${memberId}/`).expectStatus(200);
    return body.members[0].metafields?.custom ?? {};
  }

  beforeAll(async function () {
    ({ adminAgent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('newsletters', 'members:newsletters');
    await adminAgent.loginAsOwner();
    await membersAgent.loginAs('member@example.com');

    const member = await models.Member.findOne({ email: 'member@example.com' }, { require: true });
    memberId = member.id;
  });

  beforeEach(async function () {
    fieldCounter += 1;
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: `Shoe size ${fieldCounter}`, type: 'short_text' }] })
      .expectStatus(201);
    fieldKey = body.members_metafields[0].key;

    await adminAgent
      .put(`members/${memberId}/`)
      .body({ members: [{ metafields: { custom: { [fieldKey]: '9' } } }] })
      .expectStatus(200);
  });

  afterEach(async function () {
    // Whether a member payload carries custom fields at all follows from the site defining
    // any, so a definition left behind here changes the shape of member responses in every
    // suite that runs after this one.
    await models.Base.knex('members_custom_field_values').del();
    await models.Base.knex('members_custom_fields').del();
  });

  it('returns the fields a member holds, on their own payload', async function () {
    const { body } = await membersAgent.get('/api/member/').expectStatus(200);

    assert.deepEqual(body.metafields, { custom: { [fieldKey]: '9' } });
  });

  it('returns the definitions a member needs to be shown anything', async function () {
    const { body } = await membersAgent.get('/api/member/metafields/custom/').expectStatus(200);

    const field = body.members_metafields.find((f: { key: string }) => f.key === fieldKey);
    assert.ok(field, 'the field a publisher defined is offered to the member');
    assert.equal(field.namespace, 'custom');
    assert.equal(field.type, 'short_text');
    // No database id: a field is addressed by its namespace and key, and neither is
    // reissued once minted.
    assert.equal(Object.hasOwn(field, 'id'), false);
  });

  it('names a field made of several parts by its type, not by listing them', async function () {
    const { body: created } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: `Address ${fieldCounter}`, type: 'address' }] })
      .expectStatus(201);

    const { body } = await membersAgent.get('/api/member/metafields/custom/').expectStatus(200);
    const field = body.members_metafields.find(
      (f: { key: string }) => f.key === created.members_metafields[0].key,
    );

    // The response says the type and stops there. What an address is made of is
    // declared once in the shared catalog, which both sides validate against, so a
    // client reads it from there rather than being told — and being told would let
    // the two disagree about what a valid value is.
    assert.equal(field.type, 'address');
    assert.deepEqual(subFieldsOf('address'), [
      'line1',
      'line2',
      'city',
      'state',
      'postal_code',
      'country',
    ]);
  });

  it('gives a client everything it needs to write a value back', async function () {
    // The round trip a Portal-style client actually makes: ask what fields exist,
    // then set one using only what that answer told it. Nothing here reaches for
    // knowledge the client was not given.
    const { body: catalogue } = await membersAgent
      .get('/api/member/metafields/custom/')
      .expectStatus(200);

    const field = catalogue.members_metafields.find((f: { key: string }) => f.key === fieldKey);
    const write = { [field.namespace]: { [field.key]: 'Written from the catalogue' } };

    const { body } = await membersAgent
      .put('/api/member/')
      .body({ metafields: write })
      .expectStatus(200);

    assert.equal(body.metafields[field.namespace][field.key], 'Written from the catalogue');
  });

  it('sets each part of a field made of several', async function () {
    const { body: created } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: `Shipping ${fieldCounter}`, type: 'address' }] })
      .expectStatus(201);
    const addressKey = created.members_metafields[0].key;

    const { body: catalogue } = await membersAgent
      .get('/api/member/metafields/custom/')
      .expectStatus(200);
    const field = catalogue.members_metafields.find((f: { key: string }) => f.key === addressKey);

    // A composite is addressed as a whole and its parts are named inside it. The
    // part names come from the shared catalog, which is where a client gets them.
    const value = Object.fromEntries(
      subFieldsOf('address')
        .filter((part: string) => part !== 'country')
        .map((part: string) => [part, `a ${part}`]),
    );

    const { body } = await membersAgent
      .put('/api/member/')
      .body({ metafields: { [field.namespace]: { [field.key]: value } } })
      .expectStatus(200);

    assert.deepEqual(body.metafields[field.namespace][field.key], value);
  });

  it('offers the fields in the order the publisher put them', async function () {
    // A client renders them in the order it is given, so the order is part of the
    // answer rather than something a client sorts for itself.
    const names = [`Zulu ${fieldCounter}`, `Alpha ${fieldCounter}`];
    for (const name of names) {
      await adminAgent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name, type: 'short_text' }] })
        .expectStatus(201);
    }

    const { body } = await membersAgent.get('/api/member/metafields/custom/').expectStatus(200);
    const offered = body.members_metafields.map((f: { name: string }) => f.name);

    // Newest last, which is where the publisher's list puts them — not alphabetical.
    assert.deepEqual(offered.slice(-2), names);
  });

  it('writes a value a member sets on themselves', async function () {
    const { body } = await membersAgent
      .put('/api/member/')
      .body({ metafields: { custom: { [fieldKey]: '12' } } })
      .expectStatus(200);

    assert.deepEqual(body.metafields, { custom: { [fieldKey]: '12' } });
    assert.equal((await readValuesAsStaff())[fieldKey], '12');
  });

  it('changes a name and a field in one request', async function () {
    // The reason this is one endpoint: the account panel is one form with one
    // Save, and a member who fills it in expects one answer.
    const { body } = await membersAgent
      .put('/api/member/')
      .body({ name: 'Renamed', metafields: { custom: { [fieldKey]: '14' } } })
      .expectStatus(200);

    assert.equal(body.name, 'Renamed');
    assert.deepEqual(body.metafields, { custom: { [fieldKey]: '14' } });
  });

  it('records the member as the writer', async function () {
    await membersAgent
      .put('/api/member/')
      .body({ metafields: { custom: { [fieldKey]: '13' } } })
      .expectStatus(200);

    const [row] = await models.Base.knex('members_custom_field_values')
      .where({ member_id: memberId, custom_field_key: fieldKey })
      .select('written_by_type', 'written_by_id');

    // Who wrote a value is a fact about the value, and a member writing their own
    // is the one writer that leaves no action behind.
    assert.equal(row.written_by_type, 'member');
    assert.equal(row.written_by_id, memberId);
  });

  it('clears a value a member empties', async function () {
    await membersAgent
      .put('/api/member/')
      .body({ metafields: { custom: { [fieldKey]: null } } })
      .expectStatus(200);

    assert.equal((await readValuesAsStaff())[fieldKey], undefined);
  });

  it('refuses a field nobody defined, and changes nothing at all', async function () {
    // Unlike an unrecognised key at the top level, which is a client sending more
    // than this endpoint reads, a named field that does not exist is a client
    // believing something false. Nothing is written, including the name alongside
    // it: the values are planned before the member's record is touched.
    await membersAgent
      .put('/api/member/')
      .body({ name: 'Should Not Stick', metafields: { custom: { not_a_field: 'x' } } })
      .expectStatus(422);

    const { body } = await membersAgent.get('/api/member/').expectStatus(200);
    assert.notEqual(body.name, 'Should Not Stick');
    assert.equal((await readValuesAsStaff())[fieldKey], '9', 'the existing value is untouched');
  });

  it('still ignores keys a member may not change', async function () {
    const { body } = await membersAgent
      .put('/api/member/')
      .body({ name: 'Renamed', status: 'comped', labels: [{ name: 'VIP' }] })
      .expectStatus(200);

    // Dropped rather than refused, so the rest of the request still applies.
    assert.equal(body.name, 'Renamed');
    assert.equal(body.status, 'free');
  });

  describe('on a site that has defined no fields', function () {
    // Which is most sites, and the reason none of this is behind the feature flag:
    // defining a field is what the flag gates, and without one there is nothing to
    // show and nothing to write. A publisher who defined fields and later turned
    // the flag off would otherwise leave their members holding data they could see
    // and not correct.
    beforeEach(async function () {
      await models.Base.knex('members_custom_field_values').del();
      await models.Base.knex('members_custom_fields').del();
    });

    it('answers with an empty list rather than a 404', async function () {
      const { body } = await membersAgent.get('/api/member/metafields/custom/').expectStatus(200);

      assert.deepEqual(body.members_metafields, []);
    });

    it('leaves the member payload as it was before the feature existed', async function () {
      const { body } = await membersAgent.get('/api/member/').expectStatus(200);

      // A key added to a response cannot be withdrawn once clients read it, so a
      // site with nothing to say says nothing rather than saying it is empty. The
      // Admin API answers the same way about the same values.
      assert.equal(Object.hasOwn(body, 'metafields'), false);
    });
  });
});
