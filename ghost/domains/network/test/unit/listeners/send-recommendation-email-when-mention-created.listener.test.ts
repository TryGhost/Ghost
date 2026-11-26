import sinon from 'sinon';
import type { Site } from '#support/site';
import MentionCreatedEvent from '../../../events/mention-created.event';
import sendRecommendationEmailWhenMentionCreated from '../../../listeners/send-recommendation-email-when-mention-created.listener';
import { IncomingRecommendationService } from '../../../services/incoming-recommendation.service';

describe('Send a recommendation email when a mention is created', function () {
  const site = {
    log: { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() },
  } as unknown as Site;
  let send: sinon.SinonStub;

  beforeEach(function () {
    send = sinon
      .stub(IncomingRecommendationService.prototype, 'sendRecommendationEmail')
      .resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  function mention(source: string, verified: boolean) {
    return MentionCreatedEvent.create({ mention: { source: new URL(source), verified } });
  }

  it("emails staff when a verified mention comes from a site's recommendations file", async function () {
    const event = mention('https://other.example/.well-known/recommendations.json', true);

    await sendRecommendationEmailWhenMentionCreated(site, event);

    sinon.assert.calledOnceWithExactly(send, event.data.mention);
  });

  it('ignores a mention that has not been verified', async function () {
    await sendRecommendationEmailWhenMentionCreated(
      site,
      mention('https://other.example/.well-known/recommendations.json', false),
    );

    sinon.assert.notCalled(send);
  });

  it('ignores a mention that is not a recommendation', async function () {
    await sendRecommendationEmailWhenMentionCreated(
      site,
      mention('https://other.example/a-post/', true),
    );

    sinon.assert.notCalled(send);
  });
});
