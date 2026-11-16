import assert from 'node:assert/strict';
import sinon from 'sinon';

const root = require('../../../transition/services/oembed').default;
const { fetchExternalPageHtml } = require('../../../actions/fetch-external-page-html.action');

describe('fetchExternalPageHtml', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('returns the page as plain data from the service read when it is called', async function () {
    const fetchPageHtml = sinon.stub().resolves({
      url: 'https://example.com/final',
      body: '<p>Hello</p>',
      contentType: 'text/html; charset=utf-8',
      headers: { 'set-cookie': 'not passed on' },
    });
    sinon.stub(root, 'service').get(() => ({ fetchPageHtml }));

    assert.deepEqual(await fetchExternalPageHtml('https://example.com/'), {
      url: 'https://example.com/final',
      body: '<p>Hello</p>',
      contentType: 'text/html; charset=utf-8',
    });
    sinon.assert.calledOnceWithExactly(fetchPageHtml, 'https://example.com/');
  });

  it('passes timeout and retry on when they are given', async function () {
    const fetchPageHtml = sinon.stub().resolves({ url: 'u', body: 'b', contentType: undefined });
    sinon.stub(root, 'service').get(() => ({ fetchPageHtml }));
    const options = { timeout: { request: 15000 }, retry: { limit: 3 } };

    await fetchExternalPageHtml('https://example.com/', options);

    sinon.assert.calledOnceWithExactly(fetchPageHtml, 'https://example.com/', options);
  });
});
