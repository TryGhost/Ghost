const {doProductAndNewsletter} = require('../../../../../core/server/services/auth/setup');
const sinon = require('sinon');

describe('Auth Service: setup', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('doProductAndNewsletter', function () {
        it('updates default product and newsletter name', async function () {
            const productEditStub = sinon.stub().resolves();
            const newsletterEditStub = sinon.stub().resolves();
            const productBrowseStub = sinon.stub().resolves({
                products: [
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
            let productsApi = {
                browse: productBrowseStub,
                edit: productEditStub
            };
            let newslettersApi = {
                browse: newsletterBrowseStub,
                edit: newsletterEditStub
            };
            const api = {
                products: productsApi,
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
            await doProductAndNewsletter(data, api);
            sinon.assert.calledOnceWithExactly(
                productEditStub,
                {products: [{name: 'Test Blog'}]},
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
