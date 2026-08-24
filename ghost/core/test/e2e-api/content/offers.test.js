const assert = require('assert/strict');
const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const offerSnapshot = {
  id: matchers.anyObjectId,
  tier: {
    id: matchers.anyObjectId,
  },
};

describe('Offers Content API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('api_keys', 'members');
    await agent.authenticate();
  });

  it('Can read offer details from id', async function () {
    const productModel = await models.Product.findOne({ type: 'paid' }, testUtils.context.internal);

    const offerData = testUtils.DataGenerator.forKnex.createOffer({
      product_id: productModel.get('id'),
    });
    const offerModel = await models.Offer.add(offerData, { context: { internal: true } });

    await agent
      .get(`/offers/${offerModel.get('id')}`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': matchers.anyContentVersion,
        etag: matchers.anyEtag,
      })
      .matchBodySnapshot({
        offers: Array(1).fill(offerSnapshot),
      });
  });

  it('Can browse only active featured signup offers, without name or code', async function () {
    const productModel = await models.Product.findOne({ type: 'paid' }, testUtils.context.internal);

    const featuredOffer = await models.Offer.add(
      testUtils.DataGenerator.forKnex.createOffer({
        name: 'Featured launch offer',
        code: 'featured-launch',
        product_id: productModel.get('id'),
        interval: 'month',
        featured: true,
      }),
      { context: { internal: true } },
    );

    // Link-only stays the default: never browsable
    await models.Offer.add(
      testUtils.DataGenerator.forKnex.createOffer({
        name: 'Private link-only offer',
        code: 'private-link-only',
        product_id: productModel.get('id'),
        interval: 'month',
        featured: false,
      }),
      { context: { internal: true } },
    );

    // Archived featured offers disappear from the signup page
    await models.Offer.add(
      testUtils.DataGenerator.forKnex.createOffer({
        name: 'Archived featured offer',
        code: 'archived-featured',
        product_id: productModel.get('id'),
        interval: 'year',
        featured: true,
        active: false,
      }),
      { context: { internal: true } },
    );

    const { body } = await agent.get('/offers/').expectStatus(200);

    assert.equal(body.offers.length, 1);

    const [browsedOffer] = body.offers;
    assert.equal(browsedOffer.id, featuredOffer.get('id'));
    assert.equal(browsedOffer.featured, true);
    assert.equal(browsedOffer.status, 'active');
    assert.equal(browsedOffer.redemption_type, 'signup');
    assert.equal(browsedOffer.cadence, 'month');
    assert.deepEqual(browsedOffer.tier, { id: productModel.get('id') });
    // The public browse must not leak the redeemable code or internal name
    assert.equal(browsedOffer.code, undefined);
    assert.equal(browsedOffer.name, undefined);
  });
});
