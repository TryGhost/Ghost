import assert from 'node:assert/strict';
import sinon from 'sinon';

const logging = require('@tryghost/logging');
const { agentProvider } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const jobsService = require('../../../core/server/services/jobs');
const membersService = require('../../../core/server/services/members');
const stripeService = require('../../../core/server/services/stripe');

const JOB_NAME = 'members-migrations';
const STALE = new Date('2020-01-01T00:00:00Z');

describe('Members migrations on boot', function () {
  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('records a finished job row on a fresh boot', async function () {
    const job = await models.Job.findOne({ name: JOB_NAME });

    assert.ok(job, 'expected a members-migrations row to be written during boot');
    assert.equal(job.get('status'), 'finished');
    assert.ok(job.get('started_at') instanceof Date);
    assert.ok(job.get('finished_at') instanceof Date);
  });

  describe('when the members service initialises again', function () {
    let jobId: string;

    beforeEach(async function () {
      const job = await models.Job.findOne({ name: JOB_NAME });
      jobId = job.id;
      await models.Job.edit(
        { status: 'finished', started_at: STALE, finished_at: STALE },
        { id: jobId },
      );
    });

    it('skips the migrations and writes nothing when the row already exists', async function () {
      const execute = sinon.stub(stripeService.migrations, 'execute').resolves();
      const add = sinon.spy(models.Job, 'add');
      const edit = sinon.spy(models.Job, 'edit');

      await membersService.init();

      sinon.assert.notCalled(execute);
      sinon.assert.notCalled(add);
      sinon.assert.notCalled(edit);
    });

    it('re-runs the migrations and updates the row in place when the previous run failed', async function () {
      await models.Job.edit({ status: 'failed' }, { id: jobId });
      const execute = sinon.stub(stripeService.migrations, 'execute').resolves();
      const add = sinon.spy(models.Job, 'add');
      const addOneOffJob = sinon.spy(jobsService, 'addOneOffJob');
      const awaitOneOffCompletion = sinon.spy(jobsService, 'awaitOneOffCompletion');

      await membersService.init();

      sinon.assert.calledOnce(execute);
      sinon.assert.notCalled(add);
      sinon.assert.notCalled(addOneOffJob);
      sinon.assert.notCalled(awaitOneOffCompletion);

      const after = await models.Job.findOne({ name: JOB_NAME });
      assert.equal(after.id, jobId);
      assert.equal(after.get('status'), 'finished');
      assert.ok(after.get('started_at') > STALE, 'expected started_at to be rewritten');
      assert.ok(after.get('finished_at') >= after.get('started_at'));
    });

    it('marks the row failed and keeps booting when the migrations throw', async function () {
      await models.Job.edit({ status: 'failed' }, { id: jobId });
      sinon.stub(stripeService.migrations, 'execute').rejects(new Error('stripe exploded'));
      const loggingError = sinon.stub(logging, 'error');

      await membersService.init();

      sinon.assert.calledWithMatch(
        loggingError,
        sinon.match.has('message', 'stripe exploded'),
        /members-migrations failed after \d+ms/,
      );

      const after = await models.Job.findOne({ name: JOB_NAME });
      assert.equal(after.id, jobId);
      assert.equal(after.get('status'), 'failed');
      assert.ok(after.get('started_at') > STALE, 'expected the failed run to rewrite the row');
      assert.ok(after.get('finished_at') >= after.get('started_at'));
    });
  });
});
