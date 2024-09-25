const assert = require('assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const MemberRepository = require('../../../../lib/repositories/MemberRepository');
const {SubscriptionCreatedEvent, OfferRedemptionEvent} = require('@tryghost/member-events');

const mockOfferRedemption = {
    add: sinon.stub(),
    findOne: sinon.stub()
};

describe('MemberRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('#isComplimentarySubscription', function () {
        it('Does not error when subscription.plan is null', function () {
            const repo = new MemberRepository({OfferRedemption: mockOfferRedemption});
            repo.isComplimentarySubscription({});
        });
    });

    describe('#resolveContextSource', function (){
        it('Maps context to source', function (){
            const repo = new MemberRepository({OfferRedemption: mockOfferRedemption});

            let source = repo._resolveContextSource({
                import: true
            });
            assert.equal(source, 'import');

            source = repo._resolveContextSource({
                importer: true
            });
            assert.equal(source, 'import');

            source = repo._resolveContextSource({
                user: true
            });
            assert.equal(source, 'admin');

            source = repo._resolveContextSource({
                user: true,
                api_key: true
            });
            assert.equal(source, 'api');

            source = repo._resolveContextSource({
                api_key: true
            });
            assert.equal(source, 'api');

            source = repo._resolveContextSource({
            });
            assert.equal(source, 'member');

            source = repo._resolveContextSource({
                generic_context: true
            });
            assert.equal(source, 'member');
        });
    });

    describe('setComplimentarySubscription', function () {
        let Member;
        let productRepository;

        beforeEach(function () {
            Member = {
                findOne: sinon.stub().resolves({
                    id: 'member_id_123',
                    related: () => {
                        return {
                            fetch: () => {
                                return {
                                    models: []
                                };
                            }
                        };
                    }
                })
            };
        });

        it('throws an error when there is no default product', async function () {
            productRepository = {
                getDefaultProduct: sinon.stub().resolves(null)
            };

            const repo = new MemberRepository({
                Member,
                stripeAPIService: {
                    configured: true
                },
                productRepository,
                OfferRedemption: mockOfferRedemption
            });

            try {
                await repo.setComplimentarySubscription({
                    id: 'member_id_123'
                }, {
                    transacting: true
                });

                assert.fail('setComplimentarySubscription should have thrown');
            } catch (err) {
                assert.equal(err.message, 'Could not find Product "default"');
            }
        });

        it('uses the right options for fetching default product', async function () {
            productRepository = {
                getDefaultProduct: sinon.stub().resolves({
                    toJSON: () => {
                        return null;
                    }
                })
            };

            const repo = new MemberRepository({
                Member,
                stripeAPIService: {
                    configured: true
                },
                productRepository,
                OfferRedemption: mockOfferRedemption
            });

            try {
                await repo.setComplimentarySubscription({
                    id: 'member_id_123'
                }, {
                    transacting: true,
                    withRelated: ['labels']
                });

                assert.fail('setComplimentarySubscription should have thrown');
            } catch (err) {
                productRepository.getDefaultProduct.calledWith({withRelated: ['stripePrices'], transacting: true}).should.be.true();
                assert.equal(err.message, 'Could not find Product "default"');
            }
        });
    });

    describe('newsletter subscriptions', function () {
        let Member;
        let MemberProductEvent;
        let productRepository;
        let stripeAPIService;
        let existingNewsletters;
        let MemberSubscribeEvent;

        beforeEach(async function () {
            sinon.spy();
            existingNewsletters = [
                {
                    id: 'newsletter_id_123',
                    attributes: {
                        status: 'active'
                    },
                    get: sinon.stub().withArgs('status').returns('active')
                },
                {
                    id: 'newsletter_id_1234_archive',
                    attributes: {
                        status: 'archived'
                    },
                    get: sinon.stub().withArgs('status').returns('archived')
                }
            ];

            Member = {
                findOne: sinon.stub().resolves({
                    get: sinon.stub().returns('member_id_123'),
                    related: sinon.stub().withArgs('newsletters').returns({
                        models: existingNewsletters
                    }),
                    toJSON: sinon.stub().returns({})
                }),
                edit: sinon.stub().resolves({
                    attributes: {},
                    _previousAttributes: {}
                })
            };

            stripeAPIService = {
                configured: false
            };

            MemberSubscribeEvent = {
                add: sinon.stub().resolves()
            };
        });

        it('Does not create false archived newsletter events', async function () {
            const repo = new MemberRepository({
                Member,
                MemberProductEvent,
                productRepository,
                stripeAPIService,
                MemberSubscribeEventModel: MemberSubscribeEvent,
                OfferRedemption: mockOfferRedemption
            });

            await repo.update({
                email: 'test@email.com',
                newsletters: [{
                    id: 'newsletter_id_123'
                },
                {
                    id: 'newsletter_id_456'
                },
                {
                    id: 'newsletter_id_new'
                },
                {
                    id: 'newsletter_id_1234_archive'
                }]
            },{
                transacting: {
                    executionPromise: Promise.resolve()
                },
                context: {}
            });

            MemberSubscribeEvent.add.calledTwice.should.be.true();
        });
    });

    describe('linkSubscription', function (){
        let Member;
        let MemberPaidSubscriptionEvent;
        let StripeCustomerSubscription;
        let MemberProductEvent;
        let stripeAPIService;
        let productRepository;
        let offerRepository;
        let labsService;
        let subscriptionData;
        let subscriptionCreatedNotifySpy;
        let offerRedemptionNotifySpy;

        afterEach(function () {
            sinon.restore();
        });

        beforeEach(async function () {
            subscriptionCreatedNotifySpy = sinon.spy();
            offerRedemptionNotifySpy = sinon.spy();

            subscriptionData = {
                id: 'sub_123',
                customer: 'cus_123',
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: 'Monthly',
                            currency: 'usd',
                            recurring: {
                                interval: 'month'
                            },
                            unit_amount: 500,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: Date.now() / 1000,
                current_period_end: Date.now() / 1000 + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            };

            Member = {
                findOne: sinon.stub().resolves({
                    related: (relation) => {
                        return {
                            query: sinon.stub().returns({
                                fetchOne: sinon.stub().resolves({})
                            }),
                            toJSON: sinon.stub().returns(relation === 'products' ? [] : {}),
                            fetch: sinon.stub().resolves({
                                toJSON: sinon.stub().returns(relation === 'products' ? [] : {}),
                                models: []
                            })
                        };
                    },
                    toJSON: sinon.stub().returns({})
                }),
                edit: sinon.stub().resolves({
                    attributes: {},
                    _previousAttributes: {}
                })
            };
            MemberPaidSubscriptionEvent = {
                add: sinon.stub().resolves()
            };
            StripeCustomerSubscription = {
                add: sinon.stub().resolves({
                    get: sinon.stub().returns()
                }),
                edit: sinon.stub().resolves({
                    get: sinon.stub().returns()
                })
            };
            MemberProductEvent = {
                add: sinon.stub().resolves({})
            };

            stripeAPIService = {
                configured: true,
                getSubscription: sinon.stub().resolves(subscriptionData)
            };

            productRepository = {
                get: sinon.stub().resolves({
                    get: sinon.stub().returns(),
                    toJSON: sinon.stub().returns({})
                }),
                update: sinon.stub().resolves({})
            };

            labsService = {
                isSet: sinon.stub().returns(true)
            };

            offerRepository = {
                getById: sinon.stub().resolves({
                    id: 'offer_123'
                })
            };
        });

        it('dispatches paid subscription event', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                productRepository,
                labsService,
                Member,
                OfferRedemption: mockOfferRedemption
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            DomainEvents.subscribe(SubscriptionCreatedEvent, subscriptionCreatedNotifySpy);
            DomainEvents.subscribe(OfferRedemptionEvent, offerRedemptionNotifySpy);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: {
                    executionPromise: Promise.resolve()
                },
                context: {}
            });

            subscriptionCreatedNotifySpy.calledOnce.should.be.true();
            offerRedemptionNotifySpy.called.should.be.false();
        });

        it('dispatches the offer redemption event for a new member starting a subscription', async function (){
            // When a new member starts a paid subscription, the subscription is created with the offer ID
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                productRepository,
                offerRepository,
                labsService,
                Member,
                OfferRedemption: mockOfferRedemption
            });

            // No existing subscription
            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            DomainEvents.subscribe(SubscriptionCreatedEvent, subscriptionCreatedNotifySpy);
            DomainEvents.subscribe(OfferRedemptionEvent, offerRedemptionNotifySpy);

            await repo.linkSubscription({
                id: 'member_id_123',
                subscription: subscriptionData,
                offerId: 'offer_123'
            }, {
                transacting: {
                    executionPromise: Promise.resolve()
                },
                context: {}
            });

            subscriptionCreatedNotifySpy.calledOnce.should.be.true();
            subscriptionCreatedNotifySpy.calledWith(sinon.match((event) => {
                if (event.data.offerId === 'offer_123') {
                    return true;
                }
                return false;
            })).should.be.true();

            offerRedemptionNotifySpy.called.should.be.true();
            offerRedemptionNotifySpy.calledWith(sinon.match((event) => {
                if (event.data.offerId === 'offer_123') {
                    return true;
                }
                return false;
            })).should.be.true();
        });

        it('dispatches the offer redemption event for an existing member upgrading to a paid subscription', async function (){
            // When an existing free member upgrades to a paid subscription, the subscription is first created _without_ the offer id
            // Then it is updated with the offer id after the checkout.completed webhook is received
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                productRepository,
                offerRepository,
                labsService,
                Member,
                OfferRedemption: mockOfferRedemption
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves({
                get: sinon.stub().withArgs('offer_id').returns(null)
            });

            DomainEvents.subscribe(SubscriptionCreatedEvent, subscriptionCreatedNotifySpy);
            DomainEvents.subscribe(OfferRedemptionEvent, offerRedemptionNotifySpy);

            await repo.linkSubscription({
                id: 'member_id_123',
                subscription: subscriptionData,
                offerId: 'offer_123'
            }, {
                transacting: {
                    executionPromise: Promise.resolve()
                },
                context: {}
            });

            subscriptionCreatedNotifySpy.calledOnce.should.be.false();

            offerRedemptionNotifySpy.called.should.be.true();
            offerRedemptionNotifySpy.calledWith(sinon.match((event) => {
                if (event.data.offerId === 'offer_123') {
                    return true;
                }
                return false;
            })).should.be.true();
        });
    });
});
