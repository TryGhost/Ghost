const {URL} = require('url');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../lib/url-utils');
const MembersApi = require('@tryghost/members-api');
const common = require('../../lib/common');
const ghostVersion = require('../../lib/ghost-version');
const mail = require('../mail');
const models = require('../../models');

function createMember({email, name}) {
    return models.Member.add({
        email,
        name
    }).then((member) => {
        return member.toJSON();
    });
}

function getMember(data, options = {}) {
    if (!data.email && !data.id) {
        return Promise.resolve(null);
    }
    return models.Member.findOne(data, options).then((model) => {
        if (!model) {
            return null;
        }
        return model.toJSON(options);
    });
}

async function setMemberMetadata(member, module, metadata) {
    if (module !== 'stripe') {
        return;
    }
    await models.Member.edit({
        stripe_customers: metadata
    }, {id: member.id, withRelated: ['stripe_customers']});
    return;
}

async function getMemberMetadata(member, module) {
    if (module !== 'stripe') {
        return;
    }
    const model = await models.Member.where({id: member.id}).fetch({withRelated: ['stripe_customers']});
    const metadata = await model.related('stripe_customers');
    return metadata.toJSON();
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
    if (!subscriptionSettings || subscriptionSettings.isPaid === false) {
        return null;
    }

    const stripePaymentProcessor = subscriptionSettings.paymentProcessors.find(
        paymentProcessor => paymentProcessor.adapter === 'stripe'
    );

    if (!stripePaymentProcessor || !stripePaymentProcessor.config) {
        return null;
    }

    const webhookHandlerUrl = new URL('/members/webhooks/stripe', siteUrl);

    return {
        publicKey: stripePaymentProcessor.config.public_token,
        secretKey: stripePaymentProcessor.config.secret_token,
        checkoutSuccessUrl: siteUrl,
        checkoutCancelUrl: siteUrl,
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
            }
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
        setMemberMetadata,
        getMemberMetadata,
        createMember,
        getMember,
        deleteMember,
        listMembers
    });

    membersApiInstance.setLogger(common.logging);

    return membersApiInstance;
}
