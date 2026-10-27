import assert from 'node:assert/strict';
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

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
  delete: (_url: string) => any;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
}

interface MockedMetrics {
  tracked: (_name: string) => SpanDocument[];
}

describe('Custom field outcomes', function () {
  let adminAgent: AdminAgent;
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
});
