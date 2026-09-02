import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

/**
 * What the members API does when it cannot tell who is asking.
 *
 * Several endpoints exist only to serve the member making the request, and each
 * works out who that is on its own. Nothing states what they should answer when
 * nobody is signed in, so each has arrived at its own answer, and these record
 * what those answers currently are.
 *
 * Recorded before changing any of it. Where a later change moves one of these, the
 * change to this file is the statement of what was decided, rather than something
 * noticed afterwards.
 */
describe('Members API session authentication', function () {
  let membersAgent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    delete: (_url: string) => any;
    loginAs: (_email: string) => Promise<any>;
    duplicate: () => any;
  };

  beforeAll(async function () {
    membersAgent = await agentProvider.getMembersAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');
  });

  describe('with nobody signed in', function () {
    // A fresh agent per case: signing in is what these are the absence of, so a
    // shared one would only be signed out while these happened to run first.
    const anonymous = () => membersAgent.duplicate();

    it('answers an ask for the member themselves with nothing', async function () {
      const { statusCode } = await anonymous().get('/api/member/');

      // The one endpoint where not knowing is an ordinary answer: a themed page
      // asks this on every view and most of those views have no member.
      assert.equal(statusCode, 204);
    });

    it('refuses a change to the member', async function () {
      const { statusCode, text } = await anonymous().put('/api/member/').body({ name: 'Nobody' });

      // 400 rather than 401, and the reason names an internal cookie. Both are
      // recorded as they are rather than as they should be, so that changing them
      // is a decision this file shows.
      assert.equal(statusCode, 400);
      assert.match(text, /ghost-members-ssr/);
    });

    it('refuses removing an email from the suppression list', async function () {
      const { statusCode, text } = await anonymous().delete('/api/member/suppression');

      assert.equal(statusCode, 400);
      assert.match(text, /ghost-members-ssr/);
    });
  });

  describe('with a member signed in', function () {
    beforeAll(async function () {
      await membersAgent.loginAs('session-auth@example.com');
    });

    it('answers an ask for the member themselves', async function () {
      const { body } = await membersAgent.get('/api/member/').expectStatus(200);

      assert.equal(body.email, 'session-auth@example.com');
    });

    it('applies a change to the member', async function () {
      const { body } = await membersAgent
        .put('/api/member/')
        .body({ name: 'Signed In' })
        .expectStatus(200);

      assert.equal(body.name, 'Signed In');
    });

    it('accepts removing an email from the suppression list', async function () {
      await membersAgent.delete('/api/member/suppression').expectStatus(204);
    });
  });
});
