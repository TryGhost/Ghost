import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import {GiftController} from '../../../../../core/server/services/gifts/gift-controller';

describe('GiftController', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createController() {
        const service = {
            getRedeemable: sinon.stub().resolves({
                token: 'gift-token',
                tier: {id: 'tier_1', name: 'Gold', description: null, benefits: []}
            }),
            redeem: sinon.stub().resolves({
                token: 'gift-token',
                tier: {id: 'tier_1', name: 'Gold', description: null, benefits: []}
            })
        };
        const controller = new GiftController({
            service: service as any
        });

        return {controller, service};
    }

    it('maps anonymous redemption reads to the module interface', async function () {
        const {controller, service} = createController();

        const result = await controller.getRedeemable({
            data: {token: 'gift-token'}
        });

        sinon.assert.calledOnceWithExactly(service.getRedeemable, {
            token: 'gift-token',
            memberStatus: null
        });
        assert.equal(result.token, 'gift-token');
    });

    it('passes the authenticated member status to redemption reads', async function () {
        const {controller, service} = createController();

        await controller.getRedeemable({
            data: {token: 'gift-token'},
            options: {
                context: {
                    member: {
                        id: 'member_1',
                        status: 'free'
                    }
                }
            }
        });

        sinon.assert.calledOnceWithExactly(service.getRedeemable, {
            token: 'gift-token',
            memberStatus: 'free'
        });
    });

    it('maps authenticated redemption writes to the module interface', async function () {
        const {controller, service} = createController();

        const result = await controller.redeem({
            data: {token: 'gift-token'},
            options: {
                context: {
                    member: {
                        id: 'member_1',
                        status: 'free'
                    }
                }
            }
        });

        sinon.assert.calledOnceWithExactly(service.redeem, {
            token: 'gift-token',
            memberId: 'member_1'
        });
        assert.equal(result.token, 'gift-token');
    });

    it('requires member authentication for redemption writes', async function () {
        const {controller, service} = createController();

        await assert.rejects(
            () => controller.redeem({data: {token: 'gift-token'}}),
            (err: any) => {
                assert.ok(err instanceof errors.UnauthorizedError);
                assert.equal(err.message, 'Member authentication required.');
                return true;
            }
        );
        sinon.assert.notCalled(service.redeem);
    });
});
