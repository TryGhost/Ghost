import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Site } from '#support/site';
import pingSlackWhenPostPublished from '../../../listeners/ping-slack-when-post-published.listener';
import { SlackPing } from '../../../services/slack-ping.service';

function createPostModel(post: Record<string, unknown>, authors: unknown[], tags: unknown[]) {
  return {
    toJSON: () => post,
    related: (relation: string) => ({
      toJSON: () => (relation === 'authors' ? authors : relation === 'tags' ? tags : []),
    }),
  };
}

describe('Ping Slack when a post is published', function () {
  const site = { log: {} } as Site;
  const post = { id: 'post-id', slug: 'a-post', title: 'A post', html: '<p>Hello.</p>' };
  const author = { id: 'author-id', name: 'An author' };
  const tag = { id: 'tag-id', slug: 'a-tag' };
  let ping: sinon.SinonStub;

  beforeEach(function () {
    ping = sinon.stub(SlackPing.prototype, 'ping');
  });

  afterEach(function () {
    sinon.restore();
  });

  // Tags must reach the URL service so it can evaluate collection filters
  // like `tag:foo` when resolving the post URL.
  it("pings with the post and its related authors and tags, using the site's own logger", function () {
    pingSlackWhenPostPublished(site, createPostModel(post, [author], [tag]));

    sinon.assert.calledOnceWithExactly(ping, { ...post, authors: [author], tags: [tag] });
    assert.equal((ping.firstCall.thisValue as SlackPing).logging, site.log);
  });

  it('does not ping when the post is being imported', function () {
    pingSlackWhenPostPublished(site, createPostModel(post, [author], [tag]), { importing: true });

    sinon.assert.notCalled(ping);
  });

  it('pings when the event carries options that are not an import', function () {
    pingSlackWhenPostPublished(site, createPostModel(post, [], []), {});

    sinon.assert.calledOnce(ping);
  });

  it('hands back the delivery, so the application can log it if it fails', function () {
    const delivery = Promise.resolve();
    ping.returns(delivery);

    assert.equal(pingSlackWhenPostPublished(site, createPostModel(post, [], [])), delivery);
  });
});
