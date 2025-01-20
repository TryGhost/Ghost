const stripeService = require('../stripe');
const settingsCache = require('../../../shared/settings-cache');
const settingsHelpers = require('../../services/settings-helpers');
const MembersApi = require('@tryghost/members-api');
const logging = require('@tryghost/logging');
const mail = require('../mail');
const models = require('../../models');
const signinEmail = require('./emails/signin');
const signupEmail = require('./emails/signup');
const signupPaidEmail = require('./emails/signup-paid');
const subscribeEmail = require('./emails/subscribe');
const updateEmail = require('./emails/update-email');
const SingleUseTokenProvider = require('./SingleUseTokenProvider');
const urlUtils = require('../../../shared/url-utils');
const labsService = require('../../../shared/labs');
const offersService = require('../offers');
const tiersService = require('../tiers');
const newslettersService = require('../newsletters');
const memberAttributionService = require('../member-attribution');
const emailSuppressionList = require('../email-suppression-list');
const {t} = require('../i18n');
const sentry = require('../../../shared/sentry');
const sharedConfig = require('../../../shared/config');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 3;

const ghostMailer = new mail.GhostMailer();

module.exports = createApiInstance;

function trimLeadingWhitespace(strings, ...values) {
    // Interweave the strings with the
    // substitution vars first.
    let output = '';
    for (let i = 0; i < values.length; i++) {
        output += strings[i] + values[i];
    }
    output += strings[values.length];

    // Split on newlines.
    const lines = output.split(/(?:\r\n|\n|\r)/);

    // Rip out the leading whitespace on each line.
    return lines.map((line) => {
        return line.trimStart();
    }).join('\n').trim();
}

