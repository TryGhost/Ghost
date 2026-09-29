import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';

import * as automationsApi from '../../../../../core/server/services/automations/automations-api';
import {
  EMPTY_EMAIL_LEXICAL,
  NON_EMPTY_EMAIL_LEXICAL,
} from '../../../../utils/automations-fixtures';

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

const buildWaitAction = () => ({
  id: ObjectId().toHexString(),
  type: 'wait',
  data: { wait_hours: 1 },
});

const buildEdge = (source: Readonly<{ id: string }>, target: Readonly<{ id: string }>) => ({
  source_action_id: source.id,
  target_action_id: target.id,
});

describe('automations API', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('edit', function () {
    const automationId = ObjectId().toHexString();

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
    it('names the whole payload when a non-object payload is rejected', async function () {
      await assert.rejects(automationsApi.edit(automationId, null), (err: Error) => {
        assert.equal(err.name, 'ValidationError');
        assert.match(
          err.message,
          /^Automation edit payload must include status, actions, and edges\. payload: /,
        );
        return true;
      });
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
        (err: Error & { property?: string }) => {
          assert.equal(err.name, 'ValidationError');
          assert.equal(err.message, 'Automation edges must be unique.');
          assert.equal(err.property, 'edges');
          return true;
        },
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
        (err: Error & { property?: string }) => {
          assert.equal(err.name, 'ValidationError');
          assert.equal(
            err.message,
            'Automation graph must be a single linear path without branches or cycles.',
          );
          assert.equal(err.property, 'edges');
          return true;
        },
      );
    });
  });
});
