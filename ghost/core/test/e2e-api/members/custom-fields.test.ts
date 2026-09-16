import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');

const MEMBER_EMAIL = 'member@example.com';
const SHOE_SIZE = 'Shoe size';

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
  delete: (_url: string) => any;
}

interface MembersAgent extends Agent {
  loginAs: (_email: string) => Promise<void>;
  duplicate: () => MembersAgent;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
}

// The extra fields a publisher defines about their members used to be staff-only. A
// member can now read and change their own, through the two endpoints that hand them
// their own payload, which is what these cover. Other member-facing surfaces
// (newsletter preferences, theme member data, the comments author shape) build their
// responses from their own field lists and still do not carry these.
//
// Everything here is set up and checked through an API: the publisher's side through
// the Admin API, the member's through the members API. Nothing reads or writes a
// table, so none of this is pinned to how the fields happen to be stored.
describe('Member Custom Fields Members API', function () {
  let adminAgent: AdminAgent;
  let membersAgent: MembersAgent;
  let memberId: string;
  let fieldKey: string;

  /** Every field this suite defined, so cleanup can undo its own work and no more. */
  const defined = new Set<string>();

  // Opens the field to members unless told otherwise. The API creates fields closed,
  // so the tests that want a closed one ask for it explicitly.
  async function defineField(
    name: string,
    { type = 'short_text', access = 'write' }: { type?: string; access?: string } = {},
  ): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type, access: { member: access } }] })
      .expectStatus(201);
    const { key } = body.members_metafields[0];
    defined.add(key);
    return key;
  }

  async function setAccess(key: string, access: string): Promise<void> {
    await adminAgent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [{ access: { member: access } }] })
      .expectStatus(200);
  }

  async function archiveField(key: string): Promise<void> {
    await adminAgent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
  }

  /**
   * Undo the definitions this suite made, through the API that made them.
   *
   * Whether a member payload carries these fields at all follows from the site
   * defining any, so a definition left behind changes the shape of member
   * responses for every test that runs after it.
   *
   * Only the ones defined here. Test files share a worker, and so a database, so
   * removing every field a site has would take another suite's fixtures with it.
   */
  async function removeFieldsDefinedHere(): Promise<void> {
    const { body } = await adminAgent
      .get('members/metafields/custom/?filter=status:[active,archived]')
      .expectStatus(200);

    const mine = body.members_metafields.filter((field: { key: string }) => defined.has(field.key));

    for (const field of mine) {
      // Only an archived field can be deleted, and deleting one takes the answers
      // members gave for it along with it.
      if (field.status !== 'archived') {
        await archiveField(field.key);
      }
      await adminAgent.delete(`members/metafields/custom/${field.key}/`).expectStatus(204);
      defined.delete(field.key);
    }
  }

  /** What the member looks like to staff, which is the second opinion on every write. */
  async function readMemberAsStaff() {
    const { body } = await adminAgent.get(`members/${memberId}/`).expectStatus(200);
    return body.members[0];
  }

  async function setValuesAsStaff(values: Record<string, unknown>): Promise<void> {
    await adminAgent
      .put(`members/${memberId}/`)
      .body({ members: [{ metafields: { custom: values } }] })
      .expectStatus(200);
  }

  beforeAll(async function () {
    ({ adminAgent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('newsletters', 'members:newsletters');
    await adminAgent.loginAsOwner();
    await membersAgent.loginAs(MEMBER_EMAIL);
    // Defining and removing fields is behind the flag, so it is on for the whole
    // file rather than for each test: every test both makes and unmakes one.
    mockManager.mockLabsEnabled('membersCustomFields');

    const { body } = await adminAgent
      .get(`members/?filter=email:'${MEMBER_EMAIL}'`)
      .expectStatus(200);
    assert.equal(body.members.length, 1, `exactly one member holds ${MEMBER_EMAIL}`);
    memberId = body.members[0].id;
  });

  afterAll(function () {
    mockManager.restore();
  });

  beforeEach(async function () {
    fieldKey = await defineField(SHOE_SIZE);
    await setValuesAsStaff({ [fieldKey]: '9' });
  });

  afterEach(async function () {
    await removeFieldsDefinedHere();
  });

  it('offers a member the fields there are to fill in', async function () {
    // A second field, so this is a list rather than a single value that happens to
    // be right, and so the order it comes back in means something.
    const colourKey = await defineField('Favourite colour');

    const { body } = await membersAgent.get('/api/member/metafields/custom/').expectStatus(200);

    assert.deepEqual(
      body.members_metafields.map((field: { key: string }) => field.key),
      [fieldKey, colourKey],
      'every field the publisher defined, in the order they defined them',
    );

    const [field] = body.members_metafields;
    assert.equal(field.name, SHOE_SIZE);
    assert.equal(field.type, 'short_text');
    assert.equal(field.namespace, 'custom');

    // No database id: a field is addressed by its namespace and key, and neither
    // is reissued once minted.
    assert.equal(Object.hasOwn(field, 'id'), false);
  });

  it('says nothing about a field the publisher has archived', async function () {
    // A field a member once answered, which the publisher has since retired. The
    // answer stays on the record; what changes is that the member is no longer
    // asked about it and no longer told what they said.
    const retiredKey = await defineField('Former employer');
    await setValuesAsStaff({ [retiredKey]: 'Acme' });
    await archiveField(retiredKey);

    const { body: offered } = await membersAgent
      .get('/api/member/metafields/custom/')
      .expectStatus(200);
    const offeredKeys = offered.members_metafields.map((field: { key: string }) => field.key);
    assert.deepEqual(offeredKeys, [fieldKey], 'only the field still in use is offered');

    const { body: account } = await membersAgent.get('/api/member/').expectStatus(200);
    assert.deepEqual(
      account.metafields,
      { custom: { [fieldKey]: '9' } },
      'and the answer they gave for the archived one is not handed back',
    );
  });

  it('will not name the fields to someone who is not signed in', async function () {
    // Which fields a publisher collects is their configuration, not something the
    // site announces. A fresh agent rather than this suite's, which is signed in.
    const signedOut = membersAgent.duplicate();

    const { statusCode, body } = await signedOut.get('/api/member/metafields/custom/');

    assert.equal(statusCode, 401);
    assert.match(body.errors[0].message, /you must be signed in/i);

    // The status alone would pass a response that refused and listed them anyway,
    // which is the disclosure this is here to prevent.
    assert.equal(Object.hasOwn(body, 'members_metafields'), false);
    const refusal = JSON.stringify(body);
    assert.ok(!refusal.includes(fieldKey), 'the key of a defined field is not named');
    assert.ok(!refusal.includes(SHOE_SIZE), 'nor the name the publisher gave it');
  });

  it('returns a member the values they hold', async function () {
    const { body } = await membersAgent.get('/api/member/').expectStatus(200);

    // Namespaced, the same way staff are given them, so a client reads one shape
    // whichever side of Ghost it is talking to.
    assert.deepEqual(body.metafields, { custom: { [fieldKey]: '9' } });
  });

  it('writes the values a member sends about themselves', async function () {
    const { body } = await membersAgent
      .put('/api/member/')
      .body({ name: 'Renamed', metafields: { custom: { [fieldKey]: '12' } } })
      .expectStatus(200);

    assert.equal(body.name, 'Renamed');
    assert.equal(body.metafields.custom[fieldKey], '12');

    // Read back through the Admin API, because the value being in the response is
    // only half the claim: staff and the member are looking at one stored answer,
    // not at two that could drift. '12' rather than the '9' it started as, so a
    // write that did nothing could not pass this.
    const stored = await readMemberAsStaff();
    assert.equal(stored.name, 'Renamed');
    assert.equal(stored.metafields.custom[fieldKey], '12');
  });

  it('refuses a field nobody has defined, and changes nothing', async function () {
    const before = await readMemberAsStaff();
    assert.notEqual(before.name, 'Not renamed', 'the name is not already what this sets it to');

    const { body } = await membersAgent
      .put('/api/member/')
      .body({
        name: 'Not renamed',
        metafields: {
          custom: {
            // A field that does exist, named first. A handler that wrote each value
            // as it resolved it would already have written this one by the time it
            // reached the unknown field below, so without it the whole-request part
            // of the claim would not be exercised at all.
            [fieldKey]: '12',
            nothing_by_this_name: 'x',
          },
        },
      })
      .expectStatus(422);

    // Refused rather than ignored, unlike an unrecognised key at the top level: a
    // named field that does not exist means the client believes something false.
    // The reason reaches the member's client, which is what lets it name the field
    // that was wrong rather than only saying that something was.
    const [error] = body.errors;
    assert.equal(error.message, 'Unknown custom field: custom.nothing_by_this_name');
    assert.equal(error.property, 'metafields.custom.nothing_by_this_name');

    // Nothing the request named was applied: not the good field beside the bad one,
    // and not the name sent alongside both. The values are resolved before the
    // member is touched, so one bad field costs the whole request rather than
    // leaving a member renamed and their answers half-written.
    const after = await readMemberAsStaff();
    assert.equal(after.name, before.name);
    assert.equal(after.metafields.custom[fieldKey], '9', 'the defined field kept its value');
  });

  describe('what a publisher has kept to themselves', function () {
    it('says nothing at all about a field the member may not see', async function () {
      const privateKey = await defineField('Internal note', { access: 'none' });
      await setValuesAsStaff({ [privateKey]: 'Difficult on the phone' });

      const { body: offered } = await membersAgent
        .get('/api/member/metafields/custom/')
        .expectStatus(200);
      assert.deepEqual(
        offered.members_metafields.map((field: { key: string }) => field.key),
        [fieldKey],
        'the closed field is not among the fields there are to fill in',
      );

      const { body: account } = await membersAgent.get('/api/member/').expectStatus(200);
      assert.deepEqual(
        account.metafields,
        { custom: { [fieldKey]: '9' } },
        'nor is what staff put in it',
      );

      const seen = JSON.stringify(offered) + JSON.stringify(account);
      assert.ok(!seen.includes(privateKey), 'the key is not named');
      assert.ok(!seen.includes('Internal note'), 'nor the name the publisher gave it');
      assert.ok(!seen.includes('Difficult on the phone'), 'nor what it holds');
    });

    it('answers a write to a closed field exactly as it answers a write to no field', async function () {
      const privateKey = await defineField('Internal note', { access: 'none' });

      const refusals = [];
      for (const key of [privateKey, 'nothing_by_this_name']) {
        const { body } = await membersAgent
          .put('/api/member/')
          .body({ metafields: { custom: { [key]: 'x' } } })
          .expectStatus(422);
        refusals.push(body.errors[0]);
      }

      const [closed, undefined_] = refusals;
      // Any difference between these two is a way to ask a site which fields it holds.
      assert.equal(closed.message, `Unknown custom field: custom.${privateKey}`);
      assert.equal(undefined_.message, 'Unknown custom field: custom.nothing_by_this_name');
      assert.equal(closed.type, undefined_.type);
      assert.equal(closed.property, `metafields.custom.${privateKey}`);
      assert.equal(undefined_.property, 'metafields.custom.nothing_by_this_name');

      const stored = await readMemberAsStaff();
      assert.equal(Object.hasOwn(stored.metafields.custom, privateKey), false);
    });

    // A member's request body keys reach a plain object on the way to being resolved,
    // and a key naming something every object inherits reads back as present when it
    // was never set. These are refused like any other unknown field today only because
    // the namespace makes the key a compound one; if the bare form ever becomes
    // addressable, this is what should fail first.
    it('refuses a key naming an inherited property, and stores nothing', async function () {
      for (const hostile of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
        const { body } = await membersAgent
          .put('/api/member/')
          .body({ metafields: { custom: { [hostile]: 'x' } } })
          .expectStatus(422);
        assert.equal(body.errors[0].message, `Unknown custom field: custom.${hostile}`);
      }

      // Namespaces are data too, so the same key can arrive one level up. Built by
      // parsing rather than as a literal: `{__proto__: …}` in source sets the
      // prototype instead of creating a key, so it would serialise to `{}` and this
      // would assert nothing.
      await membersAgent
        .put('/api/member/')
        .body({ metafields: JSON.parse('{"__proto__": {"anything": "x"}}') })
        .expectStatus(422);

      const stored = await readMemberAsStaff();
      assert.deepEqual(stored.metafields.custom, { [fieldKey]: '9' }, 'nothing else was written');
      assert.equal(
        ({} as Record<string, unknown>).anything,
        undefined,
        'and nothing leaked onto Object',
      );
    });

    it('will not let a member change a field they may only read', async function () {
      const readOnlyKey = await defineField('Membership number', { access: 'read' });
      await setValuesAsStaff({ [readOnlyKey]: 'M-001' });

      const { body: account } = await membersAgent.get('/api/member/').expectStatus(200);
      assert.equal(account.metafields.custom[readOnlyKey], 'M-001', 'they are shown it');

      const { body: offered } = await membersAgent
        .get('/api/member/metafields/custom/')
        .expectStatus(200);
      const offeredField = offered.members_metafields.find(
        (field: { key: string }) => field.key === readOnlyKey,
      );
      assert.deepEqual(
        offeredField.access,
        { member: 'read' },
        'and told they may not change it, so a client can render it as such',
      );

      const { body } = await membersAgent
        .put('/api/member/')
        .body({ metafields: { custom: { [readOnlyKey]: 'M-999' } } })
        .expectStatus(422);

      assert.equal(body.errors[0].message, `Cannot set custom field: custom.${readOnlyKey}`);

      const stored = await readMemberAsStaff();
      assert.equal(stored.metafields.custom[readOnlyKey], 'M-001');
    });

    it('leaves a member no way to tell a closed site from a site with no fields', async function () {
      await setAccess(fieldKey, 'none');

      const { body } = await membersAgent.get('/api/member/').expectStatus(200);
      assert.equal(Object.hasOwn(body, 'metafields'), false);
    });

    it('shows a member what was already collected when a field is opened to them', async function () {
      const laterKey = await defineField('Delivery address', { access: 'none' });
      await setValuesAsStaff({ [laterKey]: '1 Main St' });

      const { body: before } = await membersAgent.get('/api/member/').expectStatus(200);
      assert.equal(Object.hasOwn(before.metafields.custom, laterKey), false);

      await setAccess(laterKey, 'read');

      const { body: after } = await membersAgent.get('/api/member/').expectStatus(200);
      assert.equal(after.metafields.custom[laterKey], '1 Main St');
    });

    it('stops showing a member a field that is closed again, and keeps what they wrote', async function () {
      await membersAgent
        .put('/api/member/')
        .body({ metafields: { custom: { [fieldKey]: '11' } } })
        .expectStatus(200);

      await setAccess(fieldKey, 'none');

      const { body } = await membersAgent.get('/api/member/').expectStatus(200);
      assert.equal(Object.hasOwn(body, 'metafields'), false);

      const stored = await readMemberAsStaff();
      assert.equal(stored.metafields.custom[fieldKey], '11');
    });

    it('shows staff every field, whatever a member may do with it', async function () {
      const privateKey = await defineField('Internal note', { access: 'none' });
      await setValuesAsStaff({ [privateKey]: 'Difficult on the phone' });

      const stored = await readMemberAsStaff();
      assert.equal(stored.metafields.custom[privateKey], 'Difficult on the phone');
      assert.equal(stored.metafields.custom[fieldKey], '9');

      const { body } = await adminAgent.get('members/metafields/custom/').expectStatus(200);
      const keys = body.members_metafields.map((field: { key: string }) => field.key);
      assert.ok(keys.includes(privateKey), 'and the definition, in the list they manage');
    });
  });
});
