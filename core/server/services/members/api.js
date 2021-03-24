const settingsCache = require('../settings/cache');
const MembersApi = require('@tryghost/members-api');
const logging = require('../../../shared/logging');
const mail = require('../mail');
const models = require('../../models');
const signinEmail = require('./emails/signin');
const signupEmail = require('./emails/signup');
const subscribeEmail = require('./emails/subscribe');
const updateEmail = require('./emails/updateEmail');
const SingleUseTokenProvider = require('./SingleUseTokenProvider');
const urlUtils = require('../../../shared/url-utils');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;

const ghostMailer = new mail.GhostMailer();

module.exports = createApiInstance;

function createApiInstance(config) {
    const membersApiInstance = MembersApi({
        tokenConfig: config.getTokenConfig(),
        auth: {
            getSigninURL: config.getSigninURL.bind(config),
            allowSelfSignup: config.getAllowSelfSignup(),
            tokenProvider: new SingleUseTokenProvider(models.SingleUseToken, MAGIC_LINK_TOKEN_VALIDITY)
        },
        mail: {
            transporter: {
                sendMail(message) {
                    if (process.env.NODE_ENV !== 'production') {
                        logging.warn(message.text);
                    }
                    let msg = Object.assign({
                        from: config.getAuthEmailFromAddress(),
                        subject: 'Signin',
                        forceTextContent: true
                    }, message);

                    return ghostMailer.send(msg);
                }
            },
            getSubject(type) {
                const siteTitle = settingsCache.get('title');
                switch (type) {
                case 'subscribe':
                    return `📫 Confirm your subscription to ${siteTitle}`;
                case 'signup':
                    return `🙌 Complete your sign up to ${siteTitle}!`;
                case 'updateEmail':
                    return `📫 Confirm your email update for ${siteTitle}!`;
                case 'signin':
                default:
                    return `🔑 Secure sign in link for ${siteTitle}`;
                }
            },
            getText(url, type, email) {
                const siteTitle = settingsCache.get('title');
                switch (type) {
                case 'subscribe':
                    return `
                        Hey there,

                        You're one tap away from subscribing to ${siteTitle} — please confirm your email address with this link:

                        ${url}

                        For your security, the link will expire in 24 hours time.

                        All the best!
                        The team at ${siteTitle}

                        ---

                        Sent to ${email}
                        If you did not make this request, you can simply delete this message. You will not be subscribed.
                        `;
                case 'signup':
                    return `
                        Hey there!

                        Thanks for signing up for ${siteTitle} — use this link to complete the sign up process and be automatically signed in:

                        ${url}

                        For your security, the link will expire in 24 hours time.

                        See you soon!
                        The team at ${siteTitle}

                        ---

                        Sent to ${email}
                        If you did not make this request, you can simply delete this message. You will not be signed up, and no account will be created for you.
                        `;
                case 'updateEmail':
                    return `
                            Hey there,

                            Please confirm your email address with this link:

                            ${url}

                            For your security, the link will expire in 24 hours time.

                            ---

                            Sent to ${email}
                            If you did not make this request, you can simply delete this message. This email address will not be used.
                            `;
                case 'signin':
                default:
                    return `
                        Hey there,

                        Welcome back! Use this link to securely sign in to your ${siteTitle} account:

                        ${url}

                        For your security, the link will expire in 24 hours time.

                        See you soon!
                        The team at ${siteTitle}

                        ---

                        Sent to ${email}
                        If you did not make this request, you can safely ignore this email.
                        `;
                }
            },
            getHTML(url, type, email) {
                const siteTitle = settingsCache.get('title');
                const siteUrl = urlUtils.urlFor('home', true);
                const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
                const siteDomain = (domain && domain[1]);
                const accentColor = settingsCache.get('accent_color');
                switch (type) {
                case 'subscribe':
                    return subscribeEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'signup':
                    return signupEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'updateEmail':
                    return updateEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'signin':
                default:
                    return signinEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                }
            }
        },
        paymentConfig: {
            stripe: config.getStripePaymentConfig()
        },
        models: {
            /**
             * Settings do not have their own models, so we wrap the webhook in a "fake" model
             */
            StripeWebhook: {
                async upsert(data, options) {
                    const settings = [{
                        key: 'members_stripe_webhook_id',
                        value: data.webhook_id
                    }, {
                        key: 'members_stripe_webhook_secret',
                        value: data.secret
                    }];
                    await models.Settings.edit(settings, options);
                }
            },
            StripeCustomer: models.MemberStripeCustomer,
            StripeCustomerSubscription: models.StripeCustomerSubscription,
            Member: models.Member,
            MemberSubscribeEvent: models.MemberSubscribeEvent,
            MemberPaidSubscriptionEvent: models.MemberPaidSubscriptionEvent,
            MemberLoginEvent: models.MemberLoginEvent,
            MemberEmailChangeEvent: models.MemberEmailChangeEvent,
            MemberPaymentEvent: models.MemberPaymentEvent,
            MemberStatusEvent: models.MemberStatusEvent
        },
        logger: logging
    });

    return membersApiInstance;
}
