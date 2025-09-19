require('should');
const assert = require('assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const MemberRepository = require('../../../../../../../core/server/services/members/members-api/repositories/MemberRepository');
const {SubscriptionCreatedEvent, OfferRedemptionEvent} = require('../../../../../../../core/shared/events');

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

    describe('#_deleteMemberComments', function () {
        let mockComment;
        let mockCommentCollection;

        beforeEach(function () {
            mockComment = {
                save: sinon.stub().resolves()
            };
            
            mockCommentCollection = {
                models: [mockComment, mockComment]
            };

            this.repo = new MemberRepository({
                Member: {
                    findOne: sinon.stub(),
                    destroy: sinon.stub()
                },
                Comment: {
                    findAll: sinon.stub().resolves(mockCommentCollection)
                },
                OfferRedemption: mockOfferRedemption,
                stripeAPIService: {
                    configured: false
                }
            });
        });

        it('should find and delete all published comments for a member', async function () {
            const memberId = 'member123';
            const options = {};

            await this.repo._deleteMemberComments(memberId, options);

            this.repo._Comment.findAll.calledOnce.should.be.true();
            this.repo._Comment.findAll.calledWith({
                filter: `member_id:${memberId}+status:-deleted`
            }, options).should.be.true();

            mockComment.save.calledTwice.should.be.true();
            mockComment.save.alwaysCalledWith({status: 'deleted'}, options).should.be.true();
        });

        it('should handle empty comment collection', async function () {
            const memberId = 'member123';
            const options = {};
            
            this.repo._Comment.findAll.resolves({models: []});

            await this.repo._deleteMemberComments(memberId, options);

            this.repo._Comment.findAll.calledOnce.should.be.true();
            mockComment.save.called.should.be.false();
        });
    });

    describe('#destroy with comment deletion', function () {
        let mockMember;
        let mockComment;
        let mockCommentCollection;

        beforeEach(function () {
            mockMember = {
                id: 'member123',
                related: sinon.stub().returns({
                    fetch: sinon.stub().resolves(),
                    models: []
                })
            };

            mockComment = {
                save: sinon.stub().resolves()
            };
            
            mockCommentCollection = {
                models: [mockComment]
            };

            this.repo = new MemberRepository({
                Member: {
                    findOne: sinon.stub().resolves(mockMember),
                    destroy: sinon.stub().resolves()
                },
                Comment: {
                    findAll: sinon.stub().resolves(mockCommentCollection)
                },
                OfferRedemption: mockOfferRedemption,
                stripeAPIService: {
                    configured: false
                }
            });
        });

        it('should delete comments when deleteComments option is true', async function () {
            const data = {id: 'member123'};
            const options = {deleteComments: true};

            await this.repo.destroy(data, options);

            this.repo._Comment.findAll.calledOnce.should.be.true();
            this.repo._Comment.findAll.calledWith({
                filter: 'member_id:member123+status:-deleted'
            }, options).should.be.true();

            mockComment.save.calledOnce.should.be.true();
            mockComment.save.calledWith({status: 'deleted'}, options).should.be.true();
            this.repo._Member.destroy.calledOnce.should.be.true();
            this.repo._Member.destroy.calledWith({id: 'member123'}, options).should.be.true();
        });

        it('should not delete comments when deleteComments option is false', async function () {
            const data = {id: 'member123'};
            const options = {deleteComments: false};

            await this.repo.destroy(data, options);

            this.repo._Comment.findAll.called.should.be.false();
            mockComment.save.called.should.be.false();
            this.repo._Member.destroy.calledOnce.should.be.true();
            this.repo._Member.destroy.calledWith({id: 'member123'}, options).should.be.true();
        });

        it('should not delete comments when deleteComments option is undefined', async function () {
            const data = {id: 'member123'};
            const options = {};

            await this.repo.destroy(data, options);

            this.repo._Comment.findAll.called.should.be.false();
            mockComment.save.called.should.be.false();
            this.repo._Member.destroy.calledOnce.should.be.true();
            this.repo._Member.destroy.calledWith({id: 'member123'}, options).should.be.true();
        });
    });
});
