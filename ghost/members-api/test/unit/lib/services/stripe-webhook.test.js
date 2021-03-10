const {describe, it} = require('mocha');
const should = require('should');
const sinon = require('sinon');
const StripeAPIService = require('../../../../lib/services/stripe-api');
const StripePlansService = require('../../../../lib/services/stripe-plans');
const StripeWebhookService = require('../../../../lib/services/stripe-webhook');
const MemberRepository = require('../../../../lib/repositories/member');

function mock(Class) {
    return sinon.stub(Object.create(Class.prototype));
}

describe('StripeWebhookService', function () {
    describe('invoice.payment_succeeded webhooks', function () {
        it('Should throw a 404 error when a member is not found for a valid Ghost Members invoice', async function () {
            const stripeWebhookService = new StripeWebhookService({
                stripeAPIService: mock(StripeAPIService),
                stripePlansService: mock(StripePlansService),
                memberRepository: mock(MemberRepository)
            });

            stripeWebhookService._stripeAPIService.getSubscription.resolves({
                customer: 'customer_id',
                plan: {
                    product: 'product_id'
                }
            });

            stripeWebhookService._memberRepository.get.resolves(null);

            stripeWebhookService._stripePlansService.getProduct.returns({
                id: 'product_id'
            });

            try {
                await stripeWebhookService.invoiceEvent({
                    subscription: 'sub_id'
                });
                should.fail();
            } catch (err) {
                should.equal(err.statusCode, 404);
            }
        });
    });
});
