const {describe, it} = require('mocha');
const should = require('should');
const sinon = require('sinon');
const StripeAPIService = require('@tryghost/members-stripe-service');
const StripeWebhookService = require('../../../../lib/services/stripe-webhook');
const ProductRepository = require('../../../../lib/repositories/product');
const MemberRepository = require('../../../../lib/repositories/member');

function mock(Class) {
    return sinon.stub(Object.create(Class.prototype));
}

describe('StripeWebhookService', function () {
    describe('invoice.payment_succeeded webhooks', function () {
        it('Should throw a 404 error when a member is not found for a valid Ghost Members invoice', async function () {
            const stripeWebhookService = new StripeWebhookService({
                stripeAPIService: mock(StripeAPIService),
                productRepository: mock(ProductRepository),
                memberRepository: mock(MemberRepository)
            });

            stripeWebhookService._stripeAPIService.getSubscription.resolves({
                customer: 'customer_id',
                plan: {
                    product: 'product_id'
                }
            });

            stripeWebhookService._memberRepository.get.resolves(null);

            stripeWebhookService._productRepository.get.resolves({
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
    describe('customer.subscription.updated webhooks', function () {
        it('Should throw a 400 error when a subscription has multiple prices', async function () {
            const stripeWebhookService = new StripeWebhookService({
                stripeAPIService: mock(StripeAPIService),
                productRepository: mock(ProductRepository),
                memberRepository: mock(MemberRepository)
            });

            stripeWebhookService._stripeAPIService.getSubscription.resolves({
                customer: 'customer_id',
                plan: {
                    product: 'product_id'
                }
            });

            stripeWebhookService._memberRepository.get.resolves(null);

            stripeWebhookService._productRepository.get.resolves({
                id: 'product_id'
            });

            try {
                await stripeWebhookService.subscriptionEvent({
                    items: {
                        data: [
                            {
                                id: 'si_1',
                                price: {}
                            },
                            {
                                id: 'si_2',
                                price: {}
                            }
                        ]
                    }
                });
                should.fail();
            } catch (err) {
                should.equal(err.statusCode, 400);
            }
        });
        it('Should throw a 400 error when a subscription has 0 prices', async function () {
            const stripeWebhookService = new StripeWebhookService({
                stripeAPIService: mock(StripeAPIService),
                productRepository: mock(ProductRepository),
                memberRepository: mock(MemberRepository)
            });

            stripeWebhookService._stripeAPIService.getSubscription.resolves({
                customer: 'customer_id',
                plan: {
                    product: 'product_id'
                }
            });

            stripeWebhookService._memberRepository.get.resolves(null);

            stripeWebhookService._productRepository.get.resolves({
                id: 'product_id'
            });

            try {
                await stripeWebhookService.subscriptionEvent({
                    items: {
                        data: []
                    }
                });
                should.fail();
            } catch (err) {
                should.equal(err.statusCode, 400);
            }
        });
    });
});
