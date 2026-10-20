import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
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
