const assert = require('node:assert/strict');
const sinon = require('sinon');

const PaidContentProvider = require('../../../../../core/server/services/machine-payments/paid-content-provider');

describe('Unit: server/services/machine-payments/paid-content-provider', function () {
    let postModel;
    let urlServiceFacade;
    let provider;

    beforeEach(function () {
        postModel = {findOne: sinon.stub()};
        urlServiceFacade = {getUrlForResource: sinon.stub().returns('https://example.com/paid/')};
        provider = new PaidContentProvider({postModel, urlServiceFacade});
    });

    it('returns published paid content with its canonical URL', async function () {
        postModel.findOne.resolves({
            toJSON: () => ({id: 'post-id', title: 'Paid post', visibility: 'paid'})
        });

        const entry = await provider.get('posts', 'post-id');

        assert.equal(entry.url, 'https://example.com/paid/');
        sinon.assert.calledWith(postModel.findOne, {
            id: 'post-id',
            type: 'post',
            status: 'published'
        }, {
            withRelated: ['authors', 'tags', 'tiers']
        });
    });

    it('allows tier-restricted content only when every tier is paid', async function () {
        postModel.findOne.resolves({
            toJSON: () => ({
                id: 'post-id',
                visibility: 'tiers',
                tiers: [{type: 'paid'}, {type: 'paid'}]
            })
        });

        assert.ok(await provider.get('posts', 'post-id'));
    });

    it('rejects content available to free tiers', async function () {
        postModel.findOne.resolves({
            toJSON: () => ({
                id: 'post-id',
                visibility: 'tiers',
                tiers: [{type: 'paid'}, {type: 'free'}]
            })
        });

        assert.equal(await provider.get('posts', 'post-id'), null);
        sinon.assert.notCalled(urlServiceFacade.getUrlForResource);
    });

    it('rejects non-paid and missing content', async function () {
        postModel.findOne.resolves({
            toJSON: () => ({id: 'post-id', visibility: 'members'})
        });
        assert.equal(await provider.get('posts', 'post-id'), null);

        postModel.findOne.resolves(null);
        assert.equal(await provider.get('posts', 'post-id'), null);
    });
});
