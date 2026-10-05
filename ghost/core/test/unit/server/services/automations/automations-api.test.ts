import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import { vi } from 'vitest';
import { createDatabaseAutomationsRepository } from '../../../../../core/server/services/automations/database-automations-repository';

import * as automationsApi from '../../../../../core/server/services/automations/automations-api';
import {
  EMPTY_EMAIL_LEXICAL,
  NON_EMPTY_EMAIL_LEXICAL,
} from '../../../../utils/automations-fixtures';

const { repositoryAdd, repositoryEdit } = vi.hoisted(() => ({
  repositoryAdd: vi.fn(),
  repositoryEdit: vi.fn(),
}));

vi.mock(
  '../../../../../core/server/services/automations/database-automations-repository',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../../../../../core/server/services/automations/database-automations-repository')
      >();
    return {
      ...actual,
      createDatabaseAutomationsRepository: vi.fn((options) => ({
        ...actual.createDatabaseAutomationsRepository(options),
        add: repositoryAdd,
        edit: repositoryEdit,
        getNumberOfAutomations: vi.fn().mockResolvedValue(20),
      })),
    };
  },
);

const buildWaitAction = () => ({
  id: ObjectId().toHexString(),
  type: 'wait',
  data: { wait_hours: 1 },
});

const buildSendEmailAction = (dataOverrides = {}) => ({
  id: ObjectId().toHexString(),
  type: 'send_email',
  data: {
    email_subject: 'Welcome',
    email_lexical: NON_EMPTY_EMAIL_LEXICAL,
    email_design_setting_id: '64b6f7b7c8f1a2b3c4d5e6f7',
    ...dataOverrides,
  },
});

const buildEdge = (source: Readonly<{ id: string }>, target: Readonly<{ id: string }>) => ({
  source_action_id: source.id,
  target_action_id: target.id,
});

