const common = require('../../lib/common');
const _ = require('lodash');
const errors = require('@tryghost/ignition-errors');

/**
 * RouterController
 *
 * @param {object} deps
 * @param {any} deps.memberRepository
 * @param {any} deps.StripePrice
 * @param {boolean} deps.allowSelfSignup
 * @param {any} deps.magicLinkService
 * @param {any} deps.stripeAPIService
 * @param {any} deps.tokenService
 * @param {any} deps.config
 * @param {any} deps.logging
 */
module.exports = class RouterController {
    constructor({
        memberRepository,
        StripePrice,
        allowSelfSignup,
        magicLinkService,
        stripeAPIService,
        tokenService,
        sendEmailWithMagicLink,
        config,
        logging
    }) {
        this._memberRepository = memberRepository;
        this._StripePrice = StripePrice;
        this._allowSelfSignup = allowSelfSignup;
        this._magicLinkService = magicLinkService;
        this._stripeAPIService = stripeAPIService;
        this._tokenService = tokenService;
        this._sendEmailWithMagicLink = sendEmailWithMagicLink;
        this._config = config;
        this._logging = logging;
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
        const ghostPriceId = req.body.priceId;
        const identity = req.body.identity;

        if (!ghostPriceId) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        const price = await this._StripePrice.findOne({
            id: ghostPriceId
        });

        if (!price) {
            res.writeHead(404);
            return res.end('Not Found.');
        }

        const priceId = price.get('stripe_price_id');

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

        const member = email ? await this._memberRepository.get({email}, {withRelated: ['stripeCustomers', 'products']}) : null;

        if (!member) {
            const customer = null;
            const session = await this._stripeAPIService.createCheckoutSession(priceId, customer, {
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

        if (member.related('products').length !== 0) {
            res.writeHead(403);
            return res.end('No permission');
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
                this._logging.info('Ignoring error for fetching customer for checkout');
            }
        }

        if (!stripeCustomer) {
            stripeCustomer = await this._stripeAPIService.createCustomer({email: member.get('email')});
        }

        try {
            const session = await this._stripeAPIService.createCheckoutSession(priceId, stripeCustomer, {
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
