const _ = require('lodash');
const {Router} = require('express');
const body = require('body-parser');
const MagicLink = require('@tryghost/magic-link');
const StripePaymentProcessor = require('./lib/stripe');
const Tokens = require('./lib/tokens');
const Users = require('./lib/users');
const Metadata = require('./lib/metadata');
const common = require('./lib/common');
const {getGeolocationFromIP} = require('./lib/geolocation');

module.exports = function MembersApi({
    tokenConfig: {
        issuer,
        privateKey,
        publicKey
    },
    auth: {
        allowSelfSignup = true,
        getSigninURL,
        secret
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
        Member
    },
    logger
}) {
    if (logger) {
        common.logging.setLogger(logger);
    }

    const {encodeIdentityToken, decodeToken} = Tokens({privateKey, publicKey, issuer});
    const metadata = Metadata({
        Member,
        StripeWebhook,
        StripeCustomer,
        StripeCustomerSubscription
    });

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

        return false;
    }

    const stripeStorage = {
        async get(member) {
            return metadata.getMetadata('stripe', member);
        },
        async set(data) {
            return metadata.setMetadata('stripe', data);
        }
    };
    const stripe = paymentConfig.stripe ? new StripePaymentProcessor(paymentConfig.stripe, stripeStorage, common.logging) : null;

    async function ensureStripe(_req, res, next) {
        if (!stripe) {
            res.writeHead(400);
            return res.end('Stripe not configured');
        }
        try {
            await stripe.ready();
            next();
        } catch (err) {
            res.writeHead(500);
            return res.end('There was an error configuring stripe');
        }
    }

    const magicLinkService = new MagicLink({
        transporter,
        secret,
        getSigninURL,
        getText,
        getHTML,
        getSubject
    });

    async function sendEmailWithMagicLink({email, requestedType, payload, options = {forceEmailType: false}}) {
        if (options.forceEmailType) {
            return magicLinkService.sendMagicLink({email, payload, subject: email, type: requestedType});
        }
        const member = await users.get({email});
        if (member) {
            return magicLinkService.sendMagicLink({email, payload, subject: email, type: 'signin'});
        } else {
            const type = requestedType === 'subscribe' ? 'subscribe' : 'signup';
            return magicLinkService.sendMagicLink({email, payload, subject: email, type});
        }
    }

    function getMagicLink(email) {
        return magicLinkService.getMagicLink({email, subject: email, type: 'signin'});
    }

    const users = Users({
        stripe,
        Member
    });

    async function getMemberDataFromMagicLinkToken(token) {
        const email = await magicLinkService.getUserFromToken(token);
        const {labels = [], name = '', oldEmail} = await magicLinkService.getPayloadFromToken(token);
        if (!email) {
            return null;
        }

        const member = oldEmail ? await getMemberIdentityData(oldEmail) : await getMemberIdentityData(email);

        if (member) {
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

        await users.create({name, email, labels});
        return getMemberIdentityData(email);
    }

    async function getMemberIdentityData(email) {
        return users.get({email});
    }

    async function getMemberIdentityToken(email) {
        const member = await getMemberIdentityData(email);
        if (!member) {
            return null;
        }
        return encodeIdentityToken({sub: member.email});
    }

    async function setMemberGeolocationFromIp(email, ip) {
        if (!email || !ip) {
            return Promise.reject(new common.errors.IncorrectUsageError({
                message: 'setMemberGeolocationFromIp() expects email and ip arguments to be present'
            }));
        }

        const member = await getMemberIdentityData(email);

        if (!member) {
            return Promise.reject(new common.errors.NotFoundError({
                message: `Member with email address ${email} does not exist`
            }));
        }

        // max request time is 500ms so shouldn't slow requests down too much
        let geolocation = JSON.stringify(await getGeolocationFromIP(ip));
        if (geolocation) {
            member.geolocation = geolocation;
            await users.update(member, {id: member.id});
        }

        return getMemberIdentityData(email);
    }

    const middleware = {
        sendMagicLink: Router(),
        createCheckoutSession: Router(),
        createCheckoutSetupSession: Router(),
        handleStripeWebhook: Router(),
        updateSubscription: Router({mergeParams: true})
    };

    middleware.sendMagicLink.use(body.json(), async function (req, res) {
        const {email, emailType, oldEmail} = req.body;
        const payload = {};

        if (!email) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        try {
            if (oldEmail) {
                const existingMember = await users.get({email});
                if (existingMember) {
                    throw new common.errors.BadRequestError({
                        message: 'This email is already associated with a member'
                    });
                }
            }
            let extraPayload = {};
            if (!allowSelfSignup) {
                const member = await users.get({email});
                if (member) {
                    extraPayload = _.pick(req.body, ['oldEmail']);
                    Object.assign(payload, extraPayload);
                    await sendEmailWithMagicLink({email, requestedType: emailType, payload});
                }
            } else {
                extraPayload = _.pick(req.body, ['labels', 'name', 'oldEmail']);
                Object.assign(payload, extraPayload);
                await sendEmailWithMagicLink({email, requestedType: emailType, payload});
            }
            res.writeHead(201);
            return res.end('Created.');
        } catch (err) {
            const statusCode = (err && err.statusCode) || 500;
            common.logging.error(err);
            res.writeHead(statusCode);
            return res.end('Internal Server Error.');
        }
    });

    middleware.createCheckoutSession.use(ensureStripe, body.json(), async function (req, res) {
        const plan = req.body.plan;
        const identity = req.body.identity;

        if (!plan) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        // NOTE: never allow "Complimenatry" plan to be subscribed to from the client
        if (plan.toLowerCase() === 'complimentary') {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        let email;
        try {
            if (!identity) {
                email = null;
            } else {
                const claims = await decodeToken(identity);
                email = claims.sub;
            }
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        const member = email ? await users.get({email}) : null;

        // Do not allow members already with a subscription to initiate a new checkout session
        if (member && member.stripe.subscriptions.length > 0) {
            res.writeHead(403);
            return res.end('No permission');
        }

        try {
            const sessionInfo = await stripe.createCheckoutSession(member, plan, {
                successUrl: req.body.successUrl,
                cancelUrl: req.body.cancelUrl,
                customerEmail: req.body.customerEmail,
                metadata: req.body.metadata
            });

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify(sessionInfo));
        } catch (e) {
            const error = e.message || 'Unable to initiate checkout session';
            res.writeHead(400);
            return res.end(error);
        }
    });

    middleware.createCheckoutSetupSession.use(ensureStripe, body.json(), async function (req, res) {
        const identity = req.body.identity;

        let email;
        try {
            if (!identity) {
                email = null;
            } else {
                const claims = await decodeToken(identity);
                email = claims.sub;
            }
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        const member = email ? await users.get({email}) : null;

        if (!member) {
            res.writeHead(403);
            return res.end('Bad Request.');
        }

        const sessionInfo = await stripe.createCheckoutSetupSession(member, {
            successUrl: req.body.successUrl,
            cancelUrl: req.body.cancelUrl
        });

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(sessionInfo));
    });

    middleware.handleStripeWebhook.use(ensureStripe, body.raw({type: 'application/json'}), async function (req, res) {
        let event;
        try {
            event = await stripe.parseWebhook(req.body, req.headers['stripe-signature']);
        } catch (err) {
            common.logging.error(err);
            res.writeHead(401);
            return res.end();
        }
        common.logging.info(`Handling webhook ${event.type}`);
        try {
            if (event.type === 'customer.subscription.deleted') {
                await stripe.handleCustomerSubscriptionDeletedWebhook(event.data.object);
            }

            if (event.type === 'customer.subscription.updated') {
                await stripe.handleCustomerSubscriptionUpdatedWebhook(event.data.object);
            }

            if (event.type === 'invoice.payment_succeeded') {
                await stripe.handleInvoicePaymentSucceededWebhook(event.data.object);
            }

            if (event.type === 'invoice.payment_failed') {
                await stripe.handleInvoicePaymentFailedWebhook(event.data.object);
            }

            if (event.type === 'checkout.session.completed') {
                if (event.data.object.mode === 'setup') {
                    common.logging.info('Handling "setup" mode Checkout Session');
                    const setupIntent = await stripe.getSetupIntent(event.data.object.setup_intent);
                    const customer = await stripe.getCustomer(setupIntent.metadata.customer_id);
                    const member = await users.get({email: customer.email});

                    await stripe.handleCheckoutSetupSessionCompletedWebhook(setupIntent, member);
                } else if (event.data.object.mode === 'subscription') {
                    common.logging.info('Handling "subscription" mode Checkout Session');
                    const customer = await stripe.getCustomer(event.data.object.customer, {
                        expand: ['subscriptions.data.default_payment_method']
                    });
                    let member = await users.get({email: customer.email});
                    if (!member) {
                        const metadata = event.data.object.metadata;
                        const name = (metadata && metadata.name) || '';
                        member = await users.create({email: customer.email, name});
                    }
                    await stripe.handleCheckoutSessionCompletedWebhook(member, customer);

                    const payerName = _.get(customer, 'subscriptions.data[0].default_payment_method.billing_details.name');

                    if (payerName && !member.name) {
                        await users.update({name: payerName}, {id: member.id});
                    }

                    const emailType = 'signup';
                    await sendEmailWithMagicLink({email: customer.email, requestedType: emailType, options: {forceEmailType: true}});
                } else if (event.data.object.mode === 'payment') {
                    common.logging.info('Ignoring "payment" mode Checkout Session');
                }
            }

            res.writeHead(200);
            res.end();
        } catch (err) {
            common.logging.error(`Error handling webhook ${event.type}`, err);
            res.writeHead(400);
            res.end();
        }
    });

    middleware.updateSubscription.use(ensureStripe, body.json(), async function (req, res) {
        const identity = req.body.identity;
        const cancelAtPeriodEnd = req.body.cancel_at_period_end;
        const planName = req.body.planName;
        const subscriptionId = req.params.id;

        let member;

        try {
            if (!identity) {
                throw new common.errors.BadRequestError({
                    message: 'Updating subscription failed! Could not find member'
                });
            }

            const claims = await decodeToken(identity);
            const email = claims.sub;
            member = email ? await users.get({email}) : null;

            if (!member) {
                throw new common.errors.BadRequestError({
                    message: 'Updating subscription failed! Could not find member'
                });
            }
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }
        // Don't allow removing subscriptions that don't belong to the member
        const plan = planName && stripe.findPlanByNickname(planName);
        if (planName && !plan) {
            throw new common.errors.BadRequestError({
                message: 'Updating subscription failed! Could not find plan'
            });
        }
        const subscription = member.stripe.subscriptions.find(sub => sub.id === subscriptionId);
        if (!subscription) {
            res.writeHead(403);
            return res.end('No permission');
        }

        if (cancelAtPeriodEnd === undefined && planName === undefined) {
            throw new common.errors.BadRequestError({
                message: 'Updating subscription failed!',
                help: 'Request should contain "cancel" or "plan" field.'
            });
        }
        const subscriptionUpdate = {
            id: subscription.id
        };
        if (cancelAtPeriodEnd !== undefined) {
            subscriptionUpdate.cancel_at_period_end = !!(cancelAtPeriodEnd);
        }

        if (plan) {
            subscriptionUpdate.plan = plan.id;
        }

        await stripe.updateSubscriptionFromClient(subscriptionUpdate);

        res.writeHead(204);
        res.end();
    });

    const getPublicConfig = function () {
        return Promise.resolve({
            publicKey,
            issuer
        });
    };

    const bus = new (require('events').EventEmitter)();

    if (stripe) {
        stripe.ready().then(() => {
            bus.emit('ready');
        }).catch((err) => {
            bus.emit('error', err);
        });
    } else {
        process.nextTick(() => bus.emit('ready'));
    }

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
        members: users
    };
};
