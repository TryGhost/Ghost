const {Router} = require('express');
const body = require('body-parser');
const MagicLink = require('@tryghost/magic-link');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const MemberAnalyticsService = require('@tryghost/member-analytics-service');
const MembersAnalyticsIngress = require('@tryghost/members-analytics-ingress');
const PaymentsService = require('@tryghost/members-payments');

const TokenService = require('./services/token');
const GeolocationSerice = require('./services/geolocation');
const MemberBREADService = require('./services/member-bread');
const MemberRepository = require('./repositories/member');
const EventRepository = require('./repositories/event');
const ProductRepository = require('./repositories/product');
const RouterController = require('./controllers/router');
const MemberController = require('./controllers/member');
const WellKnownController = require('./controllers/well-known');

module.exports = function MembersAPI({
    tokenConfig: {
        issuer,
        privateKey,
        publicKey
    },
    auth: {
        allowSelfSignup = () => true,
        getSigninURL,
        tokenProvider
    },
    mail: {
        transporter,
        getText,
        getHTML,
        getSubject
    },
    models: {
        EmailRecipient,
        StripeCustomer,
        StripeCustomerSubscription,
        Member,
        MemberCancelEvent,
        MemberSubscribeEvent,
        MemberLoginEvent,
        MemberPaidSubscriptionEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberProductEvent,
        MemberEmailChangeEvent,
        MemberAnalyticEvent,
        MemberCreatedEvent,
        SubscriptionCreatedEvent,
        MemberLinkClickEvent,
        Offer,
        OfferRedemption,
        StripeProduct,
        StripePrice,
        Product,
        Settings,
        Comment
    },
    stripeAPIService,
    offersAPI,
    labsService,
    newslettersService,
    memberAttributionService
}) {
    const tokenService = new TokenService({
        privateKey,
        publicKey,
        issuer
    });

    const memberAnalyticsService = MemberAnalyticsService.create(MemberAnalyticEvent);
    memberAnalyticsService.eventHandler.setupSubscribers();

    const productRepository = new ProductRepository({
        Product,
        Settings,
        StripeProduct,
        StripePrice,
        stripeAPIService
    });

    const memberRepository = new MemberRepository({
        stripeAPIService,
        tokenService,
        newslettersService,
        labsService,
        productRepository,
        Member,
        MemberCancelEvent,
        MemberSubscribeEventModel: MemberSubscribeEvent,
        MemberPaidSubscriptionEvent,
        MemberEmailChangeEvent,
        MemberStatusEvent,
        MemberProductEvent,
        OfferRedemption,
        StripeCustomer,
        StripeCustomerSubscription,
        offerRepository: offersAPI.repository
    });

    const eventRepository = new EventRepository({
        EmailRecipient,
        MemberSubscribeEvent,
        MemberPaidSubscriptionEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberLoginEvent,
        MemberCreatedEvent,
        SubscriptionCreatedEvent,
        MemberLinkClickEvent,
        Comment,
        labsService,
        memberAttributionService
    });

    const memberBREADService = new MemberBREADService({
        offersAPI,
        memberRepository,
        emailService: {
            async sendEmailWithMagicLink({email, requestedType}) {
                return sendEmailWithMagicLink({
                    email,
                    requestedType,
                    options: {
                        forceEmailType: true
                    }
                });
            }
        },
        labsService,
        stripeService: stripeAPIService,
        memberAttributionService
    });

    const geolocationService = new GeolocationSerice();

    const magicLinkService = new MagicLink({
        transporter,
        tokenProvider,
        getSigninURL,
        getText,
        getHTML,
        getSubject
    });

    const memberController = new MemberController({
        memberRepository,
        productRepository,
        StripePrice,
        tokenService,
        sendEmailWithMagicLink
    });

    const paymentsService = new PaymentsService({
        Offer,
        offersAPI,
        stripeAPIService
    });

    const routerController = new RouterController({
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
        memberAttributionService,
        labsService
    });

    const wellKnownController = new WellKnownController({
        tokenService
    });

    const users = memberRepository;

    async function sendEmailWithMagicLink({email, requestedType, tokenData, options = {forceEmailType: false}, referrer = null}) {
        let type = requestedType;
        if (!options.forceEmailType) {
            const member = await users.get({email});
            if (member) {
                type = 'signin';
            } else if (type !== 'subscribe') {
                type = 'signup';
            }
        }
        return magicLinkService.sendMagicLink({email, type, tokenData: Object.assign({email, type}, tokenData), referrer});
    }

    /**
     * 
     * @param {string} email 
     * @param {'signin'|'signup'} type When you specify 'signin' this will prevent the creation of a new member if no member is found with the provided email
     * @param {*} [tokenData] Optional token data to add to the token
     * @returns 
     */
    function getMagicLink(email, type, tokenData = {}) {
        return magicLinkService.getMagicLink({
            tokenData: {email, ...tokenData}, 
            type
        });
    }

    async function getTokenDataFromMagicLinkToken(token) {
        return await magicLinkService.getDataFromToken(token);
    }

    async function getMemberDataFromMagicLinkToken(token) {
        const {email, labels = [], name = '', oldEmail, newsletters, attribution, reqIp, type} = await getTokenDataFromMagicLinkToken(token);
        if (!email) {
            return null;
        }

        const member = oldEmail ? await getMemberIdentityData(oldEmail) : await getMemberIdentityData(email);

        if (member) {
            await MemberLoginEvent.add({member_id: member.id});
            if (oldEmail && (!type || type === 'updateEmail')) {
                // user exists but wants to change their email address
                await users.update({email}, {id: member.id});
                return getMemberIdentityData(email);
            }
            return member;
        }

        // Note: old tokens can still have a missing type (we can remove this after a couple of weeks)
        if (type && !['signup', 'subscribe'].includes(type)) {
            // Don't allow sign up
            // Note that we use the type from inside the magic token so this behaviour can't be changed
            return null;
        }

        let geolocation;
        if (reqIp) {
            try {
                geolocation = JSON.stringify(await geolocationService.getGeolocationFromIP(reqIp));
            } catch (err) {
                logging.warn(err);
                // no-op, we don't want to stop anything working due to
                // geolocation lookup failing
            }
        }

        const newMember = await users.create({name, email, labels, newsletters, attribution, geolocation});

        await MemberLoginEvent.add({member_id: newMember.id});
        return getMemberIdentityData(email);
    }

    async function getMemberIdentityData(email) {
        return memberBREADService.read({email});
    }

    async function getMemberIdentityToken(email) {
        const member = await getMemberIdentityData(email);
        if (!member) {
            return null;
        }
        return tokenService.encodeIdentityToken({sub: member.email});
    }

    async function setMemberGeolocationFromIp(email, ip) {
        if (!email || !ip) {
            throw new errors.IncorrectUsageError({
                message: 'setMemberGeolocationFromIp() expects email and ip arguments to be present'
            });
        }

        // toJSON() is needed here otherwise users.update() will pick methods off
        // the model object rather than data and fail to edit correctly
        const member = (await users.get({email})).toJSON();

        if (!member) {
            throw new errors.NotFoundError({
                message: `Member with email address ${email} does not exist`
            });
        }

        // max request time is 500ms so shouldn't slow requests down too much
        let geolocation = JSON.stringify(await geolocationService.getGeolocationFromIP(ip));
        if (geolocation) {
            await users.update({geolocation}, {id: member.id});
        }

        return getMemberIdentityData(email);
    }

    const forwardError = fn => async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    const middleware = {
        sendMagicLink: Router().use(
            body.json(),
            forwardError((req, res) => routerController.sendMagicLink(req, res))
        ),
        createCheckoutSession: Router().use(
            body.json(),
            forwardError((req, res) => routerController.createCheckoutSession(req, res))
        ),
        createCheckoutSetupSession: Router().use(
            body.json(),
            forwardError((req, res) => routerController.createCheckoutSetupSession(req, res))
        ),
        createEvents: Router().use(
            body.json(),
            forwardError((req, res) => MembersAnalyticsIngress.createEvents(req, res))
        ),
        updateEmailAddress: Router().use(
            body.json(),
            forwardError((req, res) => memberController.updateEmailAddress(req, res))
        ),
        updateSubscription: Router({mergeParams: true}).use(
            body.json(),
            forwardError((req, res) => memberController.updateSubscription(req, res))
        ),
        wellKnown: Router()
            .get('/jwks.json',
                (req, res) => wellKnownController.getPublicKeys(req, res)
            )
    };

    const getPublicConfig = function () {
        return Promise.resolve({
            publicKey,
            issuer
        });
    };

    const bus = new (require('events').EventEmitter)();

    bus.emit('ready');

    return {
        middleware,
        getMemberDataFromMagicLinkToken,
        getMemberIdentityToken,
        getMemberIdentityData,
        setMemberGeolocationFromIp,
        getPublicConfig,
        bus,
        sendEmailWithMagicLink,
        getMagicLink,
        members: users,
        memberBREADService,
        events: eventRepository,
        productRepository,

        // Test helpers
        getTokenDataFromMagicLinkToken
    };
};
