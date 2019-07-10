const _ = require('lodash');
const common = require('../../lib/common');
const models = require('../../models');

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

        const completed = common.i18n.t('errors.api.authentication.setupAlreadyCompleted');
        const notCompleted = common.i18n.t('errors.api.authentication.setupMustBeCompleted');

        function throwReason(reason) {
            throw new common.errors.NoPermissionError({message: reason});
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
        throw new common.errors.GhostError({
            message: common.i18n.t('errors.api.authentication.setupUnableToRun')
        });
    }

    const user = await models.User.setup(userData, _.extend({id: owner.id}, context));

    return {
        user: user,
        userData: userData
    };
}

function doSettings(data) {
    const user = data.user,
        blogTitle = data.userData.blogTitle;

    let userSettings;

    if (!blogTitle || typeof blogTitle !== 'string') {
        return user;
    }

    userSettings = [
        {key: 'title', value: blogTitle.trim()},
        {key: 'description', value: common.i18n.t('common.api.authentication.sampleBlogDescription')}
    ];

    return models.Settings.edit(userSettings)
        .then(() => {
            return user;
        });
}

module.exports = {
    checkIsSetup: checkIsSetup,
    assertSetupCompleted: assertSetupCompleted,
    setupUser: setupUser,
    doSettings: doSettings
};