function createApiInstance(config) {
    const membersApiInstance = MembersApi({
        tokenConfig: config.getTokenConfig(),
        auth: {
            getSigninURL: config.getSigninURL.bind(config),
            allowSelfSignup: config.getAllowSelfSignup.bind(config),
            tokenProvider: new SingleUseTokenProvider({
                SingleUseTokenModel: models.SingleUseToken,
                validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
                validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
                maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT
            })
        },
        mail: {
            transporter: {
                sendMail(message) {
                    if (process.env.NODE_ENV !== 'production') {
                        logging.warn(message.text);
                    }
                    let msg = Object.assign({
                        from: config.getEmailSupportAddress(),
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
                    return `📫 ${t(`Confirm your subscription to {{siteTitle}}`, {siteTitle, interpolation: {escapeValue: false}})}`;
                case 'signup':
                    return `🙌 ${t(`Complete your sign up to {{siteTitle}}!`, {siteTitle, interpolation: {escapeValue: false}})}`;
                case 'signup-paid':
                    return `🙌 ${t(`Thank you for signing up to {{siteTitle}}!`, {siteTitle, interpolation: {escapeValue: false}})}`;
                case 'updateEmail':
                    return `📫 ${t(`Confirm your email update for {{siteTitle}}!`, {siteTitle, interpolation: {escapeValue: false}})}`;
                case 'signin':
                default:
                    return `🔑 ${t(`Secure sign in link for {{siteTitle}}`, {siteTitle, interpolation: {escapeValue: false}})}`;
                }
            },
            getText(url, type, email) {
                const siteTitle = settingsCache.get('title');
                switch (type) {
                case 'subscribe':
                    return trimLeadingWhitespace`
                        ${t(`Hey there,`)}

                        ${t('You\'re one tap away from subscribing to {{siteTitle}} — please confirm your email address with this link:', {siteTitle, interpolation: {escapeValue: false}})}

                        ${url}

                        ${t('For your security, the link will expire in 24 hours time.')}

                        ${t('All the best!')}

                        ---

                        ${t('Sent to {{email}}', {email})}
                        ${t('If you did not make this request, you can simply delete this message.')} ${t('You will not be subscribed.')}
                        `;
                case 'signup':
                    return trimLeadingWhitespace`
                        ${t(`Hey there,`)}

                        ${t('Tap the link below to complete the signup process for {{siteTitle}}, and be automatically signed in:', {siteTitle, interpolation: {escapeValue: false}})}

                        ${url}

                        ${t('For your security, the link will expire in 24 hours time.')}

                        ${t('See you soon!')}

                        ---

                        ${t('Sent to {{email}}', {email})}
                        ${t('If you did not make this request, you can simply delete this message.')} ${t('You will not be signed up, and no account will be created for you.')}
                        `;
                case 'signup-paid':
                    return trimLeadingWhitespace`
                        ${t(`Hey there,`)}

                        ${t('Thank you for subscribing to {{siteTitle}}. Tap the link below to be automatically signed in:', {siteTitle, interpolation: {escapeValue: false}})}

                        ${url}

                        ${t('For your security, the link will expire in 24 hours time.')}

                        ${t('See you soon!')}

                        ---

                        ${t('Sent to {{email}}', {email})}
                        ${t('Thank you for subscribing to {{siteTitle}}!', {siteTitle, interpolation: {escapeValue: false}})}
                        `;
                case 'updateEmail':
                    return trimLeadingWhitespace`
                        ${t(`Hey there,`)}

                        ${t('Please confirm your email address with this link:')}

                        ${url}

                        ${t('For your security, the link will expire in 24 hours time.')}

                        ---

                        ${t('Sent to {{email}}', {email})}
                        ${t('If you did not make this request, you can simply delete this message.')} ${t('This email address will not be used.')}
                        `;
                case 'signin':
                default:
                    return trimLeadingWhitespace`
                        ${t(`Hey there,`)}

                        ${t('Welcome back! Use this link to securely sign in to your {{siteTitle}} account:', {siteTitle, interpolation: {escapeValue: false}})}

                        ${url}

                        ${t('For your security, the link will expire in 24 hours time.')}

                        ${t('See you soon!')}

                        ---

                        ${t('Sent to {{email}}', {email})}
                        ${t('If you did not make this request, you can safely ignore this email.')}
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
                    return subscribeEmail({t, url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'signup':
                    return signupEmail({t, url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'signup-paid':
                    return signupPaidEmail({t, url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'updateEmail':
                    return updateEmail({t, url, email, siteTitle, accentColor, siteDomain, siteUrl});
                case 'signin':
                default:
                    return signinEmail({t, url, email, siteTitle, accentColor, siteDomain, siteUrl});
                }
            }
        },
        models: {
            DonationPaymentEvent: models.DonationPaymentEvent,
            EmailRecipient: models.EmailRecipient,
            StripeCustomer: models.MemberStripeCustomer,
            StripeCustomerSubscription: models.StripeCustomerSubscription,
            Member: models.Member,
            MemberNewsletter: models.MemberNewsletter,
            MemberCancelEvent: models.MemberCancelEvent,
            MemberSubscribeEvent: models.MemberSubscribeEvent,
            MemberPaidSubscriptionEvent: models.MemberPaidSubscriptionEvent,
            MemberLoginEvent: models.MemberLoginEvent,
            MemberEmailChangeEvent: models.MemberEmailChangeEvent,
            MemberPaymentEvent: models.MemberPaymentEvent,
            MemberStatusEvent: models.MemberStatusEvent,
            MemberProductEvent: models.MemberProductEvent,
            MemberCreatedEvent: models.MemberCreatedEvent,
            SubscriptionCreatedEvent: models.SubscriptionCreatedEvent,
            MemberLinkClickEvent: models.MemberClickEvent,
            OfferRedemption: models.OfferRedemption,
            Offer: models.Offer,
            StripeProduct: models.StripeProduct,
            StripePrice: models.StripePrice,
            Product: models.Product,
            Settings: models.Settings,
            Comment: models.Comment,
            MemberFeedback: models.MemberFeedback,
            EmailSpamComplaintEvent: models.EmailSpamComplaintEvent
        },
        stripeAPIService: stripeService.api,
        tiersService: tiersService,
        offersAPI: offersService.api,
        labsService: labsService,
        newslettersService: newslettersService,
        memberAttributionService: memberAttributionService.service,
        emailSuppressionList,
        settingsCache,
        sentry,
        settingsHelpers,
        config: sharedConfig
    });

    return membersApiInstance;
}
