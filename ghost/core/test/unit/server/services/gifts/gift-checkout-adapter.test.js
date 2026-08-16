const assert = require('node:assert/strict');
const sinon = require('sinon');
const GiftCheckoutAdapter = require('../../../../../core/server/services/gifts/gift-checkout-adapter');

describe('GiftCheckoutAdapter', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createAdapter({customers = []} = {}) {
        const select = sinon.stub().resolves(customers);
        const query = sinon.stub().returns({select});
        const where = sinon.stub().returns({query});
        const add = sinon.stub().resolves();
        const StripeCustomerModel = {where, add};
        const stripeApi = {
            getCustomer: sinon.stub(),
            createCustomer: sinon.stub(),
            createGiftCheckoutSession: sinon.stub()
        };
        const adapter = new GiftCheckoutAdapter({
            StripeCustomerModel,
            getStripeApi: () => stripeApi
        });

        return {
            adapter,
            StripeCustomerModel,
            stripeApi
        };
    }

    it('translates a stable customer ID into the Stripe customer shape', async function () {
        const {adapter, stripeApi} = createAdapter();
        stripeApi.createGiftCheckoutSession.resolves({
            url: 'https://checkout.stripe.test/session'
        });

        const result = await adapter.createSession({
            amount: 12000,
            currency: 'usd',
            customerId: 'cus_123',
            customerEmail: null
        });

        assert.equal(result, 'https://checkout.stripe.test/session');
        sinon.assert.calledOnceWithExactly(stripeApi.createGiftCheckoutSession, {
            amount: 12000,
            currency: 'usd',
            customerEmail: null,
            customer: {id: 'cus_123'}
        });
    });

    it('returns an existing active Stripe customer ID', async function () {
        const {adapter, StripeCustomerModel, stripeApi} = createAdapter({
            customers: [{customer_id: 'cus_123'}]
        });
        stripeApi.getCustomer.resolves({
            id: 'cus_123',
            deleted: false
        });

        const result = await adapter.getCustomerId({
            memberId: 'member_1',
            email: 'buyer@example.com',
            name: 'Buyer'
        });

        assert.equal(result, 'cus_123');
        sinon.assert.calledOnceWithExactly(StripeCustomerModel.where, {
            member_id: 'member_1'
        });
        sinon.assert.notCalled(stripeApi.createCustomer);
    });

    it('creates and links a Stripe customer when the member has none', async function () {
        const {adapter, StripeCustomerModel, stripeApi} = createAdapter();
        stripeApi.createCustomer.resolves({
            id: 'cus_new',
            email: 'buyer@example.com',
            name: 'Buyer'
        });

        const result = await adapter.getCustomerId({
            memberId: 'member_1',
            email: 'buyer@example.com',
            name: 'Buyer'
        });

        assert.equal(result, 'cus_new');
        sinon.assert.calledOnceWithExactly(stripeApi.createCustomer, {
            email: 'buyer@example.com',
            name: 'Buyer'
        });
        sinon.assert.calledOnceWithExactly(StripeCustomerModel.add, {
            member_id: 'member_1',
            customer_id: 'cus_new',
            email: 'buyer@example.com',
            name: 'Buyer'
        });
    });

    it('does not touch Stripe for a logged-out buyer', async function () {
        const {adapter, StripeCustomerModel, stripeApi} = createAdapter();

        const result = await adapter.getCustomerId({
            memberId: null,
            email: 'buyer@example.com',
            name: null
        });

        assert.equal(result, null);
        sinon.assert.notCalled(StripeCustomerModel.where);
        sinon.assert.notCalled(stripeApi.getCustomer);
        sinon.assert.notCalled(stripeApi.createCustomer);
    });
});
