import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  recordGiftLinkAction,
  type RequestContext,
} from '../../../../../core/server/services/gift-links/actions';
import { createLoggingFake } from '../../../../utils/logging-utils';

const CTX: RequestContext = { actor: { id: 'actor-id', type: 'user' } };

// Pins the parts not observable through the actions API: the best-effort contract and the
// no-actor short-circuit. The verb->event mapping is covered there as an outcome.
describe('Unit: recordGiftLinkAction', function () {
  let logging: ReturnType<typeof createLoggingFake>;

  beforeEach(function () {
    logging = createLoggingFake();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('does not propagate when the action recorder throws (logging instead)', async function () {
    const Action = {
      add: async () => {
        throw new Error('action write failed');
      },
    };

    await assert.doesNotReject(() =>
      recordGiftLinkAction({ Action, logging, context: CTX, verb: 'add', subject: 'post-id' }),
    );
    sinon.assert.calledOnce(logging.error);
  });

  it('records nothing when there is no actor', async function () {
    const add = sinon.stub().resolves();

    await recordGiftLinkAction({
      Action: { add },
      logging,
      context: { actor: null },
      verb: 'add',
      subject: 'post-id',
    });

    assert.equal(add.called, false, 'no action is written without an actor');
    sinon.assert.notCalled(logging.error);
  });
});
