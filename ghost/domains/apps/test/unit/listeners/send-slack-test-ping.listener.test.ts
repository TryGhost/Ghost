import assert from 'node:assert/strict';
import sinon from 'sinon';
import sendSlackTestPing from '../../../listeners/send-slack-test-ping.listener';
import { SlackPing } from '../../../services/slack-ping.service';
import type { SlackPingService } from '../../../services/slack-ping.service';

describe('Send a Slack test ping', function () {
  it('reacts to slack.test with the Slack ping service', function () {
    assert.equal(sendSlackTestPing.event, 'slack.test');
    assert.deepEqual(sendSlackTestPing.needs, { slackPing: SlackPing });
  });

  it('pings with the test message', function () {
    const ping = sinon.stub();

    sendSlackTestPing.handle({ slackPing: { ping } as unknown as SlackPingService });

    sinon.assert.calledOnceWithExactly(ping, {
      message:
        'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
    });
  });
});
