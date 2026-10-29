import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// A field carries settings beside its type, for what it is set up with beyond its name. A list
// field will be the first type to take any, its options, so until then every field takes none.
describe('List custom fields', function () {
  let agent: {
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };

  const ANIMALS = { options: ['Dog', 'Cat'], multiple: true };

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('membersCustomFields');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('members').del();
    await models.Base.knex('actions').where('resource_type', 'member_custom_field').del();
  });

  describe('Settings', function () {
    it('refuses settings on a type that has none', async function () {
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Company', type: 'short_text', settings: ANIMALS }] })
        .expectStatus(422);
      assert.equal(body.errors[0].context, 'This type of field has no settings.');
    });
  });
});
