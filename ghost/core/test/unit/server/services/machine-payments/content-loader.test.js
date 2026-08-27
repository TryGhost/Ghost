const assert = require('node:assert/strict');
const {
  ContentLoader,
} = require('../../../../../core/server/services/machine-payments/content-loader');

describe('Unit: server/services/machine-payments/content-loader', function () {
  it('returns null for non-purchasable entries', async function () {
    const postModel = {
      findOne: async () => ({
        toJSON: () => ({ id: '1', visibility: 'members', tiers: [] }),
      }),
    };
    const loader = new ContentLoader({
      postModel,
      urlServiceFacade: {
        getUrlForResource: () => 'http://example.com/post/',
      },
    });

    assert.equal(await loader.loadFullEntry('posts', '1'), null);
  });

  it('returns full entry for paid visibility', async function () {
    const postModel = {
      findOne: async () => ({
        toJSON: () => ({
          id: '1',
          visibility: 'paid',
          html: '<p>hi</p>',
          title: 'Hi',
        }),
      }),
    };
    const loader = new ContentLoader({
      postModel,
      urlServiceFacade: {
        getUrlForResource: () => 'http://example.com/post/',
      },
    });

    const entry = await loader.loadFullEntry('posts', '1');
    assert.equal(entry.visibility, 'paid');
    assert.equal(entry.url, 'http://example.com/post/');
    assert.equal(entry.type, 'post');
  });

  it('treats mixed free+paid tiers as not purchasable on the raw model', async function () {
    const postModel = {
      findOne: async () => ({
        toJSON: () => ({
          id: '1',
          visibility: 'tiers',
          tiers: [{ type: 'paid' }, { type: 'free' }],
        }),
      }),
    };
    const loader = new ContentLoader({ postModel });

    assert.equal(await loader.isPurchasable('posts', '1'), false);
    assert.equal(await loader.loadFullEntry('posts', '1'), null);
  });

  it('treats published paid posts without a deliverable URL as not purchasable', async function () {
    const postModel = {
      findOne: async () => ({
        toJSON: () => ({
          id: '1',
          visibility: 'paid',
          html: '<p>hi</p>',
        }),
      }),
    };
    const loader = new ContentLoader({
      postModel,
      urlServiceFacade: { getUrlForResource: () => 'http://example.com/404/' },
    });

    assert.equal(await loader.isPurchasable('posts', '1'), false);
    assert.equal(await loader.loadFullEntry('posts', '1'), null);
  });
});
