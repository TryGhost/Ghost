const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const _ = require('lodash');
const {BadRequestError, NoPermissionError, NotFoundError, UnauthorizedError} = require('@tryghost/errors');

const messages = {
    badRequest: 'Bad Request.',
    notFound: 'Not Found.',
    offerArchived: 'This offer is archived.',
    tierArchived: 'This tier is archived.',
    existingSubscription: 'A subscription exists for this Member.',
    unableToCheckout: 'Unable to initiate checkout session'
};

module.exports = class RouterController {
    /**
     * RouterController
     *
     * @param {object} deps
     * @param {any} deps.offersAPI
     * @param {any} deps.paymentsService
     * @param {any} deps.productRepository
     * @param {any} deps.memberRepository
     * @param {any} deps.StripePrice
     * @param {() => boolean} deps.allowSelfSignup
     * @param {any} deps.magicLinkService
     * @param {import('@tryghost/members-stripe-service')} deps.stripeAPIService
     * @param {any} deps.tokenService
     * @param {{isSet(name: string): boolean}} deps.labsService
     */
    constructor({
        offersAPI,
        paymentsService,
        productRepository,
        memberRepository,
        StripePrice,
        allowSelfSignup,
        magicLinkService,
        stripeAPIService,
        tokenService,
        sendEmailWithMagicLink,
        labsService
    }) {
        this._offersAPI = offersAPI;
        this._paymentsService = paymentsService;
        this._productRepository = productRepository;
        this._memberRepository = memberRepository;
        this._StripePrice = StripePrice;
        this._allowSelfSignup = allowSelfSignup;
        this._magicLinkService = magicLinkService;
        this._stripeAPIService = stripeAPIService;
        this._tokenService = tokenService;
        this._sendEmailWithMagicLink = sendEmailWithMagicLink;
        this.labsService = labsService;
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
            successUrl: req.body.successUrl,
            cancelUrl: req.body.cancelUrl,
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
        let ghostPriceId = req.body.priceId;
        const tierId = req.body.tierId;
        const cadence = req.body.cadence;
        const identity = req.body.identity;
        const offerId = req.body.offerId;
        const metadata = req.body.metadata;

        if (!ghostPriceId && !offerId && !tierId && !cadence) {
            throw new BadRequestError({
                message: tpl(messages.badRequest)
            });
        }

        if (offerId && (ghostPriceId || (tierId && cadence))) {
            throw new BadRequestError({
                message: tpl(messages.badRequest)
            });
        }

        if (ghostPriceId && tierId && cadence) {
            throw new BadRequestError({
                message: tpl(messages.badRequest)
            });
        }

        if (tierId && !cadence) {
            throw new BadRequestError({
                message: tpl(messages.badRequest)
            });
        }

        if (cadence && cadence !== 'month' && cadence !== 'year') {
            throw new BadRequestError({
                message: tpl(messages.badRequest)
            });
        }

        let couponId = null;
        if (offerId) {
            const offer = await this._offersAPI.getOffer({id: offerId});
            const tier = (await this._productRepository.get(offer.tier)).toJSON();

            if (offer.status === 'archived') {
                throw new NoPermissionError({
                    message: tpl(messages.offerArchived)
                });
            }

            if (offer.cadence === 'month') {
                ghostPriceId = tier.monthly_price_id;
            } else {
                ghostPriceId = tier.yearly_price_id;
            }

            const coupon = await this._paymentsService.getCouponForOffer(offerId);
            couponId = coupon.id;

            metadata.offer = offer.id;
        }

        if (!ghostPriceId) {
            const tier = await this._productRepository.get({id: tierId});
            if (tier) {
                if (cadence === 'month') {
                    ghostPriceId = tier.get('monthly_price_id');
                } else {
                    ghostPriceId = tier.get('yearly_price_id');
                }
            }
        }

        const price = await this._StripePrice.findOne({
            id: ghostPriceId
        });

        if (!price) {
            throw new NotFoundError({
                message: tpl(messages.notFound)
            });
        }

        const priceId = price.get('stripe_price_id');

        const product = await this._productRepository.get({stripe_price_id: priceId});
        let trialDays;

        if (this.labsService.isSet('freeTrial')) {
            trialDays = product.get('trial_days');
        }

        if (product.get('active') !== true) {
            throw new NoPermissionError({
                message: tpl(messages.tierArchived)
            });
        }

        let member = null;
        if (identity) {
            try {
                const claims = await this._tokenService.decodeToken(identity);
                const email = claims && claims.sub;
                if (email) {
                    member = await this._memberRepository.get({email}, {withRelated: ['stripeCustomers', 'products']});
                }
            } catch (err) {
                throw new UnauthorizedError({err});
            }
        } else if (req.body.customerEmail) {
            member = await this._memberRepository.get({email: req.body.customerEmail}, {withRelated: ['stripeCustomers', 'products']});
        }

        let successUrl = req.body.successUrl;
        let cancelUrl = req.body.cancelUrl;

        if (!member && req.body.customerEmail && !req.body.successUrl) {
            const memberExistsForCustomer = await this._memberRepository.get({email: req.body.customerEmail});
            if (!memberExistsForCustomer) {
                successUrl = await this._magicLinkService.getMagicLink({
                    tokenData: {
                        email: req.body.customerEmail
                    },
                    type: 'signup'
                });
            }
        }

        if (!member) {
            const customer = null;
            const session = await this._stripeAPIService.createCheckoutSession(priceId, customer, {
                coupon: couponId,
                successUrl,
                cancelUrl,
                trialDays,
                customerEmail: req.body.customerEmail,
                metadata: metadata
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
            if (!identity && req.body.customerEmail) {
                try {
                    await this._sendEmailWithMagicLink({email: req.body.customerEmail, requestedType: 'signin'});
                } catch (err) {
                    logging.warn(err);
                }
            }
            throw new NoPermissionError({
                message: messages.existingSubscription,
                code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION'
            });
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
                logging.info('Ignoring error for fetching customer for checkout');
            }
        }

        if (!stripeCustomer) {
            stripeCustomer = await this._stripeAPIService.createCustomer({email: member.get('email')});
        }

        try {
            const session = await this._stripeAPIService.createCheckoutSession(priceId, stripeCustomer, {
                coupon: couponId,
                successUrl,
                cancelUrl,
                trialDays,
                metadata: metadata
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
        } catch (err) {
            throw new BadRequestError({
                err,
                message: tpl(messages.unableToCheckout)
            });
        }
    }

    async sendMagicLink(req, res) {
        const {email, emailType} = req.body;
        if (!email) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        try {
            if (!this._allowSelfSignup()) {
                const member = await this._memberRepository.get({email});
                if (member) {
                    const tokenData = {};
                    await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, referrer: req.get('referer')});
                }
            } else {
                const tokenData = _.pick(req.body, ['labels', 'name', 'newsletters']);
                await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, referrer: req.get('referer')});
            }
            res.writeHead(201);
            return res.end('Created.');
        } catch (err) {
            if (err.code === 'EENVELOPE') {
                logging.error(err);
                res.writeHead(400);
                return res.end('Bad Request.');
            }
            const statusCode = (err && err.statusCode) || 500;
            logging.error(err);
            res.writeHead(statusCode);
            return res.end('Internal Server Error.');
        }
    }
};
