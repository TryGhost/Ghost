import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Site } from '#support/site';
import refreshRecommendationMetadata from '../../../jobs/refresh-recommendation-metadata.job';
import { RecommendationEnablerService } from '../../../services/recommendation-enabler.service';
import { RecommendationService } from '../../../services/recommendation.service';

describe('Refresh recommendation metadata job', function () {
  let update: sinon.SinonStub;
  let setting: sinon.SinonStub;

  function site(config: Record<string, unknown> = {}) {
    return { config: { get: (key: string) => config[key] }, log: {} } as unknown as Site;
  }

  beforeEach(function () {
    update = sinon
      .stub(RecommendationService.prototype, 'updateAllRecommendationsMetadata')
      .resolves();
    setting = sinon.stub(RecommendationEnablerService.prototype, 'getSetting').returns('true');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('refreshes every recommendation when the site shows recommendations', async function () {
    await refreshRecommendationMetadata(site());

    sinon.assert.calledOnceWithExactly(update);
  });

  it('does nothing when the site does not show recommendations', async function () {
    setting.returns('false');

    await refreshRecommendationMetadata(site());

    sinon.assert.notCalled(update);
  });

  it('does nothing when background refreshes are turned off in config', async function () {
    await refreshRecommendationMetadata(site({ 'services:recommendations:enabled': false }));

    sinon.assert.notCalled(update);
    sinon.assert.notCalled(setting);
  });

  it('lets a failure reach the job runner', async function () {
    const failure = new Error('database unavailable');
    update.rejects(failure);

    await assert.rejects(refreshRecommendationMetadata(site()), (thrown) => thrown === failure);
  });
});
