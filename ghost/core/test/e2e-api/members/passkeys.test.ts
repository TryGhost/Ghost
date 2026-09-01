export {};

const assert = require('node:assert/strict');
const sinon = require('sinon');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');
const passkeys = require('../../../core/server/services/passkeys');
const urlUtils = require('../../../core/shared/url-utils').default;

const authenticationResponse = {
  id: 'member-passkey',
  rawId: 'member-passkey',
  response: {
    clientDataJSON: 'client-data',
    authenticatorData: 'authenticator-data',
    signature: 'signature',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

describe('Member passkeys API', function () {
  let membersAgent: any;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    membersAgent = agents.membersAgent;
    await fixtureManager.init('members');
  });

  afterEach(function () {
    sinon.restore();
    membersAgent.clearCookies();
  });

  async function integrityToken() {
    const response = await membersAgent.get('/api/integrity-token/').expectStatus(200);
    return response.text;
  }

  async function signInMember(email: string) {
    const magicLink = await membersService.api.getMagicLink(email, 'signin');
    const token = new URL(magicLink).searchParams.get('token');
    await membersAgent.get(`/?token=${token}`).expectStatus(302);
  }

  it('lists and removes passkeys owned by the authenticated member', async function () {
    const member = await models.Member.findOne({ email: 'member1@test.com' });
    await signInMember(member.get('email'));

    const credential = await models.PasskeyCredential.add({
      user_id: null,
      member_id: member.id,
      credential_id: 'member-test-credential',
      credential_id_hash: 'b'.repeat(64),
      rp_id: new URL(urlUtils.getSiteUrl()).hostname,
      public_key: 'test-public-key',
      counter: 0,
      backed_up: false,
      name: 'Member passkey',
    });

    const { body } = await membersAgent.get('/api/passkeys').expectStatus(200);
    assert.equal(body.passkeys.length, 1);
    assert.equal(body.passkeys[0].id, credential.id);

    await membersAgent
      .delete(`/api/passkeys/${credential.id}`)
      .body({ integrityToken: await integrityToken() })
      .expectStatus(204)
      .expectEmptyBody();

    const { body: emptyBody } = await membersAgent.get('/api/passkeys').expectStatus(200);
    assert.deepEqual(emptyBody.passkeys, []);
  });

  it('creates a member session after successful passkey authentication', async function () {
    const member = await models.Member.findOne({ email: 'member1@test.com' });
    sinon.stub(passkeys, 'authenticationOptions').resolves({
      options: { challenge: 'member-authentication-challenge' },
    });
    sinon.stub(passkeys, 'createCeremonyToken').returns('signed-member-ceremony');
    sinon.stub(passkeys, 'verifyCeremonyToken').returns({
      id: 'member-ceremony-id',
      challenge: 'member-authentication-challenge',
      issued: Date.now(),
    });
    const authenticate = sinon.stub(passkeys, 'authenticate').resolves({ memberId: member.id });

    const beginToken = await integrityToken();
    const { body } = await membersAgent
      .post('/api/passkeys/authentication')
      .body({ integrityToken: beginToken })
      .expectStatus(200);
    assert.equal(body.options.challenge, 'member-authentication-challenge');
    assert.equal(body.ceremony, 'signed-member-ceremony');

    const finishToken = await integrityToken();
    await membersAgent
      .put('/api/passkeys/authentication')
      .body({
        response: authenticationResponse,
        ceremony: body.ceremony,
        integrityToken: finishToken,
      })
      .expectStatus(204)
      .expectHeader('Set-Cookie', /members-ssr/)
      .expectEmptyBody();

    assert.equal(authenticate.firstCall.args[0].audience, 'member');
    assert.equal(authenticate.firstCall.args[0].ceremonyId, 'member-ceremony-id');
    assert.equal(
      authenticate.firstCall.args[0].expectedChallenge,
      'member-authentication-challenge',
    );
  });
});
