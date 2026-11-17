import assert from 'node:assert/strict';
import sinon from 'sinon';
import { definitionKind } from '@tryghost/kernel/domains/definitions';

const root = require('../../../services/recommendations').default;
const job = require('../../../jobs/refresh-recommendation-metadata.job').default;

describe('refresh-recommendation-metadata job', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('runs once after boot, two to seven minutes in', function () {
    assert.equal(definitionKind(job), 'job');
    assert.equal(job.schedule.once, 'boot');
    sinon.stub(Math, 'random').returns(0);
    assert.equal(job.schedule.delay(), 2 * 60 * 1000);
    sinon.restore();
    sinon.stub(Math, 'random').returns(1);
    assert.equal(job.schedule.delay(), 7 * 60 * 1000);
  });

  it('asks the recommendations root, read when the job runs, to refresh metadata', async function () {
    const refreshRecommendationMetadata = sinon.stub().resolves();
    sinon.stub(root, 'service').get(() => ({ refreshRecommendationMetadata }));

    await job.run();

    sinon.assert.calledOnce(refreshRecommendationMetadata);
  });
});
