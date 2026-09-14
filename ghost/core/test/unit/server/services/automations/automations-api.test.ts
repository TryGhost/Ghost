import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';

import * as automationsApi from '../../../../../core/server/services/automations/automations-api';
import {
  EMPTY_EMAIL_LEXICAL,
  NON_EMPTY_EMAIL_LEXICAL,
} from '../../../../utils/automations-fixtures';

/**
 * These tests run without a database, so they can only assert on failures that
 * happen during validation, before the repository is reached. Asserting on the
 * error *type and property* rather than its message keeps a database error from
 * accidentally satisfying the assertion.
 */
const assertValidationError = async (promise: Promise<unknown>, property: string) => {
  await assert.rejects(promise, (error: unknown) => {
    assert(
      error instanceof errors.ValidationError,
      `Expected a ValidationError, got: ${(error as Error)?.message}`,
    );
    assert.equal(error.property, property);
    return true;
  });
};

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

    it('rejects an invalid trigger', async function () {
      await assertValidationError(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [buildSendEmailAction()],
          edges: [],
          trigger: { type: 'comped' },
        }),
        'trigger',
      );
    });

    it('rejects a paid trigger with an empty tier list', async function () {
      await assertValidationError(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [buildSendEmailAction()],
          edges: [],
          trigger: { type: 'paid', tiers: [] },
        }),
        'trigger',
      );
    });

    it('rejects a tier id that is not an object id', async function () {
      await assertValidationError(
        automationsApi.edit(automationId, {
          status: 'inactive',
          actions: [buildSendEmailAction()],
          edges: [],
          trigger: { type: 'paid', tiers: ['bronze'] },
        }),
        'trigger',
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
  });

  describe('add', function () {
    it('rejects a missing name', async function () {
      await assertValidationError(automationsApi.add({ trigger: { type: 'free' } }), 'name');
    });

    it('rejects a blank name', async function () {
      await assertValidationError(
        automationsApi.add({ name: '   ', trigger: { type: 'free' } }),
        'name',
      );
    });

    it('rejects a missing trigger', async function () {
      await assertValidationError(automationsApi.add({ name: 'No trigger flow' }), 'trigger');
    });

    it('rejects an invalid trigger', async function () {
      await assertValidationError(
        automationsApi.add({ name: 'Bad trigger flow', trigger: { type: 'paid' } }),
        'trigger',
      );
    });

    it('rejects extra fields, so status and actions cannot be smuggled in', async function () {
      await assert.rejects(
        automationsApi.add({
          name: 'Sneaky flow',
          trigger: { type: 'free' },
          status: 'active',
        }),
        (error: unknown) => {
          assert(error instanceof errors.ValidationError);
          assert.match(error.message, /payload/);
          return true;
        },
      );
    });
  });
});
