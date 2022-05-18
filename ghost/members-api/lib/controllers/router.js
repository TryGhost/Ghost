const logging = require('@tryghost/logging');
const _ = require('lodash');

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
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        if (offerId && (ghostPriceId || (tierId && cadence))) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        if (ghostPriceId && tierId && cadence) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        if (tierId && !cadence) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        if (cadence && cadence !== 'month' && cadence !== 'year') {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        let couponId = null;
        if (offerId) {
            try {
                const offer = await this._offersAPI.getOffer({id: offerId});
                const tier = (await this._productRepository.get(offer.tier)).toJSON();

                if (offer.status === 'archived') {
                    res.writeHead(403);
                    return res.end('Offer is archived.');
                }

                if (offer.cadence === 'month') {
                    ghostPriceId = tier.monthly_price_id;
                } else {
                    ghostPriceId = tier.yearly_price_id;
                }

                const coupon = await this._paymentsService.getCouponForOffer(offerId);
                couponId = coupon.id;

                metadata.offer = offer.id;
            } catch (err) {
                res.writeHead(500);
                return res.end('Could not use Offer.');
            }
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
            res.writeHead(404);
            return res.end('Not Found.');
        }

        const priceId = price.get('stripe_price_id');

        const product = await this._productRepository.get({stripe_price_id: priceId});

        if (product.get('active') !== true) {
            res.writeHead(403);
            return res.end('Tier is archived.');
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

        const member = email ? await this._memberRepository.get({email}, {withRelated: ['stripeCustomers', 'products']}) : null;

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
        } catch (e) {
            const error = e.message || 'Unable to initiate checkout session';
            res.writeHead(400);
            return res.end(error);
        }
    }

    async sendMagicLink(req, res) {
        const {email, emailType, requestSrc} = req.body;
        if (!email) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        try {
            if (!this._allowSelfSignup()) {
                const member = await this._memberRepository.get({email});
                if (member) {
                    const tokenData = {};
                    await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, requestSrc});
                }
            } else {
                const tokenData = _.pick(req.body, ['labels', 'name', 'newsletters']);
                await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, requestSrc});
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
