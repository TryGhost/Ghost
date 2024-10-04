const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const _ = require('lodash');
const {BadRequestError, NoPermissionError, UnauthorizedError, DisabledFeatureError} = require('@tryghost/errors');
const errors = require('@tryghost/errors');

const messages = {
    emailRequired: 'Email is required.',
    badRequest: 'Bad Request.',
    notFound: 'Not Found.',
    offerNotFound: 'This offer does not exist.',
    offerArchived: 'This offer is archived.',
    tierNotFound: 'This tier does not exist.',
    tierArchived: 'This tier is archived.',
    existingSubscription: 'A subscription exists for this Member.',
    unableToCheckout: 'Unable to initiate checkout session',
    inviteOnly: 'This site is invite-only, contact the owner for access.',
    memberNotFound: 'No member exists with this e-mail address.',
    memberNotFoundSignUp: 'No member exists with this e-mail address. Please sign up first.',
    invalidType: 'Invalid checkout type.',
    notConfigured: 'This site is not accepting payments at the moment.',
    invalidNewsletters: 'Cannot subscribe to invalid newsletters {newsletters}',
    archivedNewsletters: 'Cannot subscribe to archived newsletters {newsletters}'
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
     * @param {any} deps.newslettersService
     * @param {any} deps.sentry
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
        labsService,
        newslettersService,
        sentry
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
        this._newslettersService = newslettersService;
        this._sentry = sentry || undefined;
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
            logging.error(err);
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
            logging.error(err);
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        const member = email ? await this._memberRepository.get({email}) : null;

        if (!member) {
            res.writeHead(403);
            return res.end('Bad Request.');
        }

        const subscriptions = await member.related('stripeSubscriptions').fetch();

        const activeSubscription = subscriptions.models.find((sub) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.get('status'));
        });

        let currency = activeSubscription?.get('plan_currency') || undefined;

        let customer;
        if (!req.body.subscription_id) {
            customer = await this._stripeAPIService.getCustomerForMemberCheckoutSession(member);
        } else {
            const subscription = subscriptions.models.find((sub) => {
                return sub.get('subscription_id') === req.body.subscription_id;
            });

            if (!subscription) {
                res.writeHead(404, {
                    'Content-Type': 'text/plain;charset=UTF-8'
                });
                return res.end(`Could not find subscription ${req.body.subscription_id}`);
            }
            currency = subscription.get('plan_currency') || undefined;
            customer = await this._stripeAPIService.getCustomer(subscription.get('customer_id'));
        }

        const session = await this._stripeAPIService.createCheckoutSetupSession(customer, {
            successUrl: req.body.successUrl,
            cancelUrl: req.body.cancelUrl,
            subscription_id: req.body.subscription_id,
            currency
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

    async _setAttributionMetadata(metadata) {
        // Don't allow to set the source manually
        delete metadata.attribution_id;
        delete metadata.attribution_url;
        delete metadata.attribution_type;
        delete metadata.referrer_source;
        delete metadata.referrer_medium;
        delete metadata.referrer_url;

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
    }

    /**
     * Read the passed tier, offer and cadence from the request body and return the corresponding objects, or throws if validation fails
     * @returns
     */
    async _getSubscriptionCheckoutData(body) {
        const tierId = body.tierId;
        const offerId = body.offerId;

        let cadence = body.cadence;
        let tier;
        let offer;

        // Validate basic input
        if (!offerId && !tierId) {
            logging.error('[RouterController._getSubscriptionCheckoutData] Expected offerId or tierId, received none');
            throw new BadRequestError({
                message: tpl(messages.badRequest),
                context: 'Expected offerId or tierId, received none'
            });
        }

        if (offerId && tierId) {
            logging.error('[RouterController._getSubscriptionCheckoutData] Expected offerId or tierId, received both');
            throw new BadRequestError({
                message: tpl(messages.badRequest),
                context: 'Expected offerId or tierId, received both'
            });
        }

        if (tierId && !cadence) {
            logging.error('[RouterController._getSubscriptionCheckoutData] Expected cadence to be "month" or "year", received ', cadence);
            throw new BadRequestError({
                message: tpl(messages.badRequest),
                context: 'Expected cadence to be "month" or "year", received ' + cadence
            });
        }

        if (tierId && cadence && cadence !== 'month' && cadence !== 'year') {
            logging.error('[RouterController._getSubscriptionCheckoutData] Expected cadence to be "month" or "year", received ', cadence);
            throw new BadRequestError({
                message: tpl(messages.badRequest),
                context: 'Expected cadence to be "month" or "year", received "' + cadence + '"'
            });
        }

        // Fetch tier and offer
        if (offerId) {
            offer = await this._offersAPI.getOffer({id: offerId});

            if (!offer) {
                throw new BadRequestError({
                    message: tpl(messages.offerNotFound),
                    context: 'Offer with id "' + offerId + '" not found'
                });
            }

            tier = await this._tiersService.api.read(offer.tier.id);
            cadence = offer.cadence;
        } else if (tierId) {
            offer = null;

            try {
                // If the tierId is not a valid ID, the following line will throw
                tier = await this._tiersService.api.read(tierId);

                if (!tier) {
                    throw undefined;
                }
            } catch (err) {
                logging.error(err);
                this._sentry?.captureException?.(err);
                throw new BadRequestError({
                    message: tpl(messages.tierNotFound),
                    context: 'Tier with id "' + tierId + '" not found'
                });
            }
        }

        if (tier.status === 'archived') {
            throw new NoPermissionError({
                message: tpl(messages.tierArchived)
            });
        }

        return {
            tier,
            offer,
            cadence
        };
    }

    /**
     *
     * @param {object} options
     * @param {object} options.tier
     * @param {object} [options.offer]
     * @param {string} options.cadence
     * @param {string} options.successUrl URL to redirect to after successful checkout
     * @param {string} options.cancelUrl URL to redirect to after cancelled checkout
     * @param {string} [options.email] Email address of the customer
     * @param {object} [options.member] Currently authenticated member OR member associated with the email address
     * @param {boolean} options.isAuthenticated
     * @param {object} options.metadata Metadata to be passed to Stripe
     * @returns
     */
    async _createSubscriptionCheckoutSession(options) {
        if (options.offer) {
            // Attach offer information to stripe metadata for free trial offers
            // free trial offers don't have associated stripe coupons
            options.metadata.offer = options.offer.id;
        }

        if (!options.member && options.email) {
            // Create a signup link if there is no member with this email address
            options.successUrl = await this._magicLinkService.getMagicLink({
                tokenData: {
                    email: options.email,
                    attribution: {
                        id: options.metadata.attribution_id ?? null,
                        type: options.metadata.attribution_type ?? null,
                        url: options.metadata.attribution_url ?? null
                    }
                },
                type: 'signup',
                // Redirect to the original success url after sign up
                referrer: options.successUrl
            });
        }

        const restrictCheckout = options.member?.get('status') === 'paid';

        if (restrictCheckout) {
            // This member is already subscribed to a paid tier
            // We don't want to create a duplicate subscription
            if (!options.isAuthenticated && options.email) {
                try {
                    await this._sendEmailWithMagicLink({email: options.email, requestedType: 'signin'});
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
            const paymentLink = await this._paymentsService.getPaymentLink(options);

            return {url: paymentLink};
        } catch (err) {
            logging.error(err);
            this._sentry?.captureException?.(err);
            throw new BadRequestError({
                err,
                message: tpl(messages.unableToCheckout)
            });
        }
    }

    /**
     *
     * @param {object} options
     * @param {string} options.successUrl URL to redirect to after successful checkout
     * @param {string} options.cancelUrl URL to redirect to after cancelled checkout
     * @param {string} [options.email] Email address of the customer
     * @param {object} [options.member] Currently authenticated member OR member associated with the email address
     * @param {boolean} options.isAuthenticated
     * @param {object} options.metadata Metadata to be passed to Stripe
     * @returns
     */
    async _createDonationCheckoutSession(options) {
        if (!this._paymentsService.stripeAPIService.configured) {
            throw new DisabledFeatureError({
                message: tpl(messages.notConfigured)
            });
        }

        try {
            const paymentLink = await this._paymentsService.getDonationPaymentLink(options);

            return {url: paymentLink};
        } catch (err) {
            logging.error(err);
            this._sentry?.captureException?.(err);
            throw new BadRequestError({
                err,
                message: tpl(messages.unableToCheckout)
            });
        }
    }

    async createCheckoutSession(req, res) {
        const type = req.body.type ?? 'subscription';
        const metadata = req.body.metadata ?? {};
        const identity = req.body.identity;
        const membersEnabled = true;

        // Check this checkout type is supported
        if (typeof type !== 'string' || !['subscription', 'donation'].includes(type)) {
            throw new BadRequestError({
                message: tpl(messages.invalidType)
            });
        }

        // Optional authentication
        let member;
        let isAuthenticated = false;
        if (membersEnabled) {
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
                        isAuthenticated = true;
                    }
                } catch (err) {
                    logging.error(err);
                    this._sentry?.captureException?.(err);
                    throw new UnauthorizedError({err});
                }
            } else if (req.body.customerEmail) {
                member = await this._memberRepository.get({
                    email: req.body.customerEmail
                }, {
                    withRelated: ['stripeCustomers', 'products']
                });
            }
        }

        // Store attribution data in the metadata
        await this._setAttributionMetadata(metadata);

        // Build options
        const options = {
            successUrl: req.body.successUrl,
            cancelUrl: req.body.cancelUrl,
            email: req.body.customerEmail,
            member,
            metadata,
            isAuthenticated
        };

        let response;
        if (type === 'subscription') {
            if (!membersEnabled) {
                throw new BadRequestError({
                    message: tpl(messages.badRequest)
                });
            }

            // Get selected tier, offer and cadence
            const data = await this._getSubscriptionCheckoutData(req.body);

            // Check the checkout session
            response = await this._createSubscriptionCheckoutSession({
                ...options,
                ...data
            });
        } else if (type === 'donation') {
            response = await this._createDonationCheckoutSession(options);
        }

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return res.end(JSON.stringify(response));
    }

    async sendMagicLink(req, res) {
        const {email, honeypot, autoRedirect} = req.body;
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

        if (honeypot) {
            logging.warn('Honeypot field filled, this is likely a bot');

            // Honeypot field is filled, this is a bot.
            // Pretend that the email was sent successfully.
            res.writeHead(201);
            return res.end('Created.');
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

                // Validate requested newsletters
                let {newsletters: requestedNewsletters} = req.body;

                if (requestedNewsletters && requestedNewsletters.length > 0 && requestedNewsletters.every(newsletter => newsletter.name !== undefined)) {
                    const newsletterNames = requestedNewsletters.map(newsletter => newsletter.name);
                    const newsletterNamesFilter = newsletterNames.map(newsletter => `'${newsletter.replace(/("|')/g, '\\$1')}'`);
                    const newsletters = (await this._newslettersService.getAll({
                        filter: `name:[${newsletterNamesFilter}]`,
                        columns: ['id','name','status']
                    }));

                    if (newsletters.length !== newsletterNames.length) { //check for invalid newsletters
                        const validNewsletters = newsletters.map(newsletter => newsletter.name);
                        const invalidNewsletters = newsletterNames.filter(newsletter => !validNewsletters.includes(newsletter));

                        throw new errors.BadRequestError({
                            message: tpl(messages.invalidNewsletters, {newsletters: invalidNewsletters})
                        });
                    }

                    //validation for archived newsletters
                    const archivedNewsletters = newsletters
                        .filter(newsletter => newsletter.status === 'archived')
                        .map(newsletter => newsletter.name);
                    if (archivedNewsletters && archivedNewsletters.length > 0) {
                        throw new errors.BadRequestError({
                            message: tpl(messages.archivedNewsletters, {newsletters: archivedNewsletters})
                        });
                    }

                    requestedNewsletters = newsletters
                        .filter(newsletter => newsletter.status === 'active')
                        .map(newsletter => ({id: newsletter.id}));
                }

                // Someone tries to signup with a user that already exists
                // -> doesn't really matter: we'll send a login link
                const tokenData = _.pick(req.body, ['labels', 'name']);
                if (req.ip) {
                    tokenData.reqIp = req.ip;
                }
                tokenData.newsletters = requestedNewsletters;
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
            logging.error(err);

            // Let the normal error middleware handle this error
            throw err;
        }
    }
};
