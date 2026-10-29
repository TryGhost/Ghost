const assert = require('node:assert/strict');
const logging = require('@tryghost/logging');
const sinon = require('sinon');
const TwitterOEmbedProvider = require('../../../../../core/server/services/oembed/twitter-oembed-provider');
const externalRequest = require('../../../../../core/server/lib/request-external');
const nock = require('nock');
const { mockManager } = require('../../../../utils/e2e-framework');
const { HTTPError } = require('got');

describe('TwitterOEmbedProvider', function () {
  beforeAll(async function () {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    // external requests will attempt dns lookup
    mockManager.disableNetwork();
  });

  afterEach(async function () {
    mockManager.restore();
  });

  function nockOembedRequest() {
    nock('https://publish.twitter.com')
      .get('/oembed')
      .query(true)
      .reply(200, {
        data: {
          conversation_id: '1630581157568839683',
          public_metrics: {
            retweet_count: 6,
            reply_count: 1,
            like_count: 27,
          },
        },
        includes: {
          verified: false,
          description: 'some description',
          location: 'someplace, somewhere',
        },
      });
  }

  it('Can support requests for Twitter URLs', async function () {
    const provider = new TwitterOEmbedProvider();
    const tweetURL = new URL('https://twitter.com/Ghost/status/1630581157568839683');

    const supportsRequest = await provider.canSupportRequest(tweetURL);
    assert(supportsRequest, 'Should support Twitter URL');
  });

  it('Can support requests for X.com URLs', async function () {
    const provider = new TwitterOEmbedProvider();
    const tweetURL = new URL('https://x.com/Ghost/status/1630581157568839683');

    const supportsRequest = await provider.canSupportRequest(tweetURL);
    assert(supportsRequest, 'Should support X (Twitter) URL');
  });

  const TWEET_QUERY = {
    expansions: [
      'attachments.poll_ids',
      'attachments.media_keys',
      'author_id',
      'entities.mentions.username',
      'geo.place_id',
      'in_reply_to_user_id',
      'referenced_tweets.id',
      'referenced_tweets.id.author_id',
    ].join(','),
    'media.fields': [
      'duration_ms',
      'height',
      'media_key',
      'preview_image_url',
      'type',
      'url',
      'width',
      'public_metrics',
      'alt_text',
    ].join(','),
    'place.fields': [
      'contained_within',
      'country',
      'country_code',
      'full_name',
      'geo',
      'id',
      'name',
      'place_type',
    ].join(','),
    'poll.fields': ['duration_minutes', 'end_datetime', 'id', 'options', 'voting_status'].join(','),
    'tweet.fields': [
      'attachments',
      'author_id',
      'context_annotations',
      'conversation_id',
      'created_at',
      'entities',
      'geo',
      'id',
      'in_reply_to_user_id',
      'lang',
      'public_metrics',
      'possibly_sensitive',
      'referenced_tweets',
      'reply_settings',
      'source',
      'text',
      'withheld',
    ].join(','),
    'user.fields': [
      'created_at',
      'description',
      'entities',
      'id',
      'location',
      'name',
      'pinned_tweet_id',
      'profile_image_url',
      'protected',
      'public_metrics',
      'url',
      'username',
      'verified',
      'withheld',
    ].join(','),
  };

  const baseEmbed = {
    type: 'rich',
    version: '1.0',
    html: '<blockquote class="twitter-tweet">Tweet</blockquote>',
    author_name: 'Ghost',
  };

  function trackedRequest() {
    const request = sinon.spy(externalRequest);
    request.fetch = sinon.spy(externalRequest.fetch);
    return request;
  }

  it('adds tweet data from the Twitter API with the bearer token to the base embed', async function () {
    const provider = new TwitterOEmbedProvider({
      config: {
        bearerToken: 'test',
      },
    });
    const tweetURL = new URL('https://twitter.com/Ghost/status/1630581157568839683');
    nock('https://publish.twitter.com')
      .get('/oembed')
      .query((query) => query.url === tweetURL.href)
      .reply(200, baseEmbed);
    const api = nock('https://api.twitter.com', {
      reqheaders: { authorization: 'Bearer test' },
    })
      .get('/2/tweets/1630581157568839683')
      .query((query) => {
        // nock parses the query into a null-prototype object
        assert.deepEqual({ ...query }, TWEET_QUERY);
        return true;
      })
      .reply(200, {
        data: { id: '1630581157568839683', text: 'Hello' },
        includes: { users: [{ id: '1', username: 'Ghost' }] },
      });
    const request = trackedRequest();

    const oembedData = await provider.getOEmbedData(tweetURL, request);

    assert.equal(api.isDone(), true);
    // The provider endpoint goes through the injected client's fetch, the API through the client
    sinon.assert.calledOnce(request.fetch);
    assert.match(request.fetch.firstCall.args[0], /^https:\/\/publish\.twitter\.com\/oembed\?/);
    sinon.assert.calledOnce(request);
    assert.deepEqual(oembedData, {
      ...baseEmbed,
      type: 'twitter',
      tweet_data: {
        id: '1630581157568839683',
        text: 'Hello',
        includes: { users: [{ id: '1', username: 'Ghost' }] },
      },
    });
  });

  it('returns the base embed without an API request when no bearer token is configured', async function () {
    const provider = new TwitterOEmbedProvider({ config: {} });
    const tweetURL = new URL('https://twitter.com/Ghost/status/1630581157568839683');
    nock('https://publish.twitter.com').get('/oembed').query(true).reply(200, baseEmbed);
    const request = trackedRequest();
    const loggingStub = sinon.stub(logging, 'error');

    const oembedData = await provider.getOEmbedData(tweetURL, request);

    assert.deepEqual(oembedData, { ...baseEmbed, type: 'twitter' });
    sinon.assert.calledOnce(request.fetch);
    sinon.assert.notCalled(request);
    sinon.assert.notCalled(loggingStub);
  });

  it('requests x.com posts from the twitter.com endpoints', async function () {
    const provider = new TwitterOEmbedProvider({ config: { bearerToken: 'test' } });
    nock('https://publish.twitter.com')
      .get('/oembed')
      .query((query) => query.url === 'https://twitter.com/Ghost/status/1630581157568839683')
      .reply(200, baseEmbed);
    const api = nock('https://api.twitter.com')
      .get('/2/tweets/1630581157568839683')
      .query(true)
      .reply(200, { data: { id: '1630581157568839683' } });

    const oembedData = await provider.getOEmbedData(
      new URL('https://x.com/Ghost/status/1630581157568839683'),
      externalRequest,
    );

    assert.equal(api.isDone(), true);
    assert.equal(oembedData.type, 'twitter');
    assert.equal(oembedData.tweet_data.id, '1630581157568839683');
  });

  it('logs error with context when external request fails', async function () {
    const provider = new TwitterOEmbedProvider({
      config: {
        bearerToken: 'test',
      },
    });
    const tweetURL = new URL('https://twitter.com/Ghost/status/1630581157568839683');

    nockOembedRequest();

    nock('https://api.twitter.com').get('/2/tweets/1630581157568839683').query(true).reply(403, {
      client_id: '12345',
      detail: 'Testing requests are forbidden!',
      reason: 'thou-shalt-not-pass',
    });

    const loggingStub = sinon.stub(logging, 'error');

    await provider.getOEmbedData(tweetURL, externalRequest);

    sinon.assert.calledOnce(loggingStub);
    sinon.assert.calledWithMatch(
      loggingStub,
      sinon.match.instanceOf(HTTPError).and(
        sinon.match.has('context', {
          client_id: '12345',
          detail: 'Testing requests are forbidden!',
          reason: 'thou-shalt-not-pass',
        }),
      ),
    );
  });
});
