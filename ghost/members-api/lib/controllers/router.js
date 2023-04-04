const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const _ = require('lodash');
const {BadRequestError, NoPermissionError, UnauthorizedError} = require('@tryghost/errors');
const errors = require('@tryghost/errors');

const messages = {
    emailRequired: 'Email is required.',
    badRequest: 'Bad Request.',
    notFound: 'Not Found.',
    offerArchived: 'This offer is archived.',
    tierArchived: 'This tier is archived.',
    existingSubscription: 'A subscription exists for this Member.',
    unableToCheckout: 'Unable to initiate checkout session',
    inviteOnly: 'This site is invite-only, contact the owner for access.',
    memberNotFound: 'No member exists with this e-mail address.',
    memberNotFoundSignUp: 'No member exists with this e-mail address. Please sign up first.'
};

module.exports = class RouterController {
    /**
     * RouterController
     *
     * @param {object} deps
     * @param {any} deps.offersAPI
     * @param {any} deps.paymentsService
     * @param {any} deps.memberRepository
     * @param {any} deps.StripePrice
     * @param {() => boolean} deps.allowSelfSignup
     * @param {any} deps.magicLinkService
     * @param {import('@tryghost/members-stripe-service')} deps.stripeAPIService
     * @param {import('@tryghost/member-attribution')} deps.memberAttributionService
     * @param {any} deps.tokenService
     * @param {any} deps.sendEmailWithMagicLink
     * @param {{isSet(name: string): boolean}} deps.labsService
     */
    constructor({
        offersAPI,
        paymentsService,
        tiersService,
        memberRepository,
        StripePrice,
        allowSelfSignup,
        magicLinkService,
        stripeAPIService,
        tokenService,
        memberAttributionService,
        sendEmailWithMagicLink,
        labsService
    }) {
        this._offersAPI = offersAPI;
        this._paymentsService = paymentsService;
        this._tiersService = tiersService;
        this._memberRepository = memberRepository;
        this._StripePrice = StripePrice;
        this._allowSelfSignup = allowSelfSignup;
        this._magicLinkService = magicLinkService;
        this._stripeAPIService = stripeAPIService;
        this._tokenService = tokenService;
        this._sendEmailWithMagicLink = sendEmailWithMagicLink;
        this._memberAttributionService = memberAttributionService;
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
                res.writeHead(404, {
                    'Content-Type': 'text/plain;charset=UTF-8'
                });
                return res.end(`Could not find subscription ${req.body.subscription_id}`);
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
        let cadence = req.body.cadence;
        const identity = req.body.identity;
        const offerId = req.body.offerId;
        const metadata = req.body.metadata ?? {};

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

        let tier;
        let offer;
        let member;
        let options = {};

        if (offerId) {
            offer = await this._offersAPI.getOffer({id: offerId});
            tier = await this._tiersService.api.read(offer.tier.id);
            cadence = offer.cadence;
            // Attach offer information to stripe metadata for free trial offers
            // free trial offers don't have associated stripe coupons
            metadata.offer = offer.id;
        } else {
            offer = null;
            tier = await this._tiersService.api.read(tierId);
        }

        if (tier.status === 'archived') {
            throw new NoPermissionError({
                message: tpl(messages.tierArchived)
            });
        }

        if (identity) {
            try {
                const claims = await this._tokenService.decodeToken(identity);
                const email = claims && claims.sub;
                if (email) {
                    member = await this._memberRepository.get({
                        email
                    }, {
                        withRelated: ['stripeCustomers', 'products']
                    });
                }
            } catch (err) {
                throw new UnauthorizedError({err});
            }
        } else if (req.body.customerEmail) {
            member = await this._memberRepository.get({
                email: req.body.customerEmail
            }, {
                withRelated: ['stripeCustomers', 'products']
            });
        }

        // Don't allow to set the source manually
        delete metadata.attribution_id;
        delete metadata.attribution_url;
        delete metadata.attribution_type;

        if (metadata.urlHistory) {
            // The full attribution history doesn't fit in the Stripe metadata (can't store objects + limited to 50 keys and 500 chars values)
            // So we need to add top-level attributes with string values
            const urlHistory = metadata.urlHistory;
            delete metadata.urlHistory;

            const attribution = await this._memberAttributionService.getAttribution(urlHistory);

            // Don't set null properties
            if (attribution.id) {
                metadata.attribution_id = attribution.id;
            }

            if (attribution.url) {
                metadata.attribution_url = attribution.url;
            }

            if (attribution.type) {
                metadata.attribution_type = attribution.type;
            }

            if (attribution.referrerSource) {
                metadata.referrer_source = attribution.referrerSource;
            }

            if (attribution.referrerMedium) {
                metadata.referrer_medium = attribution.referrerMedium;
            }

            if (attribution.referrerUrl) {
                metadata.referrer_url = attribution.referrerUrl;
            }
        }

        options.successUrl = req.body.successUrl;
        options.cancelUrl = req.body.cancelUrl;
        options.email = req.body.customerEmail;

        if (!member && req.body.customerEmail && !req.body.successUrl) {
            options.successUrl = await this._magicLinkService.getMagicLink({
                tokenData: {
                    email: req.body.customerEmail,
                    attribution: {
                        id: metadata.attribution_id ?? null,
                        type: metadata.attribution_type ?? null,
                        url: metadata.attribution_url ?? null
                    }
                },
                type: 'signup'
            });
        }

        const restrictCheckout = member?.get('status') === 'paid';

        if (restrictCheckout) {
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

        try {
            const paymentLink = await this._paymentsService.getPaymentLink({
                tier,
                cadence,
                offer,
                member,
                metadata,
                options
            });
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({url: paymentLink}));
        } catch (err) {
            throw new BadRequestError({
                err,
                message: tpl(messages.unableToCheckout)
            });
        }
    }

    async sendMagicLink(req, res) {
        const {email, autoRedirect} = req.body;
        let {emailType, redirect} = req.body;

        let referer = req.get('referer');
        if (autoRedirect === false){
            referer = null;
        }
        if (redirect) {
            try {
                // Validate URL
                referer = new URL(redirect).href;
            } catch (e) {
                logging.warn(e);
            }
        }

        if (!email) {
            throw new errors.BadRequestError({
                message: tpl(messages.emailRequired)
            });
        }

        if (!emailType) {
            // Default to subscribe form that also allows to login (safe fallback for older clients)
            if (!this._allowSelfSignup()) {
                emailType = 'signin';
            } else {
                emailType = 'subscribe';
            }
        }

        if (!['signin', 'signup', 'subscribe'].includes(emailType)) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        try {
            if (emailType === 'signup' || emailType === 'subscribe') {
                if (!this._allowSelfSignup()) {
                    throw new errors.BadRequestError({
                        message: tpl(messages.inviteOnly)
                    });
                }

                // Someone tries to signup with a user that already exists
                // -> doesn't really matter: we'll send a login link
                const tokenData = _.pick(req.body, ['labels', 'name', 'newsletters']);
                if (req.ip) {
                    tokenData.reqIp = req.ip;
                }
                // Save attribution data in the tokenData
                tokenData.attribution = await this._memberAttributionService.getAttribution(req.body.urlHistory);

                await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, referrer: referer});

                res.writeHead(201);
                return res.end('Created.');
            }

            // Signin
            const member = await this._memberRepository.get({email});
            if (member) {
                const tokenData = {};
                await this._sendEmailWithMagicLink({email, tokenData, requestedType: emailType, referrer: referer});
                res.writeHead(201);
                return res.end('Created.');
            }

            throw new errors.BadRequestError({
                message: this._allowSelfSignup() ? tpl(messages.memberNotFoundSignUp) : tpl(messages.memberNotFound)
            });
        } catch (err) {
            if (err.code === 'EENVELOPE') {
                logging.error(err);
                res.writeHead(400);
                return res.end('Bad Request.');
            }

            // Let the normal error middleware handle this error
            throw err;
        }
    }
};
