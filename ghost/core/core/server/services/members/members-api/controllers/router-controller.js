const dns = require('node:dns/promises');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const sanitizeHtml = require('sanitize-html');
const {BadRequestError, NoPermissionError, UnauthorizedError, DisabledFeatureError, NotFoundError} = require('@tryghost/errors');
const errors = require('@tryghost/errors');
const {isEmail} = require('@tryghost/validator');
const normalizeEmail = require('../utils/normalize-email');
const {getSniperLinks} = require('../../../../lib/get-sniper-links');

const messages = {
    emailRequired: 'Email is required.',
    invalidEmail: 'Email is not valid',
    blockedEmailDomain: 'Signups from this email domain are currently restricted.',
    badRequest: 'Bad Request.',
    notFound: 'Not Found.',
    offerNotFound: 'This offer does not exist.',
    offerArchived: 'This offer is archived.',
    tierNotFound: 'This tier does not exist.',
    tierArchived: 'This tier is archived.',
    existingSubscription: 'A subscription exists for this Member.',
    unableToCheckout: 'Unable to initiate checkout session',
    inviteOnly: 'This site is invite-only, contact the owner for access.',
    paidOnly: 'This site only accepts paid members.',
    memberNotFound: 'No member exists with this e-mail address.',
    memberNotFoundSignUp: 'No member exists with this e-mail address. Please sign up first.',
    invalidType: 'Invalid checkout type.',
    notConfigured: 'This site is not accepting payments at the moment.',
    invalidNewsletters: 'Cannot subscribe to invalid newsletters {newsletters}',
    archivedNewsletters: 'Cannot subscribe to archived newsletters {newsletters}',
    otcNotSupported: 'OTC verification not supported.',
    invalidCode: 'Invalid verification code.',
    failedToVerifyCode: 'Failed to verify code, please try again.'
};

// helper utility for logic shared between sendMagicLink and verifyOTC
function extractRefererOrRedirect(req) {
    const {autoRedirect, redirect} = req.body;

    if (autoRedirect === false) {
        return null;
    }

    if (redirect) {
        try {
            return new URL(redirect).href;
        } catch (e) {
            logging.warn(e);
        }
    }

    return req.get('referer') || null;
}

