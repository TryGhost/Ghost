import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { EventSource, SingleMessage } from '@tryghost/adapter-base-email';
import { sendSingleEmail } from '../../../../../core/server/services/email-provider';
const { Suppression } = require('../../../../../core/server/models');

describe('single-recipient email sending', () => {
  const message: SingleMessage = {
    family: 'automations',
    to: 'reader@example.com',
    from: 'site@example.com',
    subject: 'Welcome',
    html: '<p>Welcome</p>',
    text: 'Welcome',
  };
  afterEach(() => sinon.restore());

  function mockLookup() {
    const query = {
      client: { config: { client: 'mysql2' } },
      select: sinon.stub().returnsThis(),
      clone: sinon.stub().returnsThis(),
      whereIn: sinon.stub().resolves([]),
    };
    sinon.stub(Suppression, 'getFilteredCollectionQuery').returns(query);
    return query.whereIn;
  }

  it('preserves polling sends without consulting local suppression', async () => {
    const lookup = mockLookup().rejects(new Error('Do not query'));
    const provider = {
      getEventSource: (): EventSource => ({ type: 'poll', fetch: async () => {} }),
      sendSingle: sinon.stub().resolves({ id: null }),
    };
    assert.deepEqual(await sendSingleEmail(provider, message), { id: null });
    sinon.assert.calledOnceWithExactly(provider.sendSingle, message);
    sinon.assert.notCalled(lookup);
  });

  it('allows an unsuppressed webhook send and preserves its response', async () => {
    mockLookup();
    const response = { id: '<Opaque-Id>' };
    const provider = {
      getEventSource: (): EventSource => ({
        type: 'webhook',
        verify: async () => ({ events: [] }),
      }),
      sendSingle: sinon.stub().resolves(response),
    };
    assert.equal(await sendSingleEmail(provider, message), response);
    sinon.assert.calledOnceWithExactly(provider.sendSingle, message);
  });

  it('does not send when the webhook suppression lookup fails', async () => {
    const failure = new Error('Suppression lookup failed');
    mockLookup().rejects(failure);
    const provider = {
      getEventSource: (): EventSource => ({
        type: 'webhook',
        verify: async () => ({ events: [] }),
      }),
      sendSingle: sinon.stub().resolves({ id: 'id' }),
    };
    await assert.rejects(sendSingleEmail(provider, message), (error) => error === failure);
    sinon.assert.notCalled(provider.sendSingle);
  });
});
