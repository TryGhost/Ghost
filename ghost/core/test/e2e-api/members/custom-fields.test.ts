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

  /** Define a field, as a publisher does, and hand back the key Ghost minted for it. */
  /** Every field this suite defined, so cleanup can undo its own work and no more. */
  const defined = new Set<string>();

  async function defineField(name: string, type = 'short_text'): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type }] })
      .expectStatus(201);
    const { key } = body.members_metafields[0];
    defined.add(key);
    return key;
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
});
