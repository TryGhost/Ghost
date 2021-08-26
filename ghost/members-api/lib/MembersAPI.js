const {Router} = require('express');
const body = require('body-parser');
const MagicLink = require('@tryghost/magic-link');
const common = require('./common');

const StripeAPIService = require('./services/stripe-api');
const StripeWebhookService = require('./services/stripe-webhook');
const TokenService = require('./services/token');
const GeolocationSerice = require('./services/geolocation');
const MemberBREADService = require('./services/member-bread');
const MemberRepository = require('./repositories/member');
const EventRepository = require('./repositories/event');
const ProductRepository = require('./repositories/product');
const RouterController = require('./controllers/router');
const MemberController = require('./controllers/member');
const WellKnownController = require('./controllers/well-known');
const StripeMigrations = require('./migrations');

module.exports = function MembersAPI({
    tokenConfig: {
        issuer,
        privateKey,
        publicKey
    },
    auth: {
        allowSelfSignup = true,
        getSigninURL,
        tokenProvider
    },
    paymentConfig,
    mail: {
        transporter,
        getText,
        getHTML,
        getSubject
    },
    models: {
        StripeWebhook,
        StripeCustomer,
        StripeCustomerSubscription,
        Member,
        MemberSubscribeEvent,
        MemberLoginEvent,
        MemberPaidSubscriptionEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberProductEvent,
        MemberEmailChangeEvent,
        StripeProduct,
        StripePrice,
        Product,
        Settings
    },
    logger
}) {
    if (logger) {
        common.logging.setLogger(logger);
    }

    const stripeConfig = paymentConfig && paymentConfig.stripe || {};

    const stripeAPIService = new StripeAPIService({
        config: {
            secretKey: stripeConfig.secretKey,
            publicKey: stripeConfig.publicKey,
            appInfo: stripeConfig.appInfo,
            enablePromoCodes: stripeConfig.enablePromoCodes
        },
        logger
    });

    const stripeMigrations = new StripeMigrations({
        stripeAPIService,
        StripeCustomerSubscription,
        StripeProduct,
        StripePrice,
        Product,
        Settings,
        logger
    });

    const productRepository = new ProductRepository({
        Product,
        StripeProduct,
        StripePrice,
        stripeAPIService
    });

    const memberRepository = new MemberRepository({
        stripeAPIService,
        logger,
        productRepository,
        Member,
        MemberSubscribeEvent,
        MemberPaidSubscriptionEvent,
        MemberEmailChangeEvent,
        MemberStatusEvent,
        MemberProductEvent,
        StripeCustomer,
        StripeCustomerSubscription
    });

    const eventRepository = new EventRepository({
        logger,
        MemberSubscribeEvent,
        MemberPaidSubscriptionEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberLoginEvent
    });

    const memberBREADService = new MemberBREADService({
        memberRepository
    });

    const stripeWebhookService = new StripeWebhookService({
        StripeWebhook,
        stripeAPIService,
        productRepository,
        memberRepository,
        eventRepository,
        sendEmailWithMagicLink
    });

    const tokenService = new TokenService({
        privateKey,
        publicKey,
        issuer
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
        StripePrice,
        stripeAPIService,
        tokenService
    });

    const routerController = new RouterController({
        memberRepository,
        StripePrice,
        allowSelfSignup,
        magicLinkService,
        stripeAPIService,
        tokenService,
        sendEmailWithMagicLink,
        config: {
            checkoutSuccessUrl: stripeConfig.checkoutSuccessUrl,
            checkoutCancelUrl: stripeConfig.checkoutCancelUrl,
            billingSuccessUrl: stripeConfig.billingSuccessUrl,
            billingCancelUrl: stripeConfig.billingCancelUrl
        },
        logging: common.logging
    });

    const wellKnownController = new WellKnownController({
        tokenService,
        logging: common.logging
    });

    const ready = paymentConfig.stripe ? Promise.all([
        stripeMigrations.populateProductsAndPrices().then(() => {
            return stripeMigrations.populateStripePricesFromStripePlansSetting(stripeConfig.plans);
        }).then(() => {
            return stripeMigrations.populateMembersMonthlyPriceIdSettings();
        }).then(() => {
            return stripeMigrations.populateMembersYearlyPriceIdSettings();
        }).then(() => {
            return stripeMigrations.populateDefaultProductMonthlyPriceId();
        }).then(() => {
            return stripeMigrations.populateDefaultProductYearlyPriceId();
        }).then(() => {
            return stripeMigrations.revertPortalPlansSetting();
        }).then(() => {
            return stripeMigrations.removeInvalidSubscriptions();
        }),
        stripeWebhookService.configure({
            webhookSecret: process.env.WEBHOOK_SECRET,
            webhookHandlerUrl: stripeConfig.webhookHandlerUrl,
            webhook: stripeConfig.webhook || {}
        })
    ]) : Promise.resolve();

    async function hasActiveStripeSubscriptions() {
        const firstActiveSubscription = await StripeCustomerSubscription.findOne({
            status: 'active'
        });

        if (firstActiveSubscription) {
            return true;
        }

        const firstTrialingSubscription = await StripeCustomerSubscription.findOne({
            status: 'trialing'
        });

        if (firstTrialingSubscription) {
            return true;
        }

        const firstUnpaidSubscription = await StripeCustomerSubscription.findOne({
            status: 'unpaid'
        });

        if (firstUnpaidSubscription) {
            return true;
        }

        const firstPastDueSubscription = await StripeCustomerSubscription.findOne({
            status: 'past_due'
        });

        if (firstPastDueSubscription) {
            return true;
        }

        return false;
    }

    const users = memberRepository;

    async function sendEmailWithMagicLink({email, requestedType, tokenData, options = {forceEmailType: false}, requestSrc = ''}) {
        let type = requestedType;
        if (!options.forceEmailType) {
            const member = await users.get({email});
            if (member) {
                type = 'signin';
            } else if (type !== 'subscribe') {
                type = 'signup';
            }
        }
        return magicLinkService.sendMagicLink({email, type, requestSrc, tokenData: Object.assign({email}, tokenData)});
    }

    function getMagicLink(email) {
        return magicLinkService.getMagicLink({tokenData: {email}, type: 'signin'});
    }

    async function getMemberDataFromMagicLinkToken(token) {
        const {email, labels = [], name = '', oldEmail} = await magicLinkService.getDataFromToken(token);
        if (!email) {
            return null;
        }

        const member = oldEmail ? await getMemberIdentityData(oldEmail) : await getMemberIdentityData(email);

        if (member) {
            await MemberLoginEvent.add({member_id: member.id});
            if (oldEmail) {
                // user exists but wants to change their email address
                if (oldEmail) {
                    member.email = email;
                }
                await users.update(member, {id: member.id});
                return getMemberIdentityData(email);
            }
            return member;
        }

        const newMember = await users.create({name, email, labels});
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
            throw new common.errors.IncorrectUsageError({
                message: 'setMemberGeolocationFromIp() expects email and ip arguments to be present'
            });
        }

        // toJSON() is needed here otherwise users.update() will pick methods off
        // the model object rather than data and fail to edit correctly
        const member = (await users.get({email})).toJSON();

        if (!member) {
            throw new common.errors.NotFoundError({
                message: `Member with email address ${email} does not exist`
            });
        }

        // max request time is 500ms so shouldn't slow requests down too much
        let geolocation = JSON.stringify(await geolocationService.getGeolocationFromIP(ip));
        if (geolocation) {
            member.geolocation = geolocation;
            await users.update(member, {id: member.id});
        }

        return getMemberIdentityData(email);
    }

    const middleware = {
        sendMagicLink: Router().use(
            body.json(),
            (req, res) => routerController.sendMagicLink(req, res)
        ),
        createCheckoutSession: Router().use(
            body.json(),
            (req, res) => routerController.createCheckoutSession(req, res)
        ),
        createCheckoutSetupSession: Router().use(
            body.json(),
            (req, res) => routerController.createCheckoutSetupSession(req, res)
        ),
        updateSubscription: Router({mergeParams: true}).use(
            body.json(),
            (req, res) => memberController.updateSubscription(req, res)
        ),
        handleStripeWebhook: Router(),
        wellKnown: Router()
            .get('/jwks.json',
                (req, res) => wellKnownController.getPublicKeys(req, res)
            )
    };

    middleware.handleStripeWebhook.use(body.raw({type: 'application/json'}), async function (req, res) {
        if (!stripeAPIService) {
            common.logging.error(`Stripe not configured, not handling webhook`);
            res.writeHead(400);
            return res.end();
        }

        if (!req.body || !req.headers['stripe-signature']) {
            res.writeHead(400);
            return res.end();
        }
        let event;
        try {
            event = stripeWebhookService.parseWebhook(req.body, req.headers['stripe-signature']);
        } catch (err) {
            common.logging.error(err);
            res.writeHead(401);
            return res.end();
        }
        common.logging.info(`Handling webhook ${event.type}`);
        try {
            await stripeWebhookService.handleWebhook(event);
            res.writeHead(200);
            res.end();
        } catch (err) {
            common.logging.error(`Error handling webhook ${event.type}`, err);
            res.writeHead(err.statusCode || 500);
            res.end();
        }
    });

    const getPublicConfig = function () {
        return Promise.resolve({
            publicKey,
            issuer
        });
    };

    const bus = new (require('events').EventEmitter)();

    ready.then(() => {
        bus.emit('ready');
    }).catch((err) => {
        bus.emit('error', err);
    });

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
        hasActiveStripeSubscriptions,
        members: users,
        memberBREADService,
        events: eventRepository,
        productRepository
    };
};
