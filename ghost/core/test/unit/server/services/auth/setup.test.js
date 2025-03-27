const {doProductAndNewsletter: doTierAndNewsletter} = require('../../../../../core/server/services/auth/setup');
const sinon = require('sinon');

describe('Auth Service: setup', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('doProductAndNewsletter', function () {
        it('updates default product and newsletter name', async function () {
            const tierEditStub = sinon.stub().resolves();
            const newsletterEditStub = sinon.stub().resolves();
            const tierBrowseStub = sinon.stub().resolves({
                tiers: [
                    {
                        id: 'product-1',
                        slug: 'free'
                    },
                    {
                        id: 'product-2',
                        slug: 'default-product'
                    }
                ]
            });
            const newsletterBrowseStub = sinon.stub().resolves({
                newsletters: [
                    {
                        id: 'newsletter-1',
                        slug: 'fake-newsletter'
                    },
                    {
                        id: 'newsletter-2',
                        slug: 'default-newsletter'
                    }
                ]
            });
            let tiersAPI = {
                browse: tierBrowseStub,
                edit: tierEditStub
            };
            let newslettersApi = {
                browse: newsletterBrowseStub,
                edit: newsletterEditStub
            };
            const api = {
                tiers: tiersAPI,
                newsletters: newslettersApi
            };
            let data = {
                user: {
                    id: 'user-1'
                },
                userData: {
                    blogTitle: 'Test Blog'
                }
            };
            await doTierAndNewsletter(data, api);
            sinon.assert.calledOnceWithExactly(
                tierEditStub,
                {tiers: [{name: 'Test Blog'}]},
                {context: {user: 'user-1'}, id: 'product-2'}
            );
            sinon.assert.calledOnceWithExactly(
                newsletterEditStub,
                {newsletters: [{name: 'Test Blog'}]},
                {context: {user: 'user-1'}, id: 'newsletter-2'}
            );
        });
    });
});
