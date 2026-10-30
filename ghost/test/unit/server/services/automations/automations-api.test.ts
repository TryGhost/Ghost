import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import { vi } from 'vitest';
// @ts-expect-error @tryghost/domain-events currently lacks type declarations.
import domainEvents from '@tryghost/domain-events';

import * as automationsApi from '../../../../../core/server/services/automations/automations-api';
import { StartAutomationsPollEvent } from '../../../../../core/server/services/automations/events/start-automations-poll-event';
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
      })),
    };
  },
);

vi.mock(
  '../../../../../core/server/services/automations/database-automations-repository-2',
  async () => {
    const { createTestAutomationsRepository2 } = await import('./test-automations-repository-2');
    return {
      createDatabaseAutomationsRepository2: vi.fn(() =>
        createTestAutomationsRepository2({
          getNumberOfAutomations: () => 20,
        }),
      ),
    };
  },
);

const buildWaitAction = () => ({
  id: ObjectId().toHexString(),
  type: 'wait' as const,
  data: { wait_hours: 1 },
});

const buildSendEmailAction = (dataOverrides = {}) => ({
  id: ObjectId().toHexString(),
  type: 'send_email' as const,
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
  afterAll(function () {
    // Unit files share a worker module cache. Do not leave repositories imported
    // with these mocked dependencies for subsequent repository tests.
    vi.doUnmock('../../../../../core/server/services/automations/database-automations-repository');
    vi.doUnmock(
      '../../../../../core/server/services/automations/database-automations-repository-2',
    );
    vi.resetModules();
  });

  afterEach(function () {
    sinon.restore();
    repositoryAdd.mockReset();
    repositoryEdit.mockReset();
  });

  describe('getNumberOfAutomations', function () {
    it('returns the repository count', async function () {
      assert.equal(await automationsApi.getNumberOfAutomations(), 20);
    });
  });

  describe('add', function () {
    const actions = [buildWaitAction(), buildSendEmailAction()];
    const valid = {
      name: 'New automation',
      description: '',
      trigger_rules: [
        { trigger_type: 'free_signup' as const, scope: null, product_id: null, direction: null },
      ],
      status: 'active' as const,
      actions,
      edges: [buildEdge(actions[0], actions[1])],
    };

    it('adds automations', async function () {
      const tierIds = [ObjectId().toHexString(), ObjectId().toHexString()];
      const payload = {
        ...valid,
        description: 'Welcome selected paid members',
        trigger_rules: tierIds.map((productId) => ({
          trigger_type: 'paid_subscription_started' as const,
          scope: 'specific_paid_tier' as const,
          product_id: productId,
          direction: null,
        })),
      };
      const saved = { ...payload, id: ObjectId().toHexString() };
      repositoryAdd.mockResolvedValue(saved);

      assert.strictEqual(await automationsApi.add(payload), saved);
      expect(repositoryAdd).toHaveBeenCalledExactlyOnceWith(payload);
    });

    it.each(['inactive', 'archived'] as const)(
      'can add an %s automation with no actions',
      async function (status) {
        const payload = { ...valid, status, actions: [], edges: [] };
        const saved = { ...payload, id: ObjectId().toHexString() };
        repositoryAdd.mockResolvedValue(saved);

        assert.strictEqual(await automationsApi.add(payload), saved);

        expect(repositoryAdd).toHaveBeenCalledExactlyOnceWith(payload);
      },
    );

    it('rejects invalid graphs and email content', async function () {
      const invalidPayloads = [
        { ...valid, actions: [actions[0], actions[0]] },
        { ...valid, edges: [] },
        { ...valid, edges: [buildEdge(actions[0], buildWaitAction())] },
        { ...valid, actions: [buildSendEmailAction({ email_lexical: 'invalid' })], edges: [] },
        { ...valid, actions: [buildSendEmailAction({ email_subject: '' })], edges: [] },
        {
          ...valid,
          actions: [buildSendEmailAction({ email_lexical: EMPTY_EMAIL_LEXICAL })],
          edges: [],
        },
        { ...valid, actions: [] },
      ];
      for (const payload of invalidPayloads) {
        await assert.rejects(automationsApi.add(payload), {
          errorType: 'ValidationError',
          statusCode: 422,
        });
      }
      expect(repositoryAdd).not.toHaveBeenCalled();
    });

    it.each(['inactive', 'archived'] as const)(
      'allows empty email drafts when %s',
      async function (status) {
        const payload = {
          ...valid,
          status,
          actions: [
            buildSendEmailAction({ email_subject: '', email_lexical: EMPTY_EMAIL_LEXICAL }),
          ],
          edges: [],
        };
        await automationsApi.add(payload);
        expect(repositoryAdd).toHaveBeenCalledExactlyOnceWith(payload);
        expect(repositoryEdit).not.toHaveBeenCalled();
      },
    );
  });

  describe('edit', function () {
    const automationId = ObjectId().toHexString();

    it.each(['inactive', 'archived'] as const)(
      'allows status-only edits to %s',
      async function (status) {
        const saved = { id: automationId, status };
        repositoryEdit.mockResolvedValue(saved);
        assert.strictEqual(await automationsApi.edit(automationId, { status }), saved);
        assert.deepEqual(repositoryEdit.mock.calls[0], [automationId, { status }]);
      },
    );

    it.each(['inactive', 'archived'] as const)(
      'saves an empty graph for %s automations',
      async function (status) {
        const payload = { status, actions: [], edges: [] };
        const saved = { id: automationId, ...payload };
        repositoryEdit.mockResolvedValue(saved);

        assert.strictEqual(await automationsApi.edit(automationId, payload), saved);

        expect(repositoryEdit).toHaveBeenCalledExactlyOnceWith(automationId, payload);
      },
    );

    it('returns "not found" for status-only edits of unknown automations', async function () {
      repositoryEdit.mockResolvedValue(null);
      await assert.rejects(automationsApi.edit(automationId, { status: 'inactive' }), {
        errorType: 'NotFoundError',
      });
    });

    it('rejects activation with no actions', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, { status: 'active' as const, actions: [], edges: [] }),
        {
          errorType: 'ValidationError',
          property: 'actions',
          message: 'Active automations require at least one action.',
        },
      );
      expect(repositoryEdit).not.toHaveBeenCalled();
    });

    it('rejects edges in an empty graph', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive' as const,
          actions: [],
          edges: [buildEdge(buildWaitAction(), buildWaitAction())],
        }),
        {
          errorType: 'ValidationError',
          property: 'edges',
        },
      );
      expect(repositoryEdit).not.toHaveBeenCalled();
    });

    it('allows activation when the full graph is submitted', async function () {
      const payload = { status: 'active' as const, actions: [buildSendEmailAction()], edges: [] };
      const saved = { id: automationId, ...payload };
      repositoryEdit.mockResolvedValue(saved);
      assert.strictEqual(await automationsApi.edit(automationId, payload), saved);
      expect(repositoryEdit).toHaveBeenCalledExactlyOnceWith(automationId, payload);
    });

    it('allows a full-graph archived edit with empty email drafts', async function () {
      const payload = {
        status: 'archived' as const,
        actions: [buildSendEmailAction({ email_subject: '', email_lexical: EMPTY_EMAIL_LEXICAL })],
        edges: [],
      };
      const saved = { id: automationId, ...payload };
      repositoryEdit.mockResolvedValue(saved);
      assert.strictEqual(await automationsApi.edit(automationId, payload), saved);
      expect(repositoryEdit).toHaveBeenCalledExactlyOnceWith(automationId, payload);
    });

    it('preserves omitted metadata', async function () {
      const graph = { status: 'inactive' as const, actions: [buildWaitAction()], edges: [] };
      repositoryEdit.mockResolvedValue({ id: automationId });
      await automationsApi.edit(automationId, graph);
      expect(repositoryEdit).toHaveBeenCalledExactlyOnceWith(automationId, graph);
    });

    it.each([
      [{ trigger_type: 'free_signup' as const, scope: null, product_id: null, direction: null }],
      [
        {
          trigger_type: 'paid_subscription_started' as const,
          scope: 'any_paid_tier' as const,
          product_id: null,
          direction: null,
        },
      ],
      [ObjectId().toHexString(), ObjectId().toHexString()].map((productId) => ({
        trigger_type: 'paid_subscription_started' as const,
        scope: 'specific_paid_tier' as const,
        product_id: productId,
        direction: null,
      })),
    ])('passes trigger rules to the repository: %j', async function (...trigger_rules) {
      const data = {
        status: 'inactive' as const,
        actions: [buildWaitAction()],
        edges: [],
        trigger_rules,
      };
      repositoryEdit.mockResolvedValue({ id: automationId });
      await automationsApi.edit(automationId, data);
      expect(repositoryEdit).toHaveBeenCalledExactlyOnceWith(automationId, data);
    });

    it('rejects activating an automation with an empty email subject', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'active' as const,
          actions: [buildSendEmailAction({ email_subject: '' })],
          edges: [],
        }),
        /subject line/,
      );
    });

    it('rejects activating an automation with an empty email body', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'active' as const,
          actions: [buildSendEmailAction({ email_lexical: EMPTY_EMAIL_LEXICAL })],
          edges: [],
        }),
        /body/,
      );
    });

    it.each(['inactive', 'archived'] as const)(
      'rejects invalid email JSON when %s',
      async function (status) {
        await assert.rejects(
          automationsApi.edit(automationId, {
            status,
            actions: [buildSendEmailAction({ email_lexical: '{"root":' })],
            edges: [],
          }),
          /well-formed Lexical document/,
        );
      },
    );

    it('rejects an active send email action with invalid JSON as malformed Lexical', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'active' as const,
          actions: [buildSendEmailAction({ email_lexical: '{"root":' })],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects a send email action with JSON that is not a Lexical document', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive' as const,
          actions: [buildSendEmailAction({ email_lexical: JSON.stringify({ children: [] }) })],
          edges: [],
        }),
        /well-formed Lexical document/,
      );
    });

    it('rejects a draft send email action with a malformed empty paragraph', async function () {
      await assert.rejects(
        automationsApi.edit(automationId, {
          status: 'inactive' as const,
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
          status: 'inactive' as const,
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
          status: 'inactive' as const,
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
          status: 'inactive' as const,
          actions: [a, b, c, d],
          edges: [buildEdge(a, b), buildEdge(c, d), buildEdge(d, c)],
        }),
        /graph must be a single linear path/,
      );
    });
  });

  describe('requestPoll', function () {
    it('dispatches a "start automations poll" event', function () {
      const dispatchStub = sinon.stub(domainEvents, 'dispatch');

      automationsApi.requestPoll();

      sinon.assert.calledOnceWithExactly(
        dispatchStub,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });
  });
});
