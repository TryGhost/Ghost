const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

describe('MembersAPI', function () {
    let MembersAPI;
    let membersAPI;
    let memberRepository;
    let memberBREADService;
    let giftRedeem;
    let tokenProvider;
    let memberLoginEvent;
    let labsService;
    let tokenData;
    let MemberModel;

    const createRouterStub = () => {
        const router = {};

        ['use', 'get', 'post', 'put', 'delete'].forEach((method) => {
            router[method] = sinon.stub().returns(router);
        });

        return router;
    };

    const buildMembersAPI = () => {
        MembersAPI = rewire('../../../../../../core/server/services/members/members-api/members-api');

        MembersAPI.__set__('Router', () => createRouterStub());
        MembersAPI.__set__('body', {
            json: () => 'json-middleware',
            raw: () => 'raw-middleware',
            urlencoded: () => 'urlencoded-middleware'
        });
        MembersAPI.__set__('PaymentsService', function PaymentsService() {
            return {};
        });
        MembersAPI.__set__('TokenService', function TokenService() {
            return {};
        });
        MembersAPI.__set__('GeolocationService', function GeolocationService() {
            return {
                getGeolocationFromIP: sinon.stub().resolves(null)
            };
        });
        MembersAPI.__set__('MemberRepository', function MemberRepository() {
            return memberRepository;
        });
        MembersAPI.__set__('MemberBREADService', function MemberBREADService() {
            return memberBREADService;
        });
        MembersAPI.__set__('NextPaymentCalculator', function NextPaymentCalculator() {
            return {};
        });
        MembersAPI.__set__('EventRepository', function EventRepository() {
            return {};
        });
        MembersAPI.__set__('ProductRepository', function ProductRepository() {
            return {};
        });
        MembersAPI.__set__('RouterController', function RouterController() {
            return {};
        });
        MembersAPI.__set__('MemberController', function MemberController() {
            return {};
        });
        MembersAPI.__set__('WellKnownController', function WellKnownController() {
            return {};
        });
        MembersAPI.__set__('MagicLink', function MagicLink() {
            return {
                tokenProvider,
                getDataFromToken: sinon.stub().callsFake(async (token, otcVerification) => {
                    return await tokenProvider.validate(token, {otcVerification});
                }),
                sendMagicLink: sinon.stub(),
                getMagicLink: sinon.stub(),
                getSigninURL: sinon.stub()
            };
        });
        MembersAPI.__set__('DomainEvents', {
            subscribe: sinon.stub()
        });

        return MembersAPI({
            tokenConfig: {
                issuer: 'ghost',
                privateKey: 'private-key',
                publicKey: 'public-key'
            },
            auth: {
                allowSelfSignup: sinon.stub().returns(true),
                getSigninURL: sinon.stub().returns('https://example.com/magic-link'),
                tokenProvider
            },
            mail: {
                transporter: {
                    sendMail: sinon.stub().resolves({})
                },
                getText: sinon.stub().returns('text'),
                getHTML: sinon.stub().returns('<p>html</p>'),
                getSubject: sinon.stub().returns('subject')
            },
            models: {
                DonationPaymentEvent: {},
                EmailRecipient: {},
                StripeCustomer: {},
                StripeCustomerSubscription: {},
                Member: MemberModel,
                MemberNewsletter: {},
                MemberCancelEvent: {},
                MemberSubscribeEvent: {},
                MemberLoginEvent: memberLoginEvent,
                MemberPaidSubscriptionEvent: {},
                MemberPaymentEvent: {},
                MemberStatusEvent: {},
                MemberProductEvent: {},
                MemberEmailChangeEvent: {},
                MemberCreatedEvent: {},
                SubscriptionCreatedEvent: {},
                MemberLinkClickEvent: {},
                EmailSpamComplaintEvent: {},
                Offer: {},
                OfferRedemption: {},
                StripeProduct: {},
                StripePrice: {},
                Product: {},
                Settings: {},
                Comment: {},
                MemberFeedback: {},
                Outbox: {},
                WelcomeEmailAutomation: {},
                AutomatedEmailRecipient: {},
                Gift: {}
            },
            tiersService: {},
            stripeAPIService: {},
            offersAPI: {},
            labsService,
            newslettersService: {},
            memberAttributionService: {},
            emailSuppressionList: {},
            settingsCache: {
                get: sinon.stub().returns([])
            },
            sentry: {},
            settingsHelpers: {},
            urlUtils: {},
            commentsService: {},
            emailAddressService: {},
            giftService: {
                service: {
                    redeem: giftRedeem
                }
            }
        });
    };

    beforeEach(function () {
        tokenData = {
            email: 'jamie@example.com',
            name: 'Jamie Larson',
            labels: [],
            newsletters: undefined,
            attribution: undefined,
            reqIp: undefined,
            type: 'signin',
            giftToken: 'gift-token-123'
        };

        memberRepository = {
            get: sinon.stub(),
            update: sinon.stub(),
            create: sinon.stub()
        };
        memberBREADService = {
            read: sinon.stub()
        };
        giftRedeem = sinon.stub().resolves();
        tokenProvider = {
            create: sinon.stub(),
            validate: sinon.stub().resolves(tokenData)
        };
        memberLoginEvent = {
            add: sinon.stub().resolves()
        };
        labsService = {
            isSet: sinon.stub().returns(true)
        };
        MemberModel = {
            transaction: sinon.stub().callsFake(async (callback) => {
                return await callback('trx');
            })
        };

        membersAPI = buildMembersAPI();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('redeems a gift for an existing member during magic link exchange', async function () {
        const existingMember = {
            id: 'member_1',
            email: 'jamie@example.com'
        };

        memberBREADService.read.onFirstCall().resolves(existingMember);
        memberBREADService.read.onSecondCall().resolves(existingMember);

        const result = await membersAPI.getMemberDataFromMagicLinkToken('magic-token');

        sinon.assert.calledOnceWithExactly(tokenProvider.validate, 'magic-token', {otcVerification: undefined});
        sinon.assert.calledTwice(memberBREADService.read);
        sinon.assert.calledWithExactly(memberBREADService.read.firstCall, {email: 'jamie@example.com'});
        sinon.assert.calledOnceWithExactly(memberLoginEvent.add, {member_id: 'member_1'});
        sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_1');
        sinon.assert.callOrder(giftRedeem, memberLoginEvent.add);
        assert.equal(result, existingMember);
    });

    it('redeems a gift for a newly created member during magic link exchange', async function () {
        tokenData.type = 'subscribe';

        const createdMember = {
            id: 'member_2',
            email: 'jamie@example.com'
        };

        memberBREADService.read.onFirstCall().resolves(null);
        memberBREADService.read.onSecondCall().resolves(createdMember);
        memberRepository.create.resolves(createdMember);

        const result = await membersAPI.getMemberDataFromMagicLinkToken('magic-token');

        sinon.assert.calledOnce(MemberModel.transaction);
        sinon.assert.calledOnce(memberRepository.create);
        assert.equal(memberRepository.create.firstCall.args[0].email, 'jamie@example.com');
        assert.equal(memberRepository.create.firstCall.args[0].name, 'Jamie Larson');
        assert.equal(memberRepository.create.firstCall.args[0].status, 'gift');
        assert.deepEqual(memberRepository.create.firstCall.args[1], {transacting: 'trx'});
        sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_2', {transacting: 'trx', newMember: true});
        sinon.assert.calledOnceWithExactly(memberLoginEvent.add, {member_id: 'member_2'});
        sinon.assert.callOrder(giftRedeem, memberLoginEvent.add);
        assert.equal(result, createdMember);
    });

    it('does not redeem a gift when gift subscriptions are disabled', async function () {
        const existingMember = {
            id: 'member_1',
            email: 'jamie@example.com'
        };

        labsService.isSet.withArgs('giftSubscriptions').returns(false);
        memberBREADService.read.resolves(existingMember);

        const result = await membersAPI.getMemberDataFromMagicLinkToken('magic-token');

        sinon.assert.notCalled(giftRedeem);
        sinon.assert.calledOnceWithExactly(memberLoginEvent.add, {member_id: 'member_1'});
        assert.equal(result, existingMember);
    });

    it('propagates gift redemption failures during magic link exchange', async function () {
        const existingMember = {
            id: 'member_1',
            email: 'jamie@example.com'
        };
        const redemptionError = new Error('Gift redeem failed');

        memberBREADService.read.resolves(existingMember);
        giftRedeem.rejects(redemptionError);

        await assert.rejects(
            () => membersAPI.getMemberDataFromMagicLinkToken('magic-token'),
            redemptionError
        );

        sinon.assert.notCalled(memberLoginEvent.add);
        sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_1');
    });
});
