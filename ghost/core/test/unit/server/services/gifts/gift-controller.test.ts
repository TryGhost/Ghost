import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import {GiftController} from '../../../../../core/server/services/gifts/gift-controller';
import {Gift} from '../../../../../core/server/services/gifts/gift';

describe('GiftController', function () {
    let service: {
        getRedeemable: sinon.SinonStub;
        redeem: sinon.SinonStub;
    };
    let tiersService: {
        api: {
            read: sinon.SinonStub;
        };
    };
    let labsService: {
        isSet: sinon.SinonStub;
    };

    function buildGift(overrides: Partial<ConstructorParameters<typeof Gift>[0]> = {}) {
        return new Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: null,
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: null,
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'purchased',
            purchasedAt: new Date('2026-01-01T00:00:00.000Z'),
            redeemedAt: null,
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: null,
            ...overrides
        });
    }

    function buildTierJSON(overrides: Partial<{id: string; name: string; description: string | null; benefits: string[]}> = {}) {
        return {
            id: 'tier_1',
            name: 'Bronze',
            description: 'Tier description',
            benefits: ['Benefit 1', 'Benefit 2'],
            ...overrides
        };
    }

    beforeEach(function () {
        service = {
            getRedeemable: sinon.stub(),
            redeem: sinon.stub()
        };
        tiersService = {
            api: {
                read: sinon.stub().resolves({
                    toJSON: () => buildTierJSON()
                })
            }
        };
        labsService = {
            isSet: sinon.stub().returns(true)
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    function createController() {
        return new GiftController({
            service: service as any,
            tiersService,
            labsService
        });
    }

    describe('getRedeemable', function () {
        it('returns serialized gift for an anonymous visitor', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);

            const controller = createController();
            const result = await controller.getRedeemable({
                data: {token: 'gift-token'}
            });

            sinon.assert.calledOnceWithExactly(service.getRedeemable, 'gift-token', null);
            sinon.assert.calledOnceWithExactly(tiersService.api.read, 'tier_1');
            assert.deepEqual(result, {
                token: 'gift-token',
                cadence: 'year',
                duration: 1,
                currency: 'usd',
                amount: 5000,
                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                consumes_at: null,
                tier: {
                    id: 'tier_1',
                    name: 'Bronze',
                    description: 'Tier description',
                    benefits: ['Benefit 1', 'Benefit 2']
                }
            });
        });

        it('passes member status from frame context', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);

            const controller = createController();

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

            sinon.assert.calledOnceWithExactly(service.getRedeemable, 'gift-token', 'free');
        });

        it('passes null member status when member is null', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);

            const controller = createController();

            await controller.getRedeemable({
                data: {token: 'gift-token'},
                options: {
                    context: {
                        member: null
                    }
                }
            });

            sinon.assert.calledOnceWithExactly(service.getRedeemable, 'gift-token', null);
        });

        it('passes null member status when context is absent', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);

            const controller = createController();

            await controller.getRedeemable({
                data: {token: 'gift-token'}
            });

            sinon.assert.calledOnceWithExactly(service.getRedeemable, 'gift-token', null);
        });

        it('serializes the tier using tier.toJSON()', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);
            tiersService.api.read.resolves({
                toJSON: () => ({
                    id: 'tier_1',
                    name: 'Gold (JSON)',
                    description: 'Gold tier (JSON)',
                    benefits: ['All access (JSON)']
                })
            });

            const controller = createController();
            const result = await controller.getRedeemable({
                data: {token: 'gift-token'}
            });

            assert.equal(result.tier.name, 'Gold (JSON)');
            assert.deepEqual(result.tier.benefits, ['All access (JSON)']);
        });

        it('preserves tier data returned by toJSON()', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);
            tiersService.api.read.resolves({
                toJSON: () => buildTierJSON({
                    name: 'Basic',
                    description: null,
                    benefits: []
                })
            });

            const controller = createController();
            const result = await controller.getRedeemable({
                data: {token: 'gift-token'}
            });

            assert.equal(result.tier.name, 'Basic');
            assert.equal(result.tier.description, null);
            assert.deepEqual(result.tier.benefits, []);
        });

        it('throws BadRequestError when labs flag is disabled', async function () {
            labsService.isSet.returns(false);

            const controller = createController();

            await assert.rejects(
                () => controller.getRedeemable({data: {token: 'gift-token'}}),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'Gift subscriptions are not enabled on this site.');
                    return true;
                }
            );

            sinon.assert.calledOnceWithExactly(labsService.isSet, 'giftSubscriptions');
            sinon.assert.notCalled(service.getRedeemable);
        });

        it('passes through service errors unchanged', async function () {
            const serviceError = new errors.BadRequestError({
                message: 'This gift has expired.'
            });

            service.getRedeemable.rejects(serviceError);

            const controller = createController();

            await assert.rejects(
                () => controller.getRedeemable({data: {token: 'gift-token'}}),
                serviceError
            );
        });

        it('throws InternalServerError when the tier cannot be loaded', async function () {
            const gift = buildGift();

            service.getRedeemable.resolves(gift);
            tiersService.api.read.resolves(null);

            const controller = createController();

            await assert.rejects(
                () => controller.getRedeemable({data: {token: 'gift-token'}}),
                (err: any) => {
                    assert.equal(err.errorType, 'InternalServerError');
                    assert.equal(err.message, 'Tier tier_1 not found for gift: gift-token');
                    return true;
                }
            );
        });
    });

    describe('redeem', function () {
        it('redeems the gift for the authenticated member and returns serialized redemption data', async function () {
            const gift = buildGift({
                redeemerMemberId: 'member_1',
                consumesAt: new Date('2031-01-01T00:00:00.000Z'),
                redeemedAt: new Date('2030-01-01T00:00:00.000Z'),
                status: 'redeemed'
            });

            service.redeem.resolves(gift);

            const controller = createController();
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

            sinon.assert.calledOnceWithExactly(service.redeem, 'gift-token', 'member_1');
            sinon.assert.calledOnceWithExactly(tiersService.api.read, 'tier_1');
            assert.deepEqual(result, {
                token: 'gift-token',
                cadence: 'year',
                duration: 1,
                currency: 'usd',
                amount: 5000,
                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                consumes_at: new Date('2031-01-01T00:00:00.000Z'),
                tier: {
                    id: 'tier_1',
                    name: 'Bronze',
                    description: 'Tier description',
                    benefits: ['Benefit 1', 'Benefit 2']
                }
            });
        });

        it('throws UnauthorizedError when there is no authenticated member', async function () {
            const controller = createController();

            await assert.rejects(
                () => controller.redeem({
                    data: {token: 'gift-token'}
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'UnauthorizedError');
                    assert.equal(err.message, 'Member authentication required.');
                    return true;
                }
            );

            sinon.assert.notCalled(service.redeem);
        });

        it('throws BadRequestError when labs flag is disabled', async function () {
            labsService.isSet.returns(false);

            const controller = createController();

            await assert.rejects(
                () => controller.redeem({
                    data: {token: 'gift-token'},
                    options: {
                        context: {
                            member: {
                                id: 'member_1',
                                status: 'free'
                            }
                        }
                    }
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'Gift subscriptions are not enabled on this site.');
                    return true;
                }
            );

            sinon.assert.calledOnceWithExactly(labsService.isSet, 'giftSubscriptions');
            sinon.assert.notCalled(service.redeem);
        });

        it('passes through redeem service errors unchanged', async function () {
            const serviceError = new errors.BadRequestError({
                message: 'You already have an active subscription.'
            });

            service.redeem.rejects(serviceError);

            const controller = createController();

            await assert.rejects(
                () => controller.redeem({
                    data: {token: 'gift-token'},
                    options: {
                        context: {
                            member: {
                                id: 'member_1',
                                status: 'free'
                            }
                        }
                    }
                }),
                serviceError
            );
        });
    });
});
