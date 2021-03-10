const {Router} = require('express');
const body = require('body-parser');
const MagicLink = require('@tryghost/magic-link');
const common = require('./lib/common');

const StripeAPIService = require('./lib/services/stripe-api');
const StripePlansService = require('./lib/services/stripe-plans');
const StripeWebhookService = require('./lib/services/stripe-webhook');
const TokenService = require('./lib/services/token');
const GeolocationSerice = require('./lib/services/geolocation');
const MemberRepository = require('./lib/repositories/member');
const EventRepository = require('./lib/repositories/event');
const RouterController = require('./lib/controllers/router');

module.exports = function MembersApi({
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
        MemberEmailChangeEvent
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

    const stripePlansService = new StripePlansService({
        stripeAPIService
    });

    const memberRepository = new MemberRepository({
        stripeAPIService,
        stripePlansService,
        logger,
        Member,
        MemberSubscribeEvent,
        MemberPaidSubscriptionEvent,
        MemberEmailChangeEvent,
        MemberStatusEvent,
        StripeCustomer,
        StripeCustomerSubscription
    });

    const eventRepository = new EventRepository({
        logger,
        MemberSubscribeEvent,
        MemberPaidSubscriptionEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberLoginEvent,
        MemberEmailChangeEvent
    });

    const stripeWebhookService = new StripeWebhookService({
        StripeWebhook,
        stripeAPIService,
        stripePlansService,
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

    const routerController = new RouterController({
        memberRepository,
        allowSelfSignup,
        magicLinkService,
        stripeAPIService,
        stripePlansService,
        tokenService,
        sendEmailWithMagicLink,
        config: {
            checkoutSuccessUrl: stripeConfig.checkoutSuccessUrl,
            checkoutCancelUrl: stripeConfig.checkoutCancelUrl,
            billingSuccessUrl: stripeConfig.billingSuccessUrl,
            billingCancelUrl: stripeConfig.billingCancelUrl
        }
    });

    const ready = paymentConfig.stripe ? Promise.all([
        stripePlansService.configure({
            product: stripeConfig.product,
            plans: stripeConfig.plans,
            mode: process.env.NODE_ENV || 'development'
        }),
        stripeWebhookService.configure({
            webhookSecret: process.env.WEBHOOK_SECRET,
            webhookHandlerUrl: stripeConfig.webhookHandlerUrl,
            webhook: stripeConfig.webhook || {},
            mode: process.env.NODE_ENV || 'development'
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
        const model = await users.get({email}, {withRelated: ['stripeSubscriptions', 'stripeSubscriptions.customer']});
        if (!model) {
            return null;
        }
        return model.toJSON();
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

        const member = await users.get({email}, {
            withRelated: ['labels']
        });

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
            (req, res) => routerController.updateSubscription(req, res)
        ),
        handleStripeWebhook: Router()
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
        events: eventRepository
    };
};
