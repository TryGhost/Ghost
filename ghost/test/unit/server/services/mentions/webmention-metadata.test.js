const assert = require('node:assert/strict');
const sinon = require('sinon');

const oembedService = require('../../../../../core/server/services/oembed');
const WebmentionMetadata = require('../../../../../core/server/services/mentions/webmention-metadata');

describe('WebmentionMetadata', function () {
  afterEach(function () {
    sinon.restore();
  });

  const oembedResponse = {
    metadata: {
      publisher: 'Source Site',
      title: 'Source Title',
      description: 'Source excerpt',
      author: 'Source Author',
      thumbnail: 'https://source.example/image.png',
      icon: 'https://source.example/favicon.ico',
    },
    body: '<p>Source body</p>',
    contentType: 'text/html',
  };

  it('fetches mention metadata through the oEmbed service and maps the response', async function () {
    const fetchStub = sinon.stub(oembedService, 'fetchOembedDataFromUrl').resolves(oembedResponse);
    const fetchPageHtml = sinon.stub(oembedService, 'fetchPageHtml');
    const webmentionMetadata = new WebmentionMetadata({ oembedService });

    const result = await webmentionMetadata.fetch(new URL('https://source.example/post/'));

    sinon.assert.calledOnce(fetchStub);
    assert.equal(fetchStub.firstCall.args[0], 'https://source.example/post/');
    assert.equal(fetchStub.firstCall.args[1], 'mention');
    assert.deepEqual(fetchStub.firstCall.args[2].timeout, { request: 15000 });
    assert.deepEqual(fetchStub.firstCall.args[2].retry, { limit: 3 });
    assert.deepEqual(result, {
      siteTitle: 'Source Site',
      title: 'Source Title',
      excerpt: 'Source excerpt',
      author: 'Source Author',
      image: new URL('https://source.example/image.png'),
      favicon: new URL('https://source.example/favicon.ico'),
      body: '<p>Source body</p>',
      contentType: 'text/html',
    });
    sinon.assert.notCalled(fetchPageHtml);
  });

  it('returns null image and favicon when the oEmbed response has none', async function () {
    sinon.stub(oembedService, 'fetchOembedDataFromUrl').resolves({
      ...oembedResponse,
      metadata: { ...oembedResponse.metadata, thumbnail: null, icon: undefined },
    });
    const webmentionMetadata = new WebmentionMetadata({ oembedService });

    const result = await webmentionMetadata.fetch(new URL('https://source.example/post/'));

    assert.equal(result.image, null);
    assert.equal(result.favicon, null);
  });

  it('maps the URL through every matching mapper and verifies against the original page', async function () {
    const fetchStub = sinon.stub(oembedService, 'fetchOembedDataFromUrl').resolves(oembedResponse);
    const fetchPageHtml = sinon.stub(oembedService, 'fetchPageHtml').resolves({
      body: '<p>Original body</p>',
      contentType: 'text/html; charset=utf-8',
    });
    const webmentionMetadata = new WebmentionMetadata({ oembedService });
    const original = new URL('https://source.example/.well-known/recommendations.json');
    // Mappers run until none matches, so a mapped URL is mapped again.
    webmentionMetadata.addMapper((url) => {
      if (url.pathname.endsWith('/recommendations.json')) {
        return new URL('https://source.example/.well-known/');
      }
    });
    webmentionMetadata.addMapper((url) => {
      if (url.pathname === '/.well-known/') {
        return new URL('https://source.example/');
      }
    });

    const result = await webmentionMetadata.fetch(original);

    assert.equal(fetchStub.firstCall.args[0], 'https://source.example/');
    sinon.assert.calledOnce(fetchPageHtml);
    assert.equal(fetchPageHtml.firstCall.args[0], original);
    assert.deepEqual(fetchPageHtml.firstCall.args[1].timeout, { request: 15000 });
    assert.deepEqual(fetchPageHtml.firstCall.args[1].retry, { limit: 3 });
    assert.equal(result.title, 'Source Title');
    assert.equal(result.body, '<p>Original body</p>');
    assert.equal(result.contentType, 'text/html; charset=utf-8');
  });

  it('tags a failed verification page fetch with its transient classification', async function () {
    sinon.stub(oembedService, 'fetchOembedDataFromUrl').resolves(oembedResponse);
    const error = new Error('Service Unavailable');
    error.response = { statusCode: 503 };
    sinon.stub(oembedService, 'fetchPageHtml').rejects(error);
    const webmentionMetadata = new WebmentionMetadata({ oembedService });
    webmentionMetadata.addMapper((url) => {
      if (url.pathname === '/post/') {
        return new URL('https://source.example/');
      }
    });

    await assert.rejects(
      () => webmentionMetadata.fetch(new URL('https://source.example/post/')),
      (err) => {
        assert.equal(err, error);
        assert.equal(err.transient, true);
        return true;
      },
    );
  });

  it('passes a transient fetch error classifier to the oEmbed service', async function () {
    const error = new Error('Too Many Requests');
    error.response = {
      statusCode: 429,
    };

    const fetchStub = sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
    const webmentionMetadata = new WebmentionMetadata({ oembedService });

    await assert.rejects(
      () => webmentionMetadata.fetch(new URL('https://example.com')),
      (err) => {
        assert.equal(err, error);
        assert.equal(err.transient, true);
        return true;
      },
    );

    const options = fetchStub.firstCall.args[2];
    assert.equal(options.shouldRethrowFetchError(error), true);
  });

  it('tags 503 fetch errors with got response shape as transient', async function () {
    const error = new Error('Service Unavailable');
    error.response = {
      statusCode: 503,
    };

    sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
    const webmentionMetadata = new WebmentionMetadata({ oembedService });

    await assert.rejects(
      () => webmentionMetadata.fetch(new URL('https://example.com')),
      (err) => {
        assert.equal(err.transient, true);
        return true;
      },
    );
  });

  it('tags timeout fetch errors as transient', async function () {
    const error = new Error('Timeout awaiting request');
    error.name = 'TimeoutError';

    sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
    const webmentionMetadata = new WebmentionMetadata({ oembedService });

    await assert.rejects(
      () => webmentionMetadata.fetch(new URL('https://example.com')),
      (err) => {
        assert.equal(err.transient, true);
        return true;
      },
    );
  });

  it('does not tag hard fetch errors as transient', async function () {
    const error = new Error('Not Found');
    error.response = {
      statusCode: 404,
    };

    sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
    const webmentionMetadata = new WebmentionMetadata({ oembedService });

    await assert.rejects(
      () => webmentionMetadata.fetch(new URL('https://example.com')),
      (err) => {
        assert.equal(err.transient, false);
        return true;
      },
    );
  });
});
