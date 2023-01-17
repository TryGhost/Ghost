const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const offerSnapshot = {
    id: matchers.anyObjectId,
    tier: {
        id: matchers.anyObjectId
    }
};

describe('Offers Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys', 'members');
        await agent.authenticate();
    });

    it('Can read offer details from id', async function () {
        const productModel = await models.Product.findOne({type: 'paid'}, testUtils.context.internal);

        const offerData = testUtils.DataGenerator.forKnex.createOffer({
            product_id: productModel.get('id')
        });
        const offerModel = await models.Offer.add(offerData, {context: {internal: true}});

        await agent.get(`/offers/${offerModel.get('id')}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': matchers.anyContentVersion,
                etag: matchers.anyEtag
            })
            .matchBodySnapshot({
                offers: Array(1).fill(offerSnapshot)
            });
    });
});