describe('automations API', function () {
  afterEach(function () {
    sinon.restore();
    repositoryAdd.mockReset();
    repositoryEdit.mockReset();
  });

  describe('getNumberOfAutomations', function () {
    it('returns the repository count', async function () {
      assert.equal(await automationsApi.getNumberOfAutomations(), 20);
      const repository = vi.mocked(createDatabaseAutomationsRepository).mock.results[0].value;
      expect(repository.getNumberOfAutomations).toHaveBeenCalledOnce();
    });
  });

  describe('add', function () {
    const valid = { name: 'New automation', description: '', trigger_tier_scope: 'free' };

    it('adds automations', async function () {
      const tierIds = [ObjectId().toHexString(), ObjectId().toHexString()];
      const payload = {
        ...valid,
        description: 'Welcome selected paid members',
        trigger_tier_scope: 'selected_paid',
        trigger_tier_ids: [...tierIds, tierIds[0]],
      };
      const saved = { ...payload, id: ObjectId().toHexString(), trigger_tier_ids: tierIds };
      repositoryAdd.mockResolvedValue(saved);

      assert.strictEqual(await automationsApi.add(payload), saved);
      expect(repositoryAdd).toHaveBeenCalledExactlyOnceWith({
        ...payload,
        trigger_tier_ids: tierIds,
      });
    });

    it('rejects invalid inputs', async function () {
      const invalidPayloads = [
        undefined,
        null,
        [],
        {},
        { ...valid, name: '' },
        { ...valid, name: '   ' },
        { ...valid, name: 'x'.repeat(192) },
        { ...valid, name: 42 },
        { ...valid, description: null },
        { ...valid, description: 'x'.repeat(2001) },
        { ...valid, trigger_tier_scope: 'paid' },
        { ...valid, trigger_tier_scope: 'selected_paid' },
        { ...valid, trigger_tier_scope: 'selected_paid', trigger_tier_ids: [] },
        { ...valid, trigger_tier_scope: 'selected_paid', trigger_tier_ids: ['invalid'] },
        { ...valid, trigger_tier_ids: [ObjectId().toHexString()] },
        { ...valid, trigger_tier_scope: 'all_paid', trigger_tier_ids: [ObjectId().toHexString()] },
        { ...valid, status: 'active' },
        { ...valid, slug: 'member-welcome-email-free' },
        { ...valid, actions: [] },
        { ...valid, id: ObjectId().toHexString() },
      ];
      await Promise.all(
        invalidPayloads.map(async (payload) => {
          await assert.rejects(automationsApi.add(payload), {
            errorType: 'ValidationError',
            statusCode: 422,
          });
        }),
      );
    });
  });

  describe('edit', function () {
    const automationId = ObjectId().toHexString();

    it('trims optional name and description before saving', async function () {
      const actions = [buildWaitAction()];
      repositoryEdit.mockResolvedValue({ id: automationId });

      await automationsApi.edit(automationId, {
        status: 'inactive',
        actions,
        edges: [],
        name: '  Renamed flow\n',
        description: '\tUpdated description  ',
      });

      assert.deepEqual(repositoryEdit.mock.calls[0], [
        automationId,
        {
          status: 'inactive',
          actions,
          edges: [],
          name: 'Renamed flow',
          description: 'Updated description',
        },
      ]);
    });

    it('allows omitted metadata and whitespace-only descriptions', async function () {
      const graph = { status: 'inactive', actions: [buildWaitAction()], edges: [] };
      repositoryEdit.mockResolvedValue({ id: automationId });
      await automationsApi.edit(automationId, graph);
      assert.deepEqual(repositoryEdit.mock.calls[0], [automationId, graph]);

      await automationsApi.edit(automationId, { ...graph, description: ' \t\n ' });
      assert.deepEqual(repositoryEdit.mock.calls[1], [
        automationId,
        {
          ...graph,
          description: '',
        },
      ]);
    });

    for (const [field, values] of [
      ['name', ['', ' \t\n ', 'x'.repeat(192), null, 123]],
      ['description', ['x'.repeat(2001), null, 123]],
    ] as const) {
      for (const value of values) {
        it(`rejects invalid ${field}: ${JSON.stringify(value).slice(0, 40)}`, async function () {
          repositoryEdit.mockResolvedValue({ id: automationId });
          await assert.rejects(
            automationsApi.edit(automationId, {
              status: 'inactive',
              actions: [buildWaitAction()],
              edges: [],
              [field]: value,
            }),
            { errorType: 'ValidationError' },
          );
          assert.equal(repositoryEdit.mock.calls.length, 0);
        });
      }
    }

    it('validates metadata length after trimming, not before', async function () {
      repositoryEdit.mockResolvedValue({ id: automationId });
      await automationsApi.edit(automationId, {
        status: 'inactive',
        actions: [buildWaitAction()],
        edges: [],
        name: ` ${'x'.repeat(191)} `,
        description: ` ${'x'.repeat(2000)} `,
      });
      assert.equal(repositoryEdit.mock.calls[0][1].name.length, 191);
      assert.equal(repositoryEdit.mock.calls[0][1].description.length, 2000);
    });

    it('rejects metadata-only edits', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          name: 'Renamed flow',
          description: 'Updated description',
        }),
        { errorType: 'ValidationError' },
      );
      assert.equal(repositoryEdit.mock.calls.length, 0);
    });

    it.each([[null], ['free'], ['all_paid'], ['selected_paid']])(
      'accepts %s trigger scope edits',
      async function (scope) {
        const data = {
          status: 'inactive',
          actions: [buildWaitAction()],
          edges: [],
          trigger_tier_scope: scope,
          trigger_tier_ids: scope === 'selected_paid' ? [ObjectId().toHexString()] : null,
        };
        repositoryEdit.mockResolvedValue({ id: automationId });
        await automationsApi.edit(automationId, data);
        assert.deepEqual(repositoryEdit.mock.calls[0], [automationId, data]);
      },
    );

    it.each([
      ['invalid trigger tier scope', { trigger_tier_scope: 'invalid' }],
      ['unexpected trigger tiers for no scope', { trigger_tier_ids: [ObjectId().toHexString()] }],
      [
        'unexpected trigger tiers for null scope',
        { trigger_tier_scope: null, trigger_tier_ids: [ObjectId().toHexString()] },
      ],
      [
        'unexpected trigger tiers for free scope',
        { trigger_tier_scope: 'free', trigger_tier_ids: [ObjectId().toHexString()] },
      ],
      [
        'unexpected trigger tiers for all_paid scope',
        { trigger_tier_scope: 'all_paid', trigger_tier_ids: [ObjectId().toHexString()] },
      ],
      ['missing trigger_tier_ids for selected_paid scope', { trigger_tier_scope: 'selected_paid' }],
      [
        'invalid trigger_tier_ids for selected_paid scope',
        { trigger_tier_scope: 'selected_paid', trigger_tier_ids: [123] },
      ],
      [
        'empty trigger_tier_ids for selected_paid scope',
        { trigger_tier_scope: 'selected_paid', trigger_tier_ids: [] },
      ],
    ])('rejects %s', async function (_, extras) {
      await assert.rejects(
        automationsApi.edit(automationId, {
          name: 'My Automation',
          description: '',
          status: 'inactive',
          actions: [buildWaitAction()],
          edges: [],
          ...extras,
        }),
        { errorType: 'ValidationError' },
      );
      assert.equal(repositoryEdit.mock.calls.length, 0);
    });

    it('rejects activating an automation with an empty email subject', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'active',
          actions: [buildSendEmailAction({ email_subject: '' })],
          edges: [],
        }),
        /subject line/,
      );
    });

    it('rejects activating an automation with an empty email body', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'active',
          actions: [buildSendEmailAction({ email_lexical: EMPTY_EMAIL_LEXICAL })],
          edges: [],
        }),
        /body/,
      );
    });

    it('rejects a send email action with invalid JSON', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [buildSendEmailAction({ email_lexical: '{"root":' })],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects an active send email action with invalid JSON as malformed Lexical', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'active',
          actions: [buildSendEmailAction({ email_lexical: '{"root":' })],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects a send email action with JSON that is not a Lexical document', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [buildSendEmailAction({ email_lexical: JSON.stringify({ children: [] }) })],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects a draft send email action with a malformed empty paragraph', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [
            buildSendEmailAction({
              email_lexical: JSON.stringify({
                root: {
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                    },
                  ],
                  type: 'root',
                  version: 1,
                },
              }),
            }),
          ],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects a send email action with malformed Lexical child nodes', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [
            buildSendEmailAction({
              email_lexical: JSON.stringify({
                root: {
                  children: [{ type: 'unknown-node', version: 1 }],
                  type: 'root',
                  version: 1,
                },
              }),
            }),
          ],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects duplicate edges', async function () {
      const first = buildWaitAction();
      const second = buildWaitAction();

      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [first, second],
          edges: [buildEdge(first, second), buildEdge(first, second)],
        }),
        /edges must be unique/,
      );
    });

    it('rejects a path with a separate cycle', async function () {
      // A -> B is a valid path, but C <-> D forms a disconnected cycle. The
      // edge count and head/tail counts still look like a linear path.
      const a = buildWaitAction();
      const b = buildWaitAction();
      const c = buildWaitAction();
      const d = buildWaitAction();

      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [a, b, c, d],
          edges: [buildEdge(a, b), buildEdge(c, d), buildEdge(d, c)],
        }),
        /graph must be a single linear path/,
      );
    });
  });
});
