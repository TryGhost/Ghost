const _ = require('lodash');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');
const i18n = require('../../../shared/i18n');
const logging = require('@tryghost/logging');
const models = require('../../models');
const mail = require('../mail');

/**
 * Returns setup status
 *
 * @return {Promise<Boolean>}
 */
async function checkIsSetup() {
    return models.User.isSetup();
}

/**
 * Allows an assertion to be made about setup status.
 *
 * @param  {Boolean} status True: setup must be complete. False: setup must not be complete.
 * @return {Function} returns a "task ready" function
 */
function assertSetupCompleted(status) {
    return async function checkPermission(__) {
        const isSetup = await checkIsSetup();

        if (isSetup === status) {
            return __;
        }

        const completed = i18n.t('errors.api.authentication.setupAlreadyCompleted');
        const notCompleted = i18n.t('errors.api.authentication.setupMustBeCompleted');

        function throwReason(reason) {
            throw new errors.NoPermissionError({message: reason});
        }

        if (isSetup) {
            throwReason(completed);
        } else {
            throwReason(notCompleted);
        }
    };
}

async function setupUser(userData) {
    const context = {context: {internal: true}};

    const owner = await models.User.findOne({role: 'Owner', status: 'all'});

    if (!owner) {
        throw new errors.GhostError({
            message: i18n.t('errors.api.authentication.setupUnableToRun')
        });
    }

    const user = await models.User.setup(userData, _.extend({id: owner.id}, context));

    return {
        user: user,
        userData: userData
    };
}

async function doSettings(data, settingsAPI) {
    const context = {context: {user: data.user.id}};
    const user = data.user;
    const blogTitle = data.userData.blogTitle;

    let userSettings;

    if (!blogTitle || typeof blogTitle !== 'string') {
        return user;
    }

    userSettings = [
        {key: 'title', value: blogTitle.trim()},
        {key: 'description', value: i18n.t('common.api.authentication.sampleBlogDescription')}
    ];

    await settingsAPI.edit({settings: userSettings}, context);

    return user;
}

async function doProduct(data, productsAPI) {
    const context = {context: {user: data.user.id}};
    const user = data.user;
    const blogTitle = data.userData.blogTitle;

    if (!blogTitle || typeof blogTitle !== 'string') {
        return user;
    }
    try {
        const page = await productsAPI.browse({limit: 1});

        const [product] = page.products;
        if (!product) {
            return data;
        }

        productsAPI.edit({products: [{name: blogTitle.trim()}]}, {context: context.context, id: product.id});
    } catch (e) {
        return data;
    }

    return data;
}

function sendWelcomeEmail(email, mailAPI) {
    if (config.get('sendWelcomeEmail')) {
        const data = {
            ownerEmail: email
        };

        return mail.utils.generateContent({data: data, template: 'welcome'})
            .then((content) => {
                const message = {
                    to: email,
                    subject: i18n.t('common.api.authentication.mail.yourNewGhostBlog'),
                    html: content.html,
                    text: content.text
                };

                const payload = {
                    mail: [{
                        message: message,
                        options: {}
                    }]
                };

                mailAPI.send(payload, {context: {internal: true}})
                    .catch((err) => {
                        err.context = i18n.t('errors.api.authentication.unableToSendWelcomeEmail');
                        logging.error(err);
                    });
            });
    }
    return Promise.resolve();
}

module.exports = {
    checkIsSetup: checkIsSetup,
    assertSetupCompleted: assertSetupCompleted,
    setupUser: setupUser,
    doSettings: doSettings,
    doProduct: doProduct,
    sendWelcomeEmail: sendWelcomeEmail
};
