const errors = require('@tryghost/ignition-errors');

/**
 * MemberController
 *
 * @param {object} deps
 * @param {any} deps.memberRepository
 * @param {any} deps.StripePrice
 * @param {any} deps.stripeApiService
 * @param {any} deps.tokenService
 */
module.exports = class MemberController {
    constructor({
        memberRepository,
        StripePrice,
        stripeAPIService,
        tokenService
    }) {
        this._memberRepository = memberRepository;
        this._StripePrice = StripePrice;
        this._stripeApiService = stripeAPIService;
        this._tokenService = tokenService;
    }

    async updateSubscription(req, res) {
        try {
            const identity = req.body.identity;
            const subscriptionId = req.params.id;
            const cancelAtPeriodEnd = req.body.cancel_at_period_end;
            const smartCancel = req.body.smart_cancel;
            const cancellationReason = req.body.cancellation_reason;
            const ghostPriceId = req.body.priceId;
            if (cancelAtPeriodEnd === undefined && ghostPriceId === undefined && smartCancel === undefined) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed!',
                    help: 'Request should contain "cancel_at_period_end" or "priceId" or "smart_cancel" field.'
                });
            }

            if ((cancelAtPeriodEnd === undefined || cancelAtPeriodEnd === false) && !smartCancel && cancellationReason !== undefined) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed!',
                    help: '"cancellation_reason" field requires the "cancel_at_period_end" or "smart_cancel" field to be true.'
                });
            }

            if (cancellationReason && cancellationReason.length > 500) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed!',
                    help: '"cancellation_reason" field can be a maximum of 500 characters.'
                });
            }

            let email;
            try {
                if (!identity) {
                    throw new errors.BadRequestError({
                        message: 'Updating subscription failed! Could not find member'
                    });
                }

                const claims = await this._tokenService.decodeToken(identity);
                email = claims && claims.sub;
            } catch (err) {
                res.writeHead(401);
                return res.end('Unauthorized');
            }

            if (!email) {
                throw new errors.BadRequestError({
                    message: 'Invalid token'
                });
            }

            if (ghostPriceId !== undefined) {
                const price = await this._StripePrice.findOne({
                    id: ghostPriceId
                });

                if (!price) {
                    res.writeHead(404);
                    return res.end('Not Found.');
                }

                const priceId = price.get('stripe_price_id');
                await this._memberRepository.updateSubscription({
                    email,
                    subscription: {
                        subscription_id: subscriptionId,
                        price: priceId
                    }
                });
            } else if (cancelAtPeriodEnd !== undefined) {
                await this._memberRepository.updateSubscription({
                    email,
                    subscription: {
                        subscription_id: subscriptionId,
                        cancel_at_period_end: cancelAtPeriodEnd,
                        cancellationReason
                    }
                });
            } else if (smartCancel) {
                const currentSubscription = await this._memberRepository.getSubscription({
                    email,
                    subscription: {
                        subscription_id: subscriptionId
                    }
                });

                if (['past_due', 'unpaid'].includes(currentSubscription.status)) {
                    await this._memberRepository.cancelSubscription({
                        email,
                        subscription: {
                            subscription_id: subscriptionId,
                            cancellationReason
                        }
                    });
                } else {
                    await this._memberRepository.updateSubscription({
                        email,
                        subscription: {
                            subscription_id: subscriptionId,
                            cancel_at_period_end: true,
                            cancellationReason
                        }
                    });
                }
            }

            res.writeHead(204);
            res.end();
        } catch (err) {
            res.writeHead(err.statusCode || 500);
            res.end(err.message);
        }
    }
};
