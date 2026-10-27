import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import type { SpanDocument } from '../../../core/server/lib/tracing/create-tracer';

// Required rather than imported, so the test shares the module instances Ghost boots with.
const {
  agentProvider,
  fixtureManager,
  mockManager,
  configUtils,
  hostLimits,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const metafields: typeof import('../../../core/server/services/members-metafields') = require('../../../core/server/services/members-metafields');

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
  delete: (_url: string) => any;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
  useZapierAdminAPIKey: () => Promise<void>;
}

interface MembersAgent extends Agent {
  loginAs: (_email: string) => Promise<void>;
}

interface MockedMetrics {
  tracked: (_name: string) => SpanDocument[];
}

describe('Custom field outcomes', function () {
  let adminAgent: AdminAgent;
  let membersAgent: MembersAgent;
  let metrics: MockedMetrics;

  async function defineField(
    name: string,
    type = 'short_text',
    status = 201,
    access = 'none',
  ): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type, access: { member: access } }] })
      .expectStatus(status);
    return body.members_metafields?.[0]?.key;
  }

  function editField(key: string, change: Record<string, unknown>, status = 200) {
    return adminAgent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [change] })
      .expectStatus(status);
  }

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    adminAgent = agents.adminAgent;
    membersAgent = agents.membersAgent;
    await fixtureManager.init('members');
    await adminAgent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('membersCustomFields');
    metrics = mockManager.mockMetrics();
  });

  afterEach(async function () {
    mockManager.restore();
    await configUtils.restore();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafield_change_events').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('members').where('email', 'like', 'outcome-%').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['member', 'member_custom_field'])
      .del();
  });

  describe('Changing a field', function () {
    const spans = (command: 'create' | 'edit' | 'reorder' | 'delete') =>
      metrics.tracked(`members.metafields.definition.${command}`);

    it('records each command a publisher runs on a field, with its type', async function () {
      const key = await defineField('Address', 'address');
      await editField(key, { name: 'Postal address' });
      await editField(key, { status: 'archived' });
      await editField(key, { status: 'active' });
      await editField(key, { status: 'archived' });
      await adminAgent.delete(`members/metafields/custom/${key}/`).expectStatus(204);

      expect(spans('create')).toMatchObject([
        { event: { outcome: 'success' }, labels: { field_types: ['address'] } },
      ]);
      expect(spans('edit')).toMatchObject(
        [['rename'], ['archive'], ['restore'], ['archive']].map((changes) => ({
          event: { outcome: 'success' },
          labels: { field_types: ['address'], changes },
        })),
      );
      expect(spans('delete')).toMatchObject([
        { event: { outcome: 'success' }, labels: { field_types: ['address'] } },
      ]);
    });

    it('records everything one edit changes', async function () {
      const key = await defineField('Nickname');
      await editField(key, { name: 'Handle', access: { member: 'write' }, status: 'archived' });

      expect(spans('edit')).toMatchObject([
        { labels: { changes: ['rename', 'change_access', 'archive'] } },
      ]);
    });

    it('records only the changes a failed edit reached', async function () {
      await defineField('Nickname');
      const key = await defineField('Handle');
      await editField(key, { name: 'Nickname', access: { member: 'write' } }, 422);

      expect(spans('edit')).toMatchObject([
        {
          event: { outcome: 'failure' },
          error: { type: 'ValidationError' },
          labels: { changes: ['rename'] },
        },
      ]);
    });

    it('records each type once for fields defined together', async function () {
      await adminAgent
        .post('members/metafields/custom/')
        .body({
          members_metafields: [
            { name: 'Nickname', type: 'short_text' },
            { name: 'Bio', type: 'long_text' },
            { name: 'Company', type: 'short_text' },
          ],
        })
        .expectStatus(201);

      expect(spans('create')).toMatchObject([
        { event: { outcome: 'success' }, labels: { field_types: ['long_text', 'short_text'] } },
      ]);
    });

    it('records a reorder, which involves no one field', async function () {
      const first = await defineField('First');
      const second = await defineField('Second');
      await adminAgent
        .put('members/metafields/custom/')
        .body({ members_metafields: [{ key: second }, { key: first }] })
        .expectStatus(200);

      const [reorder] = spans('reorder');
      expect(reorder).toMatchObject({ event: { outcome: 'success' } });
      assert.equal(reorder.labels.field_types, undefined);
    });

    it('records a field the site has no room for as failed, with the limit as its reason', async function () {
      configUtils.set('members:metafields:maxDefinitions', 1);
      await defineField('Nickname');
      await defineField('Company', 'short_text', 403);

      expect(spans('create')).toMatchObject([
        { event: { outcome: 'success' } },
        {
          event: { outcome: 'failure' },
          error: { type: 'CUSTOM_FIELDS_LIMIT_REACHED' },
          labels: { field_types: ['short_text'] },
        },
      ]);
    });

    it('records a change the host refused, as custom fields are switched off', async function () {
      await hostLimits.setHostLimits({ limitCustomFields: { disabled: true, error: 'Upgrade' } });
      try {
        await defineField('Nickname', 'short_text', 403);
      } finally {
        await hostLimits.restoreHostLimits();
      }

      expect(spans('create')).toMatchObject([
        { event: { outcome: 'failure' }, error: { type: 'HostLimitError' } },
      ]);
    });

    it('records a change Ghost refused with the error’s type, never its message', async function () {
      const key = await defineField('Nickname');
      await editField(key, { type: 'long_text' }, 422);
      await adminAgent.delete(`members/metafields/custom/${key}/`).expectStatus(422);

      expect([...spans('edit'), ...spans('delete')]).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { type: 'ValidationError' },
          labels: { field_types: ['short_text'] },
        }),
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { type: 'ValidationError' },
          labels: { field_types: ['short_text'] },
        }),
      ]);
    });
  });

  describe('Writing values', function () {
    const writes = () => metrics.tracked('members.metafields.values');

    async function memberId(email: string): Promise<string> {
      const { body } = await adminAgent
        .get(`members/?filter=${encodeURIComponent(`email:'${email}'`)}`)
        .expectStatus(200);
      return body.members[0].id;
    }

    function setValues(id: string, custom: Record<string, unknown>, status = 200) {
      return adminAgent
        .put(`members/${id}/`)
        .body({ members: [{ metafields: { custom } }] })
        .expectStatus(status);
    }

    it('records values a publisher saves in Admin, with the types they write', async function () {
      const nickname = await defineField('Nickname');
      const address = await defineField('Address', 'address');
      await setValues(await memberId('member1@test.com'), {
        [nickname]: 'Bex',
        [address]: { line1: '1 High Street', city: 'Leeds' },
      });

      expect(writes()).toMatchObject([
        {
          event: { outcome: 'success' },
          labels: { source: 'admin', field_types: ['address', 'short_text'] },
        },
      ]);
    });

    it('records values given to a member as they are added', async function () {
      const nickname = await defineField('Nickname');
      await adminAgent
        .post('members/')
        .body({
          members: [
            { email: 'outcome-new@example.com', metafields: { custom: { [nickname]: 'Bex' } } },
          ],
        })
        .expectStatus(201);

      expect(writes()).toMatchObject([
        { event: { outcome: 'success' }, labels: { source: 'admin', field_types: ['short_text'] } },
      ]);
    });

    it('records values an integration writes through the Admin API', async function () {
      const nickname = await defineField('Nickname');
      const id = await memberId('member1@test.com');
      await adminAgent.useZapierAdminAPIKey();
      try {
        await setValues(id, { [nickname]: 'Bex' });
      } finally {
        await adminAgent.loginAsOwner();
      }

      expect(writes()).toMatchObject([
        {
          event: { outcome: 'success' },
          labels: { source: 'admin_api', field_types: ['short_text'] },
        },
      ]);
    });

    it('records values a member saves in Portal', async function () {
      const nickname = await defineField('Nickname', 'short_text', 201, 'write');
      await membersAgent.loginAs('member1@test.com');
      await membersAgent
        .put('/api/member/')
        .body({ metafields: { custom: { [nickname]: 'Bex' } } })
        .expectStatus(200);

      expect(writes()).toMatchObject([
        {
          event: { outcome: 'success' },
          labels: { source: 'portal', field_types: ['short_text'] },
        },
      ]);
    });

    it('records nothing when the member save fails before its values are stored', async function () {
      const nickname = await defineField('Nickname');
      await adminAgent
        .put(`members/${await memberId('member1@test.com')}/`)
        .body({
          members: [{ email: 'member2@test.com', metafields: { custom: { [nickname]: 'Bex' } } }],
        })
        .expectStatus(422);

      assert.deepEqual(writes(), []);
    });

    // Nothing a request can do makes Ghost fail after it has stored the values but before the
    // member save commits, so this joins a transaction that fails instead.
    it('records values as failed when the save they joined is rolled back', async function () {
      const nickname = await defineField('Nickname');
      const id = await memberId('member1@test.com');
      const { values } = metafields;
      assert(values);
      const planned = await values.planWrite(
        values.unwrapWire({ custom: { [nickname]: 'Bex' } }),
        metafields.ADMIN,
      );

      await assert.rejects(
        models.Base.knex.transaction(async (transacting: Knex.Transaction) => {
          await values.applyWrite(id, planned, {
            writtenBy: { type: 'user', id: '1' },
            source: 'admin',
            executor: transacting,
          });
          throw new Error('The member save failed');
        }),
        /The member save failed/,
      );

      expect(writes()).toMatchObject([
        { event: { outcome: 'failure' }, error: { type: 'Error' }, labels: { source: 'admin' } },
      ]);
    });

    it('records nothing for a save that carries no values', async function () {
      await defineField('Nickname');
      await adminAgent
        .put(`members/${await memberId('member1@test.com')}/`)
        .body({ members: [{ name: 'Renamed' }] })
        .expectStatus(200);

      assert.deepEqual(writes(), []);
    });
  });
});
