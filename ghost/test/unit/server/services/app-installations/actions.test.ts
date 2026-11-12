import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createLoggingFake } from '../../../../utils/logging-utils';
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
    const write = sinon.stub().resolves();
    const logging = createLoggingFake();

    await recordAppInstallationAction({ ...input, actionLog: { write }, logging });

    sinon.assert.calledOnceWithExactly(write, {
      event: 'installed',
      resource_type: 'app_installation',
      resource_id: input.subject,
      actor_type: 'user',
      actor_id: 'staff-id',
      context: input.details,
    });
    sinon.assert.notCalled(logging.error);
  });

  it('logs a failed write through the supplied logger and still resolves', async function () {
    const failure = new Error('History write failed');
    const write = sinon.stub().rejects(failure);
    const logging = createLoggingFake();

    await assert.doesNotReject(
      recordAppInstallationAction({ ...input, actionLog: { write }, logging }),
    );

    sinon.assert.calledOnceWithExactly(logging.error, failure);
  });

  it('does not record or log an action without a staff actor', async function () {
    const write = sinon.stub().resolves();
    const logging = createLoggingFake();

    await recordAppInstallationAction({
      ...input,
      context: { actor: null },
      actionLog: { write },
      logging,
    });

    sinon.assert.notCalled(write);
    sinon.assert.notCalled(logging.error);
  });
});
