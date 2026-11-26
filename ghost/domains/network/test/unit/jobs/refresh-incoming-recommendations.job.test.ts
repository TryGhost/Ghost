import sinon from 'sinon';
import type { Site } from '#support/site';
import refreshIncomingRecommendations from '../../../jobs/refresh-incoming-recommendations.job';
import { IncomingRecommendationService } from '../../../services/incoming-recommendation.service';

describe('Refresh incoming recommendations job', function () {
  let refresh: sinon.SinonStub;

  function site(config: Record<string, unknown> = {}) {
    return { config: { get: (key: string) => config[key] }, log: {} } as unknown as Site;
  }

  beforeEach(function () {
    refresh = sinon.stub(IncomingRecommendationService.prototype, 'refreshAll').resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('checks every incoming recommendation again', async function () {
    await refreshIncomingRecommendations(site());

    sinon.assert.calledOnceWithExactly(refresh);
  });

  it('does nothing when background refreshes are turned off in config', async function () {
    await refreshIncomingRecommendations(site({ 'services:recommendations:enabled': false }));

    sinon.assert.notCalled(refresh);
  });
});