module.exports = class RouterController {
    #sniperLinksDnsResolver = new dns.Resolver({maxTimeout: 1000});

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
     * @param {any} deps.settingsCache
     * @param {any} deps.settingsHelpers
     * @param {any} deps.urlUtils
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
        sentry,
        settingsCache,
        settingsHelpers,
        urlUtils
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
        this._settingsCache = settingsCache;
        this._settingsHelpers = settingsHelpers;
        this._urlUtils = urlUtils;
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

    async createBillingPortalSession(req, res) {
        const identity = req.body.identity;

        if (!identity) {
            res.writeHead(400);
            return res.end();
        }

        let email;
        try {
            const claims = await this._tokenService.decodeToken(identity);
            email = claims && claims.sub;
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

            customer = await this._stripeAPIService.getCustomer(subscription.get('customer_id'));
        }

        const configurationId = this._settingsCache.get('stripe_billing_portal_configuration_id');

        const session = await this._stripeAPIService.createBillingPortalSession(customer, {
            returnUrl: req.body.returnUrl,
            ...(configurationId && {configurationId})
        });
        const sessionInfo = {
            url: session.url
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
        delete metadata.utm_source;
        delete metadata.utm_medium;
        delete metadata.utm_campaign;
        delete metadata.utm_term;
        delete metadata.utm_content;

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

            // UTM parameters
            if (attribution.utmSource) {
                metadata.utm_source = attribution.utmSource;
            }

            if (attribution.utmMedium) {
                metadata.utm_medium = attribution.utmMedium;
            }

            if (attribution.utmCampaign) {
                metadata.utm_campaign = attribution.utmCampaign;
            }

            if (attribution.utmTerm) {
                metadata.utm_term = attribution.utmTerm;
            }

            if (attribution.utmContent) {
                metadata.utm_content = attribution.utmContent;
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
        if (options.tier && options.tier.id === 'free') {
            throw new BadRequestError({
                message: tpl(messages.badRequest)
            });
        }

        const tier = options.tier;

        if (!tier) {
            throw new NotFoundError({
                message: tpl(messages.tierNotFound)
            });
        }

        if (tier.status === 'archived') {
            throw new NoPermissionError({
                message: tpl(messages.tierArchived)
            });
        }

        if (options.offer) {
            // Attach offer information to stripe metadata for free trial offers
            // free trial offers don't have associated stripe coupons
            options.metadata.offer = options.offer.id;
        }

        const member = options.member;

        if (!member && options.email) {
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

        if (member) {
            options.successUrl = this._generateSuccessUrl(options.successUrl, tier.welcomePageURL);

            const restrictCheckout = member.get('status') === 'paid';

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

    // Helper method to generate success URL with tier welcome page if available
    _generateSuccessUrl(originalSuccessUrl, welcomePageURL) {
        // If there's no welcome page URL, use the original success URL
        if (!welcomePageURL) {
            return originalSuccessUrl;
        }

        try {
            // Create URL objects
            const siteUrl = this._urlUtils.getSiteUrl();

            // This will throw if welcomePageURL is invalid
            const welcomeUrl = new URL(
                welcomePageURL.startsWith('http') ? welcomePageURL : welcomePageURL,
                siteUrl
            );

            // Add success parameters
            welcomeUrl.searchParams.set('success', 'true');
            welcomeUrl.searchParams.set('action', 'signup');

            return welcomeUrl.href;
        } catch (err) {
            logging.warn(`Invalid welcome page URL "${welcomePageURL}", using original success URL`, err);
            return originalSuccessUrl;
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

        if (metadata.newsletters) {
            metadata.newsletters = JSON.stringify(await this._validateNewsletters(JSON.parse(metadata.newsletters)));
        }

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

            // Add welcome_page_url to the response if available and member is authenticated
            if (isAuthenticated && data.tier && data.tier.welcomePageURL) {
                response.welcomePageUrl = data.tier.welcomePageURL;
            }
        } else if (type === 'donation') {
            options.personalNote = parsePersonalNote(req.body.personalNote);
            response = await this._createDonationCheckoutSession(options);
        }

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return res.end(JSON.stringify(response));
    }

    async sendMagicLink(req, res) {
        const {email, honeypot} = req.body;
        let {emailType} = req.body;

        const referrer = extractRefererOrRedirect(req);

        if (!email) {
            throw new errors.BadRequestError({
                message: tpl(messages.emailRequired)
            });
        }

        if (!isEmail(email)) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidEmail)
            });
        }

        // Normalize email to avoid invalid addresses and mitigate homograph attacks
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidEmail)
            });
        }

        if (honeypot) {
            logging.warn('Honeypot field filled, this is likely a bot');

            // Honeypot field is filled, this is a bot.
            // Pretend that the email was sent successfully.
            res.writeHead(201);
            return res.end('{}');
        }

        if (!emailType) {
            // Default to subscribe form that also allows to login (safe fallback for older clients)
            emailType = 'subscribe';
        }

        if (!['signin', 'signup', 'subscribe'].includes(emailType)) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        try {
            /** @type {{sniperLinks?: {desktop: string; android: string}; otc_ref?: string}} */
            const resBody = {};

            if (emailType === 'signup' || emailType === 'subscribe') {
                await this._handleSignup(req, normalizedEmail, referrer);
            } else {
                const signIn = await this._handleSignin(req, normalizedEmail, referrer);
                if (signIn.otcRef) {
                    resBody.otc_ref = signIn.otcRef;
                }
            }

            const sniperLinks = await getSniperLinks({
                recipient: normalizedEmail,
                sender: this._settingsHelpers.getMembersSupportAddress(),
                dnsResolver: this.#sniperLinksDnsResolver
            });
            if (sniperLinks) {
                resBody.sniperLinks = sniperLinks;
            }

            res.writeHead(201, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify(resBody));
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

    async verifyOTC(req, res) {
        const {otc, otcRef} = req.body;

        if (!otc || !otcRef) {
            throw new errors.BadRequestError({
                message: tpl(messages.badRequest),
                context: 'otc and otcRef are required',
                code: 'OTC_VERIFICATION_MISSING_PARAMS'
            });
        }

        const tokenProvider = this._magicLinkService.tokenProvider;
        if (!tokenProvider || typeof tokenProvider.verifyOTC !== 'function') {
            throw new errors.BadRequestError({
                message: tpl(messages.otcNotSupported),
                code: 'OTC_NOT_SUPPORTED'
            });
        }

        const tokenValue = await tokenProvider.getTokenByRef(otcRef);
        if (!tokenValue) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidCode),
                code: 'INVALID_OTC_REF'
            });
        }

        const isValidOTC = await tokenProvider.verifyOTC(otcRef, otc);
        if (!isValidOTC) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidCode),
                code: 'INVALID_OTC'
            });
        }

        const otcVerificationHash = await this._createHashFromOTCAndToken(otc, tokenValue);
        if (!otcVerificationHash) {
            throw new errors.BadRequestError({
                message: tpl(messages.failedToVerifyCode),
                code: 'OTC_VERIFICATION_FAILED'
            });
        }

        const referrer = extractRefererOrRedirect(req);

        const redirectUrl = this._magicLinkService.getSigninURL(tokenValue, 'signin', referrer, otcVerificationHash);
        if (!redirectUrl) {
            throw new errors.BadRequestError({
                message: tpl(messages.failedToVerifyCode),
                code: 'OTC_VERIFICATION_FAILED'
            });
        }

        return res.json({redirectUrl});
    }

    async _createHashFromOTCAndToken(otc, token) {
        // timestamp for anti-replay protection (5 minute window)
        const timestamp = Math.floor(Date.now() / 1000);

        const hash = this._magicLinkService.tokenProvider.createOTCVerificationHash(otc, token, timestamp);

        return `${timestamp}:${hash}`;
    }

    async _handleSignup(req, normalizedEmail, referrer = null) {
        if (!this._allowSelfSignup()) {
            if (this._settingsCache.get('members_signup_access') === 'paid') {
                throw new errors.BadRequestError({
                    message: tpl(messages.paidOnly)
                });
            } else {
                throw new errors.BadRequestError({
                    message: tpl(messages.inviteOnly)
                });
            }
        }

        const blockedEmailDomains = this._settingsCache.get('all_blocked_email_domains');
        const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase();
        if (emailDomain && blockedEmailDomains.includes(emailDomain)) {
            throw new errors.BadRequestError({
                message: tpl(messages.blockedEmailDomain)
            });
        }

        const {emailType} = req.body;

        const tokenData = {
            labels: req.body.labels,
            name: req.body.name,
            reqIp: req.ip ?? undefined,
            newsletters: await this._validateNewsletters(req.body?.newsletters ?? []),
            attribution: await this._memberAttributionService.getAttribution(req.body.urlHistory)
        };

        return await this._sendEmailWithMagicLink({email: normalizedEmail, tokenData, requestedType: emailType, referrer});
    }

    async _handleSignin(req, normalizedEmail, referrer = null) {
        const {emailType, includeOTC: reqIncludeOTC} = req.body;

        let includeOTC = false;

        if (reqIncludeOTC === true || reqIncludeOTC === 'true') {
            includeOTC = true;
        }

        const member = await this._memberRepository.get({email: normalizedEmail});

        if (!member) {
            throw new errors.BadRequestError({
                message: this._allowSelfSignup() ? tpl(messages.memberNotFoundSignUp) : tpl(messages.memberNotFound)
            });
        }

        const tokenData = {};
        return await this._sendEmailWithMagicLink({email: normalizedEmail, tokenData, requestedType: emailType, referrer, includeOTC});
    }

    /**
     * Validates the newsletters in the request body
     * @param {object[]} requestedNewsletters
     * @param {string} requestedNewsletters[].name
     * @returns {Promise<object[] | undefined>} The validated newsletters
     */
    async _validateNewsletters(requestedNewsletters) {
        if (!requestedNewsletters || requestedNewsletters.length === 0) {
            return undefined;
        }

        if (requestedNewsletters.some(newsletter => !newsletter.name)) {
            return undefined;
        }

        const requestedNewsletterNames = requestedNewsletters.map(newsletter => newsletter.name);
        const requestedNewsletterNamesFilter = requestedNewsletterNames.map(newsletter => `'${newsletter.replace(/("|')/g, '\\$1')}'`);
        const matchedNewsletters = (await this._newslettersService.getAll({
            filter: `name:[${requestedNewsletterNamesFilter}]`,
            columns: ['id','name','status']
        }));

        // Check for invalid newsletters
        if (matchedNewsletters.length !== requestedNewsletterNames.length) {
            const validNewsletterNames = matchedNewsletters.map(newsletter => newsletter.name);
            const invalidNewsletterNames = requestedNewsletterNames.filter(newsletter => !validNewsletterNames.includes(newsletter));

            throw new errors.BadRequestError({
                message: tpl(messages.invalidNewsletters, {newsletters: invalidNewsletterNames})
            });
        }

        // Check for archived newsletters
        const requestedArchivedNewsletters = matchedNewsletters
            .filter(newsletter => newsletter.status === 'archived')
            .map(newsletter => newsletter.name);

        if (requestedArchivedNewsletters && requestedArchivedNewsletters.length > 0) {
            throw new errors.BadRequestError({
                message: tpl(messages.archivedNewsletters, {newsletters: requestedArchivedNewsletters})
            });
        }

        return matchedNewsletters
            .filter(newsletter => newsletter.status === 'active')
            .map(newsletter => ({id: newsletter.id}));
    }

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async getMemberOffers(req, res) {
        const identity = req.body.identity;
        const redemptionType = req.body.redemption_type || 'retention';

        function sendOffersResponse(offers = []) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify({offers}));
        }

        if (!identity) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        if (redemptionType !== 'retention') {
            res.writeHead(400);
            return res.end('Invalid redemption_type');
        }

        let email;
        try {
            const claims = await this._tokenService.decodeToken(identity);
            email = claims && claims.sub;
        } catch (err) {
            logging.error(err);
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        if (!email) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        // Get member with subscriptions
        const member = await this._memberRepository.get({email}, {
            withRelated: [
                'stripeSubscriptions',
                'stripeSubscriptions.stripePrice',
                'stripeSubscriptions.stripePrice.stripeProduct',
                'stripeSubscriptions.stripePrice.stripeProduct.product'
            ]
        });

        if (!member) {
            res.writeHead(404);
            return res.end(tpl(messages.memberNotFound));
        }

        // Find active subscriptions
        const subscriptions = member.related('stripeSubscriptions');
        const activeSubscriptions = subscriptions.models.filter((sub) => {
            const status = sub.get('status');
            return ['active', 'trialing', 'past_due', 'unpaid'].includes(status);
        });

        // No active subscription - return empty offers
        if (activeSubscriptions.length === 0) {
            return sendOffersResponse();
        }

        // Multiple active subscriptions - edge case, return empty offers to avoid ambiguity
        if (activeSubscriptions.length > 1) {
            return sendOffersResponse();
        }

        const activeSubscription = activeSubscriptions[0];

        // If subscription already has an offer applied (e.g. signup offer), don't show retention offers
        if (activeSubscription.get('offer_id')) {
            return sendOffersResponse();
        }

        // If subscription is in a trial period (either offer-based or tier-based), don't show retention offers
        const trialEndAt = activeSubscription.get('trial_end_at');
        if (trialEndAt && trialEndAt > new Date()) {
            return sendOffersResponse();
        }

        // Get tier and cadence from the subscription
        const stripePrice = activeSubscription.related('stripePrice');
        if (!stripePrice || !stripePrice.id) {
            return sendOffersResponse();
        }

        const stripeProduct = stripePrice.related('stripeProduct');

        // If the stripe product is not found, return empty offers
        if (!stripeProduct || !stripeProduct.id) {
            return sendOffersResponse();
        }

        const product = stripeProduct.related('product');

        // If the product is not found, return empty offers
        if (!product || !product.id) {
            return sendOffersResponse();
        }

        const tierId = product.id;
        const cadence = stripePrice.get('interval');
        const subscriptionId = activeSubscription.id; // Ghost's internal ID, not Stripe's

        let offers = [];
        try {
            offers = await this._offersAPI.listOffersAvailableToSubscription({
                subscriptionId,
                tierId,
                cadence,
                redemptionType
            });
        } catch (err) {
            logging.error('Failed to fetch offers:', err);
        }

        return sendOffersResponse(offers);
    }
};

function parsePersonalNote(rawText) {
    if (rawText && typeof rawText !== 'string') {
        logging.warn('Donation personal note is not a string, ignoring');
        return '';
    }
    if (rawText && rawText.length > 255) {
        logging.warn('Donation personal note is too long, ignoring:', rawText);
        return '';
    }

    const safeInput = sanitizeHtml(rawText, {
        allowedTags: [],
        allowedAttributes: {}
    });

    return safeInput;
}
