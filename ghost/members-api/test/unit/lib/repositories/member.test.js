const assert = require('assert');
const sinon = require('sinon');
const MemberRepository = require('../../../../lib/repositories/member');

describe('MemberRepository', function () {
    describe('#isComplimentarySubscription', function () {
        it('Does not error when subscription.plan is null', function () {
            const repo = new MemberRepository({});
            repo.isComplimentarySubscription({});
        });
    });

    describe('#resolveContextSource', function (){
        it('Maps context to source', function (){
            const repo = new MemberRepository({});

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

    describe('linkSubscription', function (){
        let Member;
        let staffService;
        let notifySpy;
        let MemberPaidSubscriptionEvent;
        let StripeCustomerSubscription;
        let MemberProductEvent;
        let stripeAPIService;
        let productRepository;
        let labsService;
        let subscriptionData;

        beforeEach(async function () {
            notifySpy = sinon.spy();
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
                    related: () => {
                        return {
                            query: sinon.stub().returns({
                                fetchOne: sinon.stub().resolves({})
                            }),
                            toJSON: sinon.stub().returns([]),
                            fetch: sinon.stub().resolves({
                                toJSON: sinon.stub().returns({})
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
            staffService = {
                notifyPaidSubscriptionStart: notifySpy
            };
            MemberPaidSubscriptionEvent = {
                add: sinon.stub().resolves()
            };
            StripeCustomerSubscription = {
                add: sinon.stub().resolves({
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
        });

        it('triggers email alert for member context', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                staffService,
                productRepository,
                labsService,
                Member
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: true,
                context: {}
            });
            notifySpy.calledOnce.should.be.true();
        });

        it('triggers email alert for api context', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                staffService,
                productRepository,
                labsService,
                Member
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: true,
                context: {api_key: 'abc'}
            });
            notifySpy.calledOnce.should.be.true();
        });

        it('does not trigger email alert for importer context', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                staffService,
                productRepository,
                labsService,
                Member
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: true,
                context: {importer: true}
            });
            notifySpy.calledOnce.should.be.false();
        });

        it('does not trigger email alert for admin context', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                staffService,
                productRepository,
                labsService,
                Member
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: true,
                context: {user: {}}
            });
            notifySpy.calledOnce.should.be.false();
        });

        it('does not trigger email alert for internal context', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                staffService,
                productRepository,
                labsService,
                Member
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: true,
                context: {internal: true}
            });
            notifySpy.calledOnce.should.be.false();
        });

        afterEach(function () {
            sinon.restore();
        });
    });
});
