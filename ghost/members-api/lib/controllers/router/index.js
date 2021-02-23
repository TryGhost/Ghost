const common = require('../../../lib/common');
const _ = require('lodash');
const errors = require('ghost-ignition').errors;

/**
 * RouterController
 *
 * @param {object} deps
 * @param {any} deps.memberRepository
 * @param {boolean} deps.allowSelfSignup
 * @param {any} deps.magicLinkService
 * @param {any} deps.stripeAPIService
 * @param {any} deps.stripePlanService
 * @param {any} deps.tokenService
 * @param {any} deps.config
 */
module.exports = class RouterController {
    constructor({
        memberRepository,
        allowSelfSignup,
        magicLinkService,
        stripeAPIService,
        stripePlansService,
        tokenService,
        sendEmailWithMagicLink,
        config
    }) {
        this._memberRepository = memberRepository;
        this._allowSelfSignup = allowSelfSignup;
        this._magicLinkService = magicLinkService;
        this._stripeAPIService = stripeAPIService;
        this._stripePlansService = stripePlansService;
        this._tokenService = tokenService;
        this._sendEmailWithMagicLink = sendEmailWithMagicLink;
        this._config = config;
    }

    async ensureStripe(_req, res, next) {
        if (!this._stripeAPIService.configured) {
            res.writeHead(400);
            return res.end('Stripe not configured');
        }
        try {
            await this._stripeAPIService.ready();
            next();
        } catch (err) {
            res.writeHead(500);
            return res.end('There was an error configuring stripe');
        }
    }

    async updateSubscription(req, res) {
        try {
            const identity = req.body.identity;
            const subscriptionId = req.params.id;
            const cancelAtPeriodEnd = req.body.cancel_at_period_end;
            const cancellationReason = req.body.cancellation_reason;
            const planName = req.body.planName;

            if (cancelAtPeriodEnd === undefined && planName === undefined) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed!',
                    help: 'Request should contain "cancel_at_period_end" or "planName" field.'
                });
            }

            if ((cancelAtPeriodEnd === undefined || cancelAtPeriodEnd === false) && cancellationReason !== undefined) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed!',
                    help: '"cancellation_reason" field requires the "cancel_at_period_end" field to be true.'
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

            const member = email ? await this._memberRepository.get({email}, {withRelated: ['stripeSubscriptions']}) : null;

            if (!member) {
                throw new errors.BadRequestError({
                    message: 'Updating subscription failed! Could not find member'
                });
            }

            // Don't allow removing subscriptions that don't belong to the member
            const subscription = member.related('stripeSubscriptions').models.find(
                subscription => subscription.get('subscription_id') === subscriptionId
            );
            if (!subscription) {
                res.writeHead(403);
                return res.end('No permission');
            }

            let updatedSubscription;
            if (planName !== undefined) {
                const plan = this._stripePlansService.getPlans().find(plan => plan.nickname === planName);
                if (!plan) {
                    throw new errors.BadRequestError({
                        message: 'Updating subscription failed! Could not find plan'
                    });
                }
                updatedSubscription = await this._stripeAPIService.changeSubscriptionPlan(subscriptionId, plan.id);
            } else if (cancelAtPeriodEnd !== undefined) {
                if (cancelAtPeriodEnd) {
                    updatedSubscription = await this._stripeAPIService.cancelSubscriptionAtPeriodEnd(
                        subscriptionId, cancellationReason
                    );
                } else {
                    updatedSubscription = await this._stripeAPIService.continueSubscriptionAtPeriodEnd(
                        subscriptionId
                    );
                }
            }
            if (updatedSubscription) {
                await this._memberRepository.linkSubscription({
                    id: member.id,
                    subscription: updatedSubscription
                });
            }

            res.writeHead(204);
            res.end();
        } catch (err) {
            res.writeHead(err.statusCode || 500);
            res.end(err.message);
        }
    }

    async createCheckoutSetupSession(req, res) {
        const identity = req.body.identity;

        if (!identity) {
            res.writeHead(400);
            return res.end();
        }

        let email;
        try {
            if (!identity) {
                email = null;
            } else {
                const claims = await this._tokenService.decodeToken(identity);
                email = claims && claims.sub;
            }
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        const member = email ? await this._memberRepository.get({email}) : null;

        if (!member) {
            res.writeHead(403);
            return res.end('Bad Request.');
        }

        let customer;
        if (!req.body.subscription_id) {
            customer = await this._stripeAPIService.getCustomerForMemberCheckoutSession(member);
        } else {
            const subscriptions = await member.related('stripeSubscriptions').fetch();
            const subscription = subscriptions.models.find((sub) => {
                return sub.get('subscription_id') === req.body.subscription_id;
            });

            if (!subscription) {
                res.writeHead(404);
                res.end(`Could not find subscription ${req.body.subscription_id}`);
            }
            customer = await this._stripeAPIService.getCustomer(subscription.get('customer_id'));
        }

        const session = await this._stripeAPIService.createCheckoutSetupSession(customer, {
            successUrl: req.body.successUrl || this._config.billingSuccessUrl,
            cancelUrl: req.body.cancelUrl || this._config.billingCancelUrl,
            subscription_id: req.body.subscription_id
        });
        const publicKey = this._stripeAPIService.getPublicKey();
        const sessionInfo = {
            sessionId: session.id,
            publicKey
        };
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(sessionInfo));
    }

    async createCheckoutSession(req, res) {
        const planName = req.body.plan;
        const identity = req.body.identity;

        if (!planName) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        // NOTE: never allow "Complimentary" plan to be subscribed to from the client
        if (planName.toLowerCase() === 'complimentary') {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        const plan = this._stripePlansService.getPlan(planName);

        let email;
        try {
            if (!identity) {
                email = null;
            } else {
                const claims = await this._tokenService.decodeToken(identity);
                email = claims && claims.sub;
            }
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        const member = email ? await this._memberRepository.get({email}, {withRelated: ['stripeCustomers', 'stripeSubscriptions']}) : null;

        if (!member) {
            const customer = null;
            const session = await this._stripeAPIService.createCheckoutSession(plan, customer, {
                successUrl: req.body.successUrl || this._config.checkoutSuccessUrl,
                cancelUrl: req.body.cancelUrl || this._config.checkoutCancelUrl,
                customerEmail: req.body.customerEmail,
                metadata: req.body.metadata
            });
            const publicKey = this._stripeAPIService.getPublicKey();

            const sessionInfo = {
                publicKey,
                sessionId: session.id
            };

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify(sessionInfo));
        }

        for (const subscription of member.related('stripeSubscriptions')) {
            if (['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.get('status'))) {
                res.writeHead(403);
                return res.end('No permission');
            }
        }

        let stripeCustomer;

        for (const customer of member.related('stripeCustomers').models) {
            try {
                const fetchedCustomer = await this._stripeAPIService.getCustomer(customer.get('customer_id'));
                if (!fetchedCustomer.deleted) {
                    stripeCustomer = fetchedCustomer;
                    break;
                }
            } catch (err) {
                console.log('Ignoring error for fetching customer for checkout');
            }
        }

        if (!stripeCustomer) {
            stripeCustomer = await this._stripeAPIService.createCustomer({email: member.get('email')});
        }

        try {
            const session = await this._stripeAPIService.createCheckoutSession(plan, stripeCustomer, {
                successUrl: req.body.successUrl || this._config.checkoutSuccessUrl,
                cancelUrl: req.body.cancelUrl || this._config.checkoutCancelUrl,
                metadata: req.body.metadata
            });
            const publicKey = this._stripeAPIService.getPublicKey();

            const sessionInfo = {
                publicKey,
                sessionId: session.id
            };

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify(sessionInfo));
        } catch (e) {
            const error = e.message || 'Unable to initiate checkout session';
            res.writeHead(400);
            return res.end(error);
        }
    }

    async sendMagicLink(req, res) {
        const {email, emailType, oldEmail, requestSrc} = req.body;
        let forceEmailType = false;
        if (!email) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        try {
            if (oldEmail) {
                const existingMember = await this._memberRepository.get({email});
                if (existingMember) {
                    throw new errors.BadRequestError({
                        message: 'This email is already associated with a member'
                    });
                }
                forceEmailType = true;
            }

            if (!this._allowSelfSignup) {
                const member = oldEmail ? await this._memberRepository.get({oldEmail}) : await this._memberRepository.get({email});
                if (member) {
                    const tokenData = _.pick(req.body, ['oldEmail']);
                    await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, requestSrc, options: {forceEmailType}});
                }
            } else {
                const tokenData = _.pick(req.body, ['labels', 'name', 'oldEmail']);
                await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, requestSrc, options: {forceEmailType}});
            }
            res.writeHead(201);
            return res.end('Created.');
        } catch (err) {
            const statusCode = (err && err.statusCode) || 500;
            common.logging.error(err);
            res.writeHead(statusCode);
            return res.end('Internal Server Error.');
        }
    }
};
