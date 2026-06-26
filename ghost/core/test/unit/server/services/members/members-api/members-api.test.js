const assert = require('node:assert/strict');
const sinon = require('sinon');
const MembersAPI = require('../../../../../../core/server/services/members/members-api/members-api');
const MagicLink = require('../../../../../../core/server/services/lib/magic-link/magic-link');
const GeolocationService = require('../../../../../../core/server/services/members/members-api/services/geolocation-service');
const MemberRepository = require('../../../../../../core/server/services/members/members-api/repositories/member-repository');
const MemberBREADService = require('../../../../../../core/server/services/members/members-api/services/member-bread-service');
const DomainEvents = require('@tryghost/domain-events');

describe('MembersAPI', function () {
    const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQCea7oriNoFgxnY/JgFDpNRlxLMVIapfoMQTCJMWkH9pDYoAq/8GF6q0yTd\nn5+AS7TGasCjgNGW6miEbBDBaQy8hS8hWqhaRKY6Sy8/11KyAC8y5cs+QW4dFY2JvnXO6UpE\nFaTtHR7oAtTSZJ9D9i/FN+2wAoO/4193Leoqqw1dJwIDAQABAoGAeqejo5M4Yi4n9AVV2gx3\n6SLTrhn/jPljllmr8HutPilGuOGjycZAfXguwdyVjKqQ01LRxYW2QGdK9sQIkQa5kXjzTtLa\ndtHYcplk0rTTsdjbvZ31AKNTNYn5s+PhGGb0Gc9n8co18K75ol8VPG8lpXjUUCWsb2xcV7wA\nQuHkOukCQQD7TluL8I4tHXzREIW3OZeLTyRlPEIn5cDdPPEIHrAIu4WJ50zAbkMH7W4HBmWf\ntafxSgWcRsdMIZn//wZV3goLAkEAoWE6/LgKgowSouIjbRdekw7QPZMvN2LUV0a0GZHpSA2K\nzzyvOsW1dU9EO+WhCpdfoikuxWiPtN+byAe2sbBG1QJALuKgm8wmim488jhV6ig5iMkcLjL+\n2Li5sc0D3xLynr51nJPlsuUfZmQ6qd7cqN5YVeEMiOp/lkmSlLs8sFp7nwJAKEkFWKD4vq4I\n2PBqt4jl6v//q99aIhFhwIe93cQ23+3BgQo9FAbWzXoEJo+kK+itzuVI766ycQyA7uY+DQ1c\nIQJAER3D4lsY5wnE+01eqk8NfF7TO+u4ezWs/rmNyn3hapskgV0xqn+FanXeVJ5K7B3AzabR\na4/tLo88gWEfcow6WQ==\n-----END RSA PRIVATE KEY-----\n';
    const publicKey = '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAJ5ruiuI2gWDGdj8mAUOk1GXEsxUhql+gxBMIkxaQf2kNigCr/wYXqrTJN2fn4BL\ntMZqwKOA0ZbqaIRsEMFpDLyFLyFaqFpEpjpLLz/XUrIALzLlyz5Bbh0VjYm+dc7pSkQVpO0d\nHugC1NJkn0P2L8U37bACg7/jX3ct6iqrDV0nAgMBAAE=\n-----END RSA PUBLIC KEY-----\n';

    let membersAPI;
    let giftRedeem;
    let memberLoginEvent;
    let labsService;
    let tokenData;
    let MemberModel;

    const buildMembersAPI = () => {
        return MembersAPI({
            tokenConfig: {
                issuer: 'ghost',
                privateKey,
                publicKey
            },
            auth: {
                allowSelfSignup: sinon.stub().returns(true),
                getSigninURL: sinon.stub().returns('https://example.com/magic-link'),
                tokenProvider: {}
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
                Automation: {},
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
        sinon.stub(DomainEvents, 'subscribe');
        sinon.stub(MagicLink.prototype, 'getDataFromToken').callsFake(async (token, otcVerification) => {
            assert.equal(token, 'magic-token');
            assert.equal(otcVerification, undefined);
            return tokenData;
        });
        sinon.stub(MagicLink.prototype, 'sendMagicLink').resolves();
        sinon.stub(MagicLink.prototype, 'getMagicLink').resolves();
        sinon.stub(MemberRepository.prototype, 'get');
        sinon.stub(MemberRepository.prototype, 'update');
        sinon.stub(MemberRepository.prototype, 'create');
        sinon.stub(MemberBREADService.prototype, 'read');
        sinon.stub(GeolocationService.prototype, 'getGeolocationFromIP').resolves(null);

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

        giftRedeem = sinon.stub().resolves();
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

        MemberBREADService.prototype.read.onFirstCall().resolves(existingMember);
        MemberBREADService.prototype.read.onSecondCall().resolves(existingMember);

        const result = await membersAPI.getMemberDataFromMagicLinkToken('magic-token');

        sinon.assert.calledOnceWithExactly(MagicLink.prototype.getDataFromToken, 'magic-token', undefined);
        sinon.assert.calledTwice(MemberBREADService.prototype.read);
        sinon.assert.calledWithExactly(MemberBREADService.prototype.read.firstCall, {email: 'jamie@example.com'});
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

        MemberBREADService.prototype.read.onFirstCall().resolves(null);
        MemberBREADService.prototype.read.onSecondCall().resolves(createdMember);
        MemberRepository.prototype.create.resolves(createdMember);

        const result = await membersAPI.getMemberDataFromMagicLinkToken('magic-token');

        sinon.assert.calledOnce(MemberModel.transaction);
        sinon.assert.calledOnce(MemberRepository.prototype.create);
        assert.equal(MemberRepository.prototype.create.firstCall.args[0].email, 'jamie@example.com');
        assert.equal(MemberRepository.prototype.create.firstCall.args[0].name, 'Jamie Larson');
        assert.equal(MemberRepository.prototype.create.firstCall.args[0].status, 'gift');
        assert.deepEqual(MemberRepository.prototype.create.firstCall.args[1], {transacting: 'trx'});
        sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_2', {transacting: 'trx', newMember: true});
        sinon.assert.calledOnceWithExactly(memberLoginEvent.add, {member_id: 'member_2'});
        sinon.assert.callOrder(giftRedeem, memberLoginEvent.add);
        assert.equal(result, createdMember);
    });

    it('propagates gift redemption failures during magic link exchange', async function () {
        const existingMember = {
            id: 'member_1',
            email: 'jamie@example.com'
        };
        const redemptionError = new Error('Gift redeem failed');

        MemberBREADService.prototype.read.resolves(existingMember);
        giftRedeem.rejects(redemptionError);

        await assert.rejects(
            () => membersAPI.getMemberDataFromMagicLinkToken('magic-token'),
            redemptionError
        );

        sinon.assert.notCalled(memberLoginEvent.add);
        sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_1');
    });
});
