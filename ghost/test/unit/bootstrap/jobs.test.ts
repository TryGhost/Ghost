import assert from 'node:assert/strict';
import sinon from 'sinon';
import { jobClass, jobsFor } from '../../../bootstrap/jobs';
import { Job } from '../../../core/server/services/jobs-service/job';

describe("The application's jobs", function () {
  function jobsService() {
    return { handle: sinon.stub(), scheduleRecurring: sinon.stub().resolves() };
  }

  it('names a job to the jobs service by a class that carries the name', function () {
    const Named = jobClass('bootstrap-test-job');

    assert.equal(Named.type, 'bootstrap-test-job');
    assert.ok(new Named(undefined as never) instanceof Job);
    assert.equal(jobClass('bootstrap-test-job'), Named);
  });

  it('registers a handler that runs the job and waits for it', async function () {
    const service = jobsService();
    const run = sinon.stub().resolves('ignored');

    jobsFor(service as never).handle('bootstrap-test-job', run);

    sinon.assert.calledOnceWithExactly(
      service.handle,
      jobClass('bootstrap-test-job'),
      sinon.match.func,
    );
    assert.equal(await service.handle.firstCall.args[1](), undefined);
    sinon.assert.calledOnceWithExactly(run);
  });

  it('lets a job that fails reach the jobs service', async function () {
    const service = jobsService();
    const failure = new Error('job failed');

    jobsFor(service as never).handle('bootstrap-test-job', () => Promise.reject(failure));

    await assert.rejects(service.handle.firstCall.args[1](), (thrown) => thrown === failure);
  });

  it('schedules a recurring job by its class and cron', async function () {
    const service = jobsService();

    await jobsFor(service as never).scheduleRecurring('bootstrap-test-job', {
      cron: '0 0 3 * * *',
    });

    sinon.assert.calledOnce(service.scheduleRecurring);
    const [job, schedule] = service.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof jobClass('bootstrap-test-job'));
    assert.deepEqual(schedule, { cron: '0 0 3 * * *' });
  });
});
