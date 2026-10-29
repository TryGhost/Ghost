import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

describe('Deleting a member', function () {
  let agent: {
    get: (url: string) => any;
    post: (url: string) => any;
    delete: (url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let owner: { id: string };

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
    owner = await fixtureManager.get('users', 0);
  });

  it('records the deletion in the history, with who deleted them', async function () {
    const { body } = await agent
      .post('members/')
      .body({ members: [{ email: 'deleted-by-staff@example.com', name: 'Jamie Larson' }] })
      .expectStatus(201);
    const memberId = body.members[0].id;

    await agent.delete(`members/${memberId}/`).expectStatus(204);

    // The history entry is written once the delete commits, which can be after the response.
    const deletion = await vi.waitFor(async () => {
      const filter = `resource_id:'${memberId}'+resource_type:member+event:deleted`;
      const { body: history } = await agent
        .get(`actions/?filter=${encodeURIComponent(filter)}&include=actor`)
        .expectStatus(200);
      assert.equal(history.actions.length, 1, 'no deletion recorded in the history');
      return history.actions[0];
    });

    assert.equal(deletion.actor.id, owner.id);
    assert.equal(JSON.parse(deletion.context).primary_name, 'Jamie Larson');
  });
});
