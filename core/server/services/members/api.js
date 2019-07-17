const url = require('url');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../lib/url-utils');
const MembersApi = require('@tryghost/members-api');
const common = require('../../lib/common');
const models = require('../../models');
const mail = require('../mail');
const blogIcon = require('../../lib/image/blog-icon');
const doBlock = fn => fn();

function createMember({name, email, password}) {
    return models.Member.add({
        name,
        email,
        password
    }).then((member) => {
        return member.toJSON();
    });
}

function updateMember(member, newData) {
    return models.Member.findOne(member, {
        require: true
    }).then(({id}) => {
        return models.Member.edit(newData, {id});
    }).then((member) => {
        return member.toJSON();
    });
}

function getMember(data, options = {}) {
    return models.Member.findOne(data, Object.assign({require: true}, options)).then((model) => {
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

function validateMember({email, password}) {
    return models.Member.findOne({email}, {
        require: true
    }).then((member) => {
        return member.comparePassword(password).then((res) => {
            if (!res) {
                throw new Error('Password is incorrect');
            }
            return member;
        });
    }).then((member) => {
        return member.toJSON();
    });
}

function getSubscriptionSettings() {
    let membersSettings = settingsCache.get('members_subscription_settings');
    if (!membersSettings) {
        membersSettings = {
            isPaid: false,
            paymentProcessors: [{
                adapter: 'stripe',
                config: {
                    secret_token: '',
                    public_token: '',
                    product: {
                        name: 'Ghost Subscription'
                    },
                    plans: [
                        {
                            name: 'Monthly',
                            currency: 'usd',
                            interval: 'month',
                            amount: ''
                        },
                        {
                            name: 'Yearly',
                            currency: 'usd',
                            interval: 'year',
                            amount: ''
                        }
                    ]
                }
            }]
        };
    }
    if (!membersSettings.isPaid) {
        membersSettings.paymentProcessors = [];
    }
    return membersSettings;
}

const siteUrl = urlUtils.getSiteUrl();
const siteOrigin = doBlock(() => {
    const {protocol, host} = url.parse(siteUrl);
    return `${protocol}//${host}`;
});

const adminOrigin = doBlock(() => {
    const {protocol, host} = url.parse(urlUtils.urlFor('admin', true));
    return `${protocol}//${host}`;
});

const getApiUrl = ({version, type}) => {
    const {href} = new url.URL(
        urlUtils.getApiPath({version, type}),
        urlUtils.urlFor('admin', true)
    );
    return href;
};

const contentApiUrl = getApiUrl({version: 'v2', type: 'content'});
const membersApiUrl = getApiUrl({version: 'v2', type: 'members'});

const accessControl = {
    [siteOrigin]: {
        [contentApiUrl]: {
            tokenLength: '20m'
        },
        [membersApiUrl]: {
            tokenLength: '180d'
        }
    },
    '*': {
        tokenLength: '20m'
    }
};

const sendEmail = (function createSendEmail(mailer) {
    return function sendEmail(member, {token}) {
        if (!(mailer instanceof mail.GhostMailer)) {
            mailer = new mail.GhostMailer();
        }
        const message = {
            to: member.email,
            subject: 'Reset password',
            html: `
            Hi ${member.name},

            To reset your password, click the following link and follow the instructions:

            ${siteUrl}#reset-password?token=${token}

            If you didn't request a password change, just ignore this email.
            `
        };

        /* eslint-disable */
        // @TODO remove this
        console.log(message.html);
        /* eslint-enable */
        return mailer.send(message).catch((err) => {
            return Promise.reject(err);
        });
    };
})();

const getSiteConfig = () => {
    return {
        title: settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : 'Publication',
        icon: blogIcon.getIconUrl()
    };
};

module.exports = createApiInstance;

function createApiInstance() {
    const membersApiInstance = MembersApi({
        authConfig: {
            issuer: membersApiUrl,
            ssoOrigin: adminOrigin,
            publicKey: settingsCache.get('members_public_key'),
            privateKey: settingsCache.get('members_private_key'),
            sessionSecret: settingsCache.get('members_session_secret'),
            accessControl
        },
        paymentConfig: {
            processors: getSubscriptionSettings().paymentProcessors
        },
        siteConfig: getSiteConfig(),
        createMember,
        getMember,
        deleteMember,
        listMembers,
        validateMember,
        updateMember,
        sendEmail
    });

    membersApiInstance.setLogger(common.logging);

    return membersApiInstance;
}
