const errors = require('@tryghost/errors');

module.exports = class MemberController {
    /**
     * @param {object} deps
     * @param {any} deps.memberRepository
     * @param {any} deps.productRepository
     * @param {any} deps.paymentsService
     * @param {any} deps.tiersService
     * @param {any} deps.StripePrice
     * @param {any} deps.tokenService
     * @param {any} deps.sendEmailWithMagicLink
     */
    constructor({
        memberRepository,
        productRepository,
        paymentsService,
        tiersService,
        StripePrice,
        tokenService,
        sendEmailWithMagicLink
    }) {
        this._memberRepository = memberRepository;
        this._productRepository = productRepository;
        this._paymentsService = paymentsService;
        this._tiersService = tiersService;
        this._StripePrice = StripePrice;
        this._tokenService = tokenService;
        this._sendEmailWithMagicLink = sendEmailWithMagicLink;
    }

    async updateEmailAddress(req, res) {
        const identity = req.body.identity;
        const email = req.body.email;
        const options = {
            forceEmailType: true
        };

        if (!identity) {
            res.writeHead(403);
            return res.end('No Permission.');
        }

        let tokenData = {};
        try {
            const member = await this._memberRepository.getByToken(identity);
            tokenData.oldEmail = member.get('email');
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized.');
        }

        try {
            await this._sendEmailWithMagicLink({email, tokenData, requestedType: 'updateEmail', options});
            res.writeHead(201);
            return res.end('Created.');
        } catch (err) {
            res.writeHead(500);
            return res.end('Internal Server Error.');
        }
    }

    async updateSubscription(req, res) {
        try {
            const identity = req.body.identity;
            const subscriptionId = req.params.id;
            const cancelAtPeriodEnd = req.body.cancel_at_period_end;
            const smartCancel = req.body.smart_cancel;
            const cancellationReason = req.body.cancellation_reason;
            let ghostPriceId = req.body.priceId;
            const tierId = req.body.tierId;
            const cadence = req.body.cadence;

            if (cancelAtPeriodEnd === undefined && ghostPriceId === undefined && smartCancel === undefined && tierId === undefined && cadence === undefined) {
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

            if (tierId && cadence) {
                const tier = await this._tiersService.api.read(tierId);
                const stripePrice = await this._paymentsService.getPriceForTierCadence(tier, cadence);

                await this._memberRepository.updateSubscription({
                    email,
                    subscription: {
                        subscription_id: subscriptionId,
                        price: stripePrice.id
                    }
                });
            } else if (ghostPriceId !== undefined) {
                const price = await this._StripePrice.findOne({
                    id: ghostPriceId
                });

                if (!price) {
                    res.writeHead(404);
                    return res.end('Not Found.');
                }

                const priceId = price.get('stripe_price_id');
                const product = await this._productRepository.get({stripe_price_id: priceId});

                if (product.get('active') !== true) {
                    res.writeHead(403);
                    return res.end('Tier is archived.');
                }

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
            res.writeHead(err.statusCode || 500, {
                'Content-Type': 'text/plain;charset=UTF-8'
            });
            res.end(err.message);
        }
    }
};
