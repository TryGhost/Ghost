const crypto = require('crypto');
const {URL} = require('url');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../lib/url-utils');
const MembersApi = require('@tryghost/members-api');
const common = require('../../lib/common');
const ghostVersion = require('../../lib/ghost-version');
const mail = require('../mail');
const models = require('../../models');
const signinEmail = require('./emails/signin');
const signupEmail = require('./emails/signup');
const subscribeEmail = require('./emails/subscribe');

async function createMember({email, name, note}, options = {}) {
    const model = await models.Member.add({
        email,
        name: name || null,
        note: note || null
    });
    const member = model.toJSON(options);
    return member;
}

async function getMember(data, options = {}) {
    if (!data.email && !data.id) {
        return Promise.resolve(null);
    }
    const model = await models.Member.findOne(data, options);
    if (!model) {
        return null;
    }
    const member = model.toJSON(options);
    return member;
}

async function setMetadata(module, metadata) {
    if (module !== 'stripe') {
        return;
    }

    if (metadata.customer) {
        await models.MemberStripeCustomer.upsert(metadata.customer, {
            customer_id: metadata.customer.customer_id
        });
    }

    if (metadata.subscription) {
        await models.StripeCustomerSubscription.upsert(metadata.subscription, {
            subscription_id: metadata.subscription.subscription_id
        });
    }

    return;
}

async function getMetadata(module, member) {
    if (module !== 'stripe') {
        return;
    }

    const customers = (await models.MemberStripeCustomer.findAll({
        filter: `member_id:${member.id}`
    })).toJSON();

    const subscriptions = await customers.reduce(async (subscriptionsPromise, customer) => {
        const customerSubscriptions = await models.StripeCustomerSubscription.findAll({
            filter: `customer_id:${customer.customer_id}`
        });
        return (await subscriptionsPromise).concat(customerSubscriptions.toJSON());
    }, []);

    return {
        customers: customers,
        subscriptions: subscriptions
    };
}

async function updateMember({name, note}, options = {}) {
    const model = await models.Member.edit({
        name: name || null,
        note: note || null
    }, options);

    const member = model.toJSON(options);
    return member;
}

function deleteMember(options) {
    options = options || {};
    return models.Member.destroy(options).catch(models.Member.NotFoundError, () => {
        throw new common.errors.NotFoundError({
            message: common.i18n.t('errors.api.resource.resourceNotFound', {
                resource: 'Member'
            })
        });
    });
}

function listMembers(options) {
    return models.Member.findPage(options).then((models) => {
        return {
            members: models.data.map(model => model.toJSON(options)),
            meta: models.meta
        };
    });
}

const getApiUrl = ({version, type}) => {
    const {href} = new URL(
        urlUtils.getApiPath({version, type}),
        urlUtils.urlFor('admin', true)
    );
    return href;
};

const siteUrl = urlUtils.getSiteUrl();
const membersApiUrl = getApiUrl({version: 'v3', type: 'members'});

const ghostMailer = new mail.GhostMailer();

function getStripePaymentConfig() {
    const subscriptionSettings = settingsCache.get('members_subscription_settings');

    const stripePaymentProcessor = subscriptionSettings.paymentProcessors.find(
        paymentProcessor => paymentProcessor.adapter === 'stripe'
    );

    if (!stripePaymentProcessor || !stripePaymentProcessor.config) {
        return null;
    }

    if (!stripePaymentProcessor.config.public_token || !stripePaymentProcessor.config.secret_token) {
        return null;
    }

    const webhookHandlerUrl = new URL('/members/webhooks/stripe', siteUrl);

    const checkoutSuccessUrl = new URL(siteUrl);
    checkoutSuccessUrl.searchParams.set('stripe', 'success');
    const checkoutCancelUrl = new URL(siteUrl);
    checkoutCancelUrl.searchParams.set('stripe', 'cancel');

    return {
        publicKey: stripePaymentProcessor.config.public_token,
        secretKey: stripePaymentProcessor.config.secret_token,
        checkoutSuccessUrl: checkoutSuccessUrl.href,
        checkoutCancelUrl: checkoutCancelUrl.href,
        webhookHandlerUrl: webhookHandlerUrl.href,
        product: stripePaymentProcessor.config.product,
        plans: stripePaymentProcessor.config.plans,
        appInfo: {
            name: 'Ghost',
            partner_id: 'pp_partner_DKmRVtTs4j9pwZ',
            version: ghostVersion.original,
            url: 'https://ghost.org/'
        }
    };
}

function getAuthSecret() {
    const hexSecret = settingsCache.get('members_email_auth_secret');
    if (!hexSecret) {
        common.logging.warn('Could not find members_email_auth_secret, using dynamically generated secret');
        return crypto.randomBytes(64);
    }
    const secret = Buffer.from(hexSecret, 'hex');
    if (secret.length < 64) {
        common.logging.warn('members_email_auth_secret not large enough (64 bytes), using dynamically generated secret');
        return crypto.randomBytes(64);
    }
    return secret;
}

function getAllowSelfSignup() {
    const subscriptionSettings = settingsCache.get('members_subscription_settings');
    return subscriptionSettings.allowSelfSignup;
}

// NOTE: the function is an exact duplicate of one in GhostMailer should be extracted
//       into a common lib once it needs to be reused anywhere else again
function getDomain() {
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
}

module.exports = createApiInstance;

function createApiInstance() {
    const membersApiInstance = MembersApi({
        tokenConfig: {
            issuer: membersApiUrl,
            publicKey: settingsCache.get('members_public_key'),
            privateKey: settingsCache.get('members_private_key')
        },
        auth: {
            getSigninURL(token, type) {
                const signinURL = new URL(siteUrl);
                signinURL.searchParams.set('token', token);
                signinURL.searchParams.set('action', type);
                return signinURL.href;
            },
            allowSelfSignup: getAllowSelfSignup(),
            secret: getAuthSecret()
        },
        mail: {
            transporter: {
                sendMail(message) {
                    if (process.env.NODE_ENV !== 'production') {
                        common.logging.warn(message.text);
                    }
                    let msg = Object.assign({
                        subject: 'Signin',
                        forceTextContent: true
                    }, message);
                    const subscriptionSettings = settingsCache.get('members_subscription_settings');

                    if (subscriptionSettings && subscriptionSettings.fromAddress) {
                        let from = `${subscriptionSettings.fromAddress}@${getDomain()}`;
                        msg = Object.assign({from: from}, msg);
                    }

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

                        For your security, the link will expire in 10 minutes time.

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

                        For your security, the link will expire in 10 minutes time.

                        See you soon!
                        The team at ${siteTitle}

                        ---

                        Sent to ${email}
                        If you did not make this request, you can simply delete this message. You will not be signed up, and no account will be created for you.
                        `;
                case 'signin':
                default:
                    return `
                        Hey there,

                        Welcome back! Use this link to securely sign in to your ${siteTitle} account:

                        ${url}

                        For your security, the link will expire in 10 minutes time.

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
                switch (type) {
                case 'subscribe':
                    return subscribeEmail({url, email, siteTitle});
                case 'signup':
                    return signupEmail({url, email, siteTitle});
                case 'signin':
                default:
                    return signinEmail({url, email, siteTitle});
                }
            }
        },
        paymentConfig: {
            stripe: getStripePaymentConfig()
        },
        setMetadata,
        getMetadata,
        createMember,
        updateMember,
        getMember,
        deleteMember,
        listMembers,
        logger: common.logging
    });

    return membersApiInstance;
}
