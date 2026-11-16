import assert from 'node:assert/strict';
import sinon from 'sinon';
import { definitionKind } from '../../../../../core/kernel/domains/definitions';

const root = require('../../../services/recommendations').default;
const job = require('../../../jobs/refresh-incoming-recommendations.job').default;

describe('refresh-incoming-recommendations job', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('runs once after boot, fifteen seconds to a little over five minutes in', function () {
    assert.equal(definitionKind(job), 'job');
    assert.equal(job.schedule.once, 'boot');
    sinon.stub(Math, 'random').returns(0);
    assert.equal(job.schedule.delay(), 15 * 1000);
    sinon.restore();
    sinon.stub(Math, 'random').returns(1);
    assert.equal(job.schedule.delay(), 15 * 1000 + 5 * 60 * 1000);
  });

  it('asks the recommendations root, read when the job runs, to refresh incoming recommendations', async function () {
    const refreshIncomingRecommendations = sinon.stub().resolves();
    sinon.stub(root, 'service').get(() => ({ refreshIncomingRecommendations }));

    await job.run();

    sinon.assert.calledOnce(refreshIncomingRecommendations);
  });
});
