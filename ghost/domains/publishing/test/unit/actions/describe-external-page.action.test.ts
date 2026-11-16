import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';

const root = require('../../../transition/services/oembed').default;
const { describeExternalPage } = require('../../../actions/describe-external-page.action');

describe('describeExternalPage', function () {
  let fetchOembedDataFromUrl: sinon.SinonStub;

  beforeEach(function () {
    fetchOembedDataFromUrl = sinon.stub();
  });
  afterEach(function () {
    sinon.restore();
  });

  it('can be imported before the oEmbed service is ready, and fails only when called', async function () {
    sinon.stub(root, 'service').get(() => {
      throw new IncorrectUsageError({ message: 'OEmbed used before init().' });
    });
    await assert.rejects(describeExternalPage('https://example.com/'), IncorrectUsageError);
  });

  it('asks the service, read when it is called, and returns what it describes', async function () {
    const description = { version: '1.0', type: 'mention', metadata: { title: 'Example' } };
    fetchOembedDataFromUrl.resolves(description);
    sinon.stub(root, 'service').get(() => ({ fetchOembedDataFromUrl }));

    assert.equal(
      await describeExternalPage('https://example.com/', { type: 'mention' }),
      description,
    );
    // Called as the service's callers always called it: no third argument.
    sinon.assert.calledOnceWithExactly(fetchOembedDataFromUrl, 'https://example.com/', 'mention');
  });

  it('passes a timeout on when one is given', async function () {
    fetchOembedDataFromUrl.resolves(undefined);
    sinon.stub(root, 'service').get(() => ({ fetchOembedDataFromUrl }));

    assert.equal(
      await describeExternalPage('https://example.com/', {
        type: 'bookmark',
        timeout: { request: 2000 },
      }),
      undefined,
    );
    sinon.assert.calledOnceWithExactly(fetchOembedDataFromUrl, 'https://example.com/', 'bookmark', {
      timeout: { request: 2000 },
    });
  });
});
