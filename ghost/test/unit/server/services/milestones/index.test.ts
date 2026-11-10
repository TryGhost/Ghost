import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import milestonesService from '../../../../../core/server/services/milestones';
// @ts-expect-error This module lacks type definitions.
import slackNotifications from '../../../../../core/server/services/milestones/slack-notifications';

describe('Milestones Service', function () {
  afterEach(function () {
    sinon.restore();
    milestonesService.api = null;
  });

  it('Provides expected public API', function () {
    assert.ok(milestonesService.initAndRun);
  });

  it('starts Slack notifications once when first initialized', async function () {
    const slackInit = sinon.stub(slackNotifications, 'init');
    milestonesService.api = null;

    await milestonesService.init();
    await milestonesService.init();

    assert.ok(milestonesService.api);
    sinon.assert.calledOnce(slackInit);
  });
});
