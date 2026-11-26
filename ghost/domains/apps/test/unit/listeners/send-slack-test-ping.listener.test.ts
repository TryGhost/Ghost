import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Site } from '#support/site';
import sendSlackTestPing from '../../../listeners/send-slack-test-ping.listener';
import { SlackPing } from '../../../services/slack-ping.service';

describe('Send a Slack test ping', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('pings with the test message and hands back the delivery', function () {
    const delivery = Promise.resolve();
    const ping = sinon.stub(SlackPing.prototype, 'ping').returns(delivery);

    assert.equal(sendSlackTestPing({ log: {} } as Site), delivery);

    sinon.assert.calledOnceWithExactly(ping, {
      message:
        'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
    });
  });
});
