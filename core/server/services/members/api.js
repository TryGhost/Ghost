const {URL} = require('url');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../lib/url-utils');
const MembersApi = require('@tryghost/members-api');
const common = require('../../lib/common');
const mail = require('../mail');
const models = require('../../models');

function createMember({email}) {
    return models.Member.add({
        email
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

    return {
        publicKey: stripePaymentProcessor.config.public_token,
        secretKey: stripePaymentProcessor.config.secret_token,
        checkoutSuccessUrl: siteUrl,
        checkoutCancelUrl: siteUrl,
        product: stripePaymentProcessor.config.product,
        plans: stripePaymentProcessor.config.plans
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
            getSigninURL(token) {
                const signinURL = new URL(siteUrl);
                signinURL.searchParams.set('token', token);
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
            }
        },
        paymentConfig: {
            stripe: getStripePaymentConfig()
        },
        createMember,
        getMember,
        deleteMember,
        listMembers
    });

    membersApiInstance.setLogger(common.logging);

    return membersApiInstance;
}
