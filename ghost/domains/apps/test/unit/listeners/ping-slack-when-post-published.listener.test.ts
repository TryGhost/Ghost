import assert from 'node:assert/strict';
import sinon from 'sinon';
import pingSlackWhenPostPublished from '../../../listeners/ping-slack-when-post-published.listener';
import { SlackPing } from '../../../services/slack-ping.service';
import type { SlackPingService } from '../../../services/slack-ping.service';

function createPostModel(post: Record<string, unknown>, authors: unknown[], tags: unknown[]) {
  return {
    toJSON: () => post,
    related: (relation: string) => ({
      toJSON: () => (relation === 'authors' ? authors : relation === 'tags' ? tags : []),
    }),
  };
}

describe('Ping Slack when a post is published', function () {
  const post = { id: 'post-id', slug: 'a-post', title: 'A post', html: '<p>Hello.</p>' };
  const author = { id: 'author-id', name: 'An author' };
  const tag = { id: 'tag-id', slug: 'a-tag' };
  let ping: sinon.SinonStub;
  const handle = (model: ReturnType<typeof createPostModel>, options?: { importing?: boolean }) =>
    pingSlackWhenPostPublished.handle(
      { slackPing: { ping } as unknown as SlackPingService },
      model,
      options,
    );

  beforeEach(function () {
    ping = sinon.stub();
  });

  it('reacts to post.published with the Slack ping service', function () {
    assert.equal(pingSlackWhenPostPublished.event, 'post.published');
    assert.deepEqual(pingSlackWhenPostPublished.needs, { slackPing: SlackPing });
  });

  // Tags must reach the URL service so it can evaluate collection filters
  // like `tag:foo` when resolving the post URL.
  it('pings with the post and its related authors and tags', function () {
    handle(createPostModel(post, [author], [tag]));

    sinon.assert.calledOnceWithExactly(ping, { ...post, authors: [author], tags: [tag] });
  });

  it('does not ping when the post is being imported', function () {
    handle(createPostModel(post, [author], [tag]), { importing: true });

    sinon.assert.notCalled(ping);
  });

  it('pings when the event carries options that are not an import', function () {
    handle(createPostModel(post, [], []), {});

    sinon.assert.calledOnce(ping);
  });

  it('lets a failure to start the ping reach whoever emitted the event', function () {
    const failure = new Error('Transport threw synchronously');
    ping.throws(failure);

    assert.throws(
      () => handle(createPostModel(post, [], [])),
      (error) => error === failure,
    );
  });
});
