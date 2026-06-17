const assert = require('node:assert/strict');
const sinon = require('sinon');
const createGetMemberDataFromMagicLinkToken = require('../../../../../../core/server/services/members/members-api/services/get-member-data-from-magic-link-token');

describe('MembersAPI', function () {
    describe('getMemberDataFromMagicLinkToken', function () {
        let getMemberDataFromMagicLinkToken;
        let getTokenDataFromMagicLinkToken;
        let getMemberIdentityData;
        let users;
        let Member;
        let MemberLoginEvent;
        let giftRedeem;
        let tokenData;

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

            getTokenDataFromMagicLinkToken = sinon.stub().resolves(tokenData);
            getMemberIdentityData = sinon.stub();
            users = {
                update: sinon.stub(),
                create: sinon.stub()
            };
            Member = {
                transaction: sinon.stub().callsFake(async (callback) => {
                    return await callback('trx');
                })
            };
            MemberLoginEvent = {
                add: sinon.stub().resolves()
            };
            giftRedeem = sinon.stub().resolves();

            getMemberDataFromMagicLinkToken = createGetMemberDataFromMagicLinkToken({
                getTokenDataFromMagicLinkToken,
                getMemberIdentityData,
                users,
                Member,
                MemberLoginEvent,
                giftService: {
                    service: {
                        redeem: giftRedeem
                    }
                },
                geolocationService: {
                    getGeolocationFromIP: sinon.stub().resolves(null)
                },
                logging: {
                    warn: sinon.stub()
                }
            });
        });

        afterEach(function () {
            sinon.restore();
        });

        it('redeems a gift for an existing member during magic link exchange', async function () {
            const existingMember = {
                id: 'member_1',
                email: 'jamie@example.com'
            };

            getMemberIdentityData.onFirstCall().resolves(existingMember);
            getMemberIdentityData.onSecondCall().resolves(existingMember);

            const result = await getMemberDataFromMagicLinkToken('magic-token');

            sinon.assert.calledOnceWithExactly(getTokenDataFromMagicLinkToken, 'magic-token', undefined);
            sinon.assert.calledTwice(getMemberIdentityData);
            sinon.assert.calledWithExactly(getMemberIdentityData.firstCall, 'jamie@example.com');
            sinon.assert.calledOnceWithExactly(MemberLoginEvent.add, {member_id: 'member_1'});
            sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_1');
            sinon.assert.callOrder(giftRedeem, MemberLoginEvent.add);
            assert.equal(result, existingMember);
        });

        it('redeems a gift for a newly created member during magic link exchange', async function () {
            tokenData.type = 'subscribe';

            const createdMember = {
                id: 'member_2',
                email: 'jamie@example.com'
            };

            getMemberIdentityData.onFirstCall().resolves(null);
            getMemberIdentityData.onSecondCall().resolves(createdMember);
            users.create.resolves(createdMember);

            const result = await getMemberDataFromMagicLinkToken('magic-token');

            sinon.assert.calledOnce(Member.transaction);
            sinon.assert.calledOnce(users.create);
            assert.equal(users.create.firstCall.args[0].email, 'jamie@example.com');
            assert.equal(users.create.firstCall.args[0].name, 'Jamie Larson');
            assert.equal(users.create.firstCall.args[0].status, 'gift');
            assert.deepEqual(users.create.firstCall.args[1], {transacting: 'trx'});
            sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_2', {transacting: 'trx', newMember: true});
            sinon.assert.calledOnceWithExactly(MemberLoginEvent.add, {member_id: 'member_2'});
            sinon.assert.callOrder(giftRedeem, MemberLoginEvent.add);
            assert.equal(result, createdMember);
        });

        it('propagates gift redemption failures during magic link exchange', async function () {
            const existingMember = {
                id: 'member_1',
                email: 'jamie@example.com'
            };
            const redemptionError = new Error('Gift redeem failed');

            getMemberIdentityData.resolves(existingMember);
            giftRedeem.rejects(redemptionError);

            await assert.rejects(
                () => getMemberDataFromMagicLinkToken('magic-token'),
                redemptionError
            );

            sinon.assert.notCalled(MemberLoginEvent.add);
            sinon.assert.calledOnceWithExactly(giftRedeem, 'gift-token-123', 'member_1');
        });
    });
});
