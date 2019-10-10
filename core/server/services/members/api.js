const {URL} = require('url');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../lib/url-utils');
const MembersApi = require('@tryghost/members-api');
const common = require('../../lib/common');
const ghostVersion = require('../../lib/ghost-version');
const mail = require('../mail');
const models = require('../../models');

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
const membersApiUrl = getApiUrl({version: 'v2', type: 'members'});

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

function getRequirePaymentSetting() {
    const subscriptionSettings = settingsCache.get('members_subscription_settings');
    return !!subscriptionSettings.requirePaymentForSignup;
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
            allowSelfSignup: !getRequirePaymentSetting()
        },
        mail: {
            transporter: {
                sendMail(message) {
                    if (process.env.NODE_ENV !== 'production') {
                        common.logging.warn(message.text);
                    }
                    return ghostMailer.send(Object.assign({subject: 'Signin'}, message));
                }
            },
            getText(url, type) {
                switch (type) {
                case 'subscribe':
                    return `Click here to confirm your subscription ${url}`;
                case 'signup':
                    return `Click here to confirm your email address and sign up ${url}`;
                case 'signin':
                default:
                    return `Click here to sign in ${url}`;
                }
            },
            getHTML(url, type) {
                switch (type) {
                case 'subscribe':
                    return `<a href="${url}">Click here to confirm your subscription</a>`;
                case 'signup':
                    return `<a href="${url}">Click here to confirm your email address and sign up</a>`;
                case 'signin':
                default:
                    return `<a href="${url}">Click here to sign in</a>`;
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
