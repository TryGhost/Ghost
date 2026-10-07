import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  actingContext,
  recordGiftLinkAction,
  type RequestContext,
} from '../../../../../core/server/services/gift-links/actions';

const logging = require('@tryghost/logging');

const CTX: RequestContext = { actor: { id: 'actor-id', type: 'user' } };

// Pins the parts not observable through the actions API: the best-effort contract and the
// no-actor short-circuit. The verb->event mapping is covered there as an outcome.
describe('Unit: recordGiftLinkAction', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('does not propagate when the action recorder throws (logging instead)', async function () {
    const errorStub = sinon.stub(logging, 'error');
    const Action = {
      add: async () => {
        throw new Error('action write failed');
      },
    };

    await assert.doesNotReject(() =>
      recordGiftLinkAction({ Action, context: CTX, verb: 'add', subject: 'post-id' }),
    );
    assert.equal(errorStub.calledOnce, true, 'the failure is logged');
  });

  it('records nothing when there is no actor', async function () {
    const add = sinon.stub().resolves();

    await recordGiftLinkAction({
      Action: { add },
      context: { actor: null },
      verb: 'add',
      subject: 'post-id',
    });

    assert.equal(add.called, false, 'no action is written without an actor');
  });
});

// Which actor a gift link's history records for each way into the Admin API. The reading
// of the context itself is the shared `readFrameIdentity`; this pins only the narrowing.
describe('Unit: gift-links actingContext', function () {
  it('records a signed-in user', function () {
    assert.deepEqual(actingContext({ user: 'user-id', integration: null, api_key: null }), {
      actor: { id: 'user-id', type: 'user' },
    });
  });

  it('records a staff token as its user', function () {
    assert.deepEqual(
      actingContext({ user: 'user-id', integration: null, api_key: { id: 'key-id' } }),
      { actor: { id: 'user-id', type: 'user' } },
    );
  });

  it('records an integration, before any user the context also names', function () {
    assert.deepEqual(
      actingContext({
        user: 'user-id',
        integration: { id: 'integration-id' },
        api_key: { id: 'key-id' },
      }),
      { actor: { id: 'integration-id', type: 'integration' } },
    );
  });

  it('records nobody for a request that is neither', function () {
    assert.deepEqual(actingContext({ internal: true }), { actor: null });
    assert.deepEqual(actingContext(undefined), { actor: null });
  });
});
