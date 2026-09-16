import assert from 'node:assert/strict';
import sinon from 'sinon';

const JOBS_PATH = '../../../../../core/server/services/email-analytics/jobs';

describe('email analytics scheduler initialization', function () {
  let init: typeof import('../../../../../core/server/services/email-analytics/jobs').init;

  // The module keeps the scheduler in module state and the unit project shares
  // modules across files, so evict it around each test rather than leak an
  // instance built on stubs into whichever file runs next in this worker.
  beforeEach(function () {
    delete require.cache[require.resolve(JOBS_PATH)];
    init = require(JOBS_PATH).init;
  });

  afterEach(function () {
    delete require.cache[require.resolve(JOBS_PATH)];
  });

  it('retains the concrete scheduler and its dependencies across initialization', async function () {
    const dependencies = {
      models: {
        Email: { where: sinon.stub() },
        AutomatedEmailRecipient: { query: sinon.stub() },
        GiftDelivery: { query: sinon.stub() },
      },
      config: { get: sinon.stub().returns(true) },
      jobsService: { scheduleRecurring: sinon.stub().resolves() },
    };
    const laterJobsService = { scheduleRecurring: sinon.stub().resolves() };
    const scheduler = init(dependencies);
    assert.equal(init({ ...dependencies, jobsService: laterJobsService }), scheduler);

    await scheduler.scheduleRecurringNewslettersJob(true);

    sinon.assert.calledOnce(dependencies.jobsService.scheduleRecurring);
    sinon.assert.notCalled(laterJobsService.scheduleRecurring);
  });
});
