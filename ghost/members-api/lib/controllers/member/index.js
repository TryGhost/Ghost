const errors = require('ghost-ignition').errors;

/**
 * MemberController
 *
 * @param {object} deps
 * @param {any} deps.memberRepository
 * @param {any} deps.stripePlansService
 * @param {any} deps.tokenService
 */
module.exports = class MemberController {
    constructor({
        memberRepository,
        stripePlansService,
        tokenService
    }) {
        this._memberRepository = memberRepository;
        this._stripePlansService = stripePlansService;
        this._tokenService = tokenService;
    }

    async updateSubscription(req, res) {
        try {
            const identity = req.body.identity;
            const subscriptionId = req.params.id;
            const cancelAtPeriodEnd = req.body.cancel_at_period_end;
            const smartCancel = req.body.smart_cancel;
            const cancellationReason = req.body.cancellation_reason;
            const planName = req.body.planName;

            if (cancelAtPeriodEnd === undefined && planName === undefined && smartCancel === undefined) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed!',
                    help: 'Request should contain "cancel_at_period_end" or "planName" or "smart_cancel" field.'
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

            if (planName !== undefined) {
                const plan = this._stripePlansService.getPlan(planName);
                if (!plan) {
                    throw new errors.BadRequestError({
                        message: 'Updating subscription failed! Could not find plan'
                    });
                }
                await this._memberRepository.updateSubscription({
                    email,
                    subscription: {
                        subscription_id: subscriptionId,
                        plan: plan.id
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
