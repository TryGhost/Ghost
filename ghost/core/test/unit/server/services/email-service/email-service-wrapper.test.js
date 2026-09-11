const assert = require('node:assert/strict');
const sinon = require('sinon');
const url = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const logging = require('@tryghost/logging');
const EmailServiceWrapper = require('../../../../../core/server/services/email-service/email-service-wrapper');
const membersService = require('../../../../../core/server/services/members');
const configUtils = require('../../../../utils/config-utils');

describe('EmailServiceWrapper getPostUrl', function () {
  afterEach(function () {
    sinon.restore();
  });

  function fakePost(type) {
    return {
      id: 'resource-id',
      toJSON: () => ({ id: 'resource-id', slug: 'a-slug', status: 'published', type }),
    };
  }

  it('routes a page as a page, not a post', function () {
    // The URL service routes by resource type; a page mis-typed as a post
    // matches no post collection and 404s.
    const forPost = sinon.stub(url, 'forPost');

    new EmailServiceWrapper().getPostUrl(fakePost('page'));

    assert.equal(forPost.getCall(0).args[3], 'pages');
  });

  it('routes a post as a post', function () {
    const forPost = sinon.stub(url, 'forPost');

    new EmailServiceWrapper().getPostUrl(fakePost('post'));

    assert.equal(forPost.getCall(0).args[3], 'posts');
  });
});

describe('EmailServiceWrapper member counter preparation config', function () {
  const batchSendingPath =
    require.resolve('../../../../../core/server/services/email-service/batch-sending-service');
  const originalBatchSending = require.cache[batchSendingPath];
  let captured;

  beforeEach(function () {
    captured = undefined;
    // The unit suite shares one module registry, so the fake is swapped in for
    // the duration of the test and put back exactly as it was found.
    require.cache[batchSendingPath] = {
      id: batchSendingPath,
      filename: batchSendingPath,
      loaded: true,
      exports: class FakeBatchSendingService {
        constructor(options) {
          captured = options;
        }
      },
    };
    sinon.stub(membersService, 'api').get(() => ({ members: {} }));
  });

  afterEach(async function () {
    if (originalBatchSending) {
      require.cache[batchSendingPath] = originalBatchSending;
    } else {
      delete require.cache[batchSendingPath];
    }
    sinon.restore();
    await configUtils.restore();
  });

  it('boots with preparation off and a warning when batch processing is not enabled', function () {
    // Config is boundary data: the mismatch has to be visible without taking
    // the whole site down over a newsletter counter flag.
    const warn = sinon.stub(logging, 'warn');
    configUtils.set({
      emailAnalytics: { memberCounterPreparation: true, batchProcessing: false },
    });

    new EmailServiceWrapper().init();

    assert.equal(captured.memberCounterPreparation, false);
    assert.equal(warn.callCount, 1);
    assert.match(warn.getCall(0).args[0], /memberCounterPreparation requires .*batchProcessing/);
  });

  it('hands preparation to batch sending when both flags are enabled', function () {
    const warn = sinon.stub(logging, 'warn');
    configUtils.set({
      emailAnalytics: { memberCounterPreparation: true, batchProcessing: true },
    });

    new EmailServiceWrapper().init();

    assert.equal(captured.memberCounterPreparation, true);
    assert.equal(warn.callCount, 0);
  });
});
