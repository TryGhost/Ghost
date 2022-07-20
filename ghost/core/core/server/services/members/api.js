const stripeService = require('../stripe');
const settingsCache = require('../../../shared/settings-cache');
const MembersApi = require('@tryghost/members-api');
const logging = require('@tryghost/logging');
const mail = require('../mail');
const models = require('../../models');
const signinEmail = require('./emails/signin');
const signupEmail = require('./emails/signup');
const signupPaidEmail = require('./emails/signup-paid');
const subscribeEmail = require('./emails/subscribe');
const updateEmail = require('./emails/updateEmail');
const SingleUseTokenProvider = require('./SingleUseTokenProvider');
const urlUtils = require('../../../shared/url-utils');
const labsService = require('../../../shared/labs');
const offersService = require('../offers');
const newslettersService = require('../newsletters');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;

const ghostMailer = new mail.GhostMailer();

module.exports = createApiInstance;

function createApiInstance(config) {
    const membersApiInstance = MembersApi({
        tokenConfig: config.getTokenConfig(),
        auth: {
            getSigninURL: config.getSigninURL.bind(config),
            allowSelfSignup: config.getAllowSelfSignup.bind(config),
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
                case 'signup-paid':
                    return `🙌 Thank you for signing up to ${siteTitle}!`;
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

                        ---

                        Sent to ${email}
                        If you did not make this request, you can simply delete this message. You will not be subscribed.
                        `;
                case 'signup':
                    return `
                        Hey there!

                        Tap the link below to complete the signup process for ${siteTitle}, and be automatically signed in:

                        ${url}

                        For your security, the link will expire in 24 hours time.

                        See you soon!

                        ---

                        Sent to ${email}
                        If you did not make this request, you can simply delete this message. You will not be signed up, and no account will be created for you.
                        `;
                case 'signup-paid':
                    return `
                        Hey there!

                        Thank you for subscribing to ${siteTitle}. Tap the link below to be automatically signed in:

                        ${url}

                        For your security, the link will expire in 24 hours time.

                        See you soon!

                        ---

                        Sent to ${email}
                        Thank you for subscribing to ${siteTitle}!
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
                case 'signup-paid':
                    return signupPaidEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'updateEmail':
                    return updateEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'signin':
                default:
                    return signinEmail({url, email, siteTitle, accentColor, siteDomain, siteUrl});
                }
            }
        },
        models: {
            EmailRecipient: models.EmailRecipient,
            StripeCustomer: models.MemberStripeCustomer,
            StripeCustomerSubscription: models.StripeCustomerSubscription,
            Member: models.Member,
            MemberCancelEvent: models.MemberCancelEvent,
            MemberSubscribeEvent: models.MemberSubscribeEvent,
            MemberPaidSubscriptionEvent: models.MemberPaidSubscriptionEvent,
            MemberLoginEvent: models.MemberLoginEvent,
            MemberEmailChangeEvent: models.MemberEmailChangeEvent,
            MemberPaymentEvent: models.MemberPaymentEvent,
            MemberStatusEvent: models.MemberStatusEvent,
            MemberProductEvent: models.MemberProductEvent,
            MemberAnalyticEvent: models.MemberAnalyticEvent,
            OfferRedemption: models.OfferRedemption,
            Offer: models.Offer,
            StripeProduct: models.StripeProduct,
            StripePrice: models.StripePrice,
            Product: models.Product,
            Settings: models.Settings
        },
        stripeAPIService: stripeService.api,
        offersAPI: offersService.api,
        labsService: labsService,
        newslettersService: newslettersService
    });

    return membersApiInstance;
}
