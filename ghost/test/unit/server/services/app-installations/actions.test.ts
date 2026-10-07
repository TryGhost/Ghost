import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  actingContext,
  recordAppInstallationAction,
  type RecordAppInstallationAction,
} from '../../../../../core/server/services/app-installations/actions';

const input: Parameters<RecordAppInstallationAction>[0] = {
  context: { actor: { id: 'staff-id', type: 'user' } },
  event: 'installed',
  subject: 'installation-id',
  details: { primary_name: 'Podcast', app_id: 'com.example.podcast' },
};

describe('recordAppInstallationAction', function () {
  it('records the staff action without logging a successful write', async function () {
    const add = sinon.stub().resolves();
    const error = sinon.stub();

    await recordAppInstallationAction({ ...input, Action: { add }, logging: { error } });

    sinon.assert.calledOnceWithExactly(
      add,
      {
        event: 'installed',
        resource_type: 'app_installation',
        resource_id: input.subject,
        actor_type: 'user',
        actor_id: 'staff-id',
        context: input.details,
      },
      { autoRefresh: false },
    );
    sinon.assert.notCalled(error);
  });

  it('logs a failed write through the supplied logger and still resolves', async function () {
    const failure = new Error('History write failed');
    const add = sinon.stub().rejects(failure);
    const error = sinon.stub();

    await assert.doesNotReject(
      recordAppInstallationAction({ ...input, Action: { add }, logging: { error } }),
    );

    sinon.assert.calledOnceWithExactly(error, failure);
  });

  it('does not record or log an action without a staff actor', async function () {
    const add = sinon.stub().resolves();
    const error = sinon.stub();

    await recordAppInstallationAction({
      ...input,
      context: { actor: null },
      Action: { add },
      logging: { error },
    });

    sinon.assert.notCalled(add);
    sinon.assert.notCalled(error);
  });
});

// Which actor an installation's history records for each way into the Admin API. The
// reading of the context itself is the shared `readFrameIdentity`; this pins only the
// narrowing: a staff user, and nobody else.
describe('Unit: app-installations actingContext', function () {
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

  it('records nobody for an integration', function () {
    assert.deepEqual(
      actingContext({
        user: null,
        integration: { id: 'integration-id' },
        api_key: { id: 'key-id' },
      }),
      { actor: null },
    );
  });

  it('records nobody when the context names a user alongside an integration', function () {
    assert.deepEqual(actingContext({ user: 'user-id', integration: { id: 'integration-id' } }), {
      actor: null,
    });
  });

  it('records nobody for a request that is neither', function () {
    assert.deepEqual(actingContext({ internal: true }), { actor: null });
    assert.deepEqual(actingContext(undefined), { actor: null });
  });
});
