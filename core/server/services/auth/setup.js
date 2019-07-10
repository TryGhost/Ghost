const common = require('../../lib/common');
const models = require('../../models');

/**
 * Returns setup status
 *
 * @return {Promise<Boolean>}
 */
function checkIsSetup() {
    return models.User.isSetup();
}

/**
 * Allows an assertion to be made about setup status.
 *
 * @param  {Boolean} status True: setup must be complete. False: setup must not be complete.
 * @return {Function} returns a "task ready" function
 */
function assertSetupCompleted(status) {
    return function checkPermission(__) {
        return checkIsSetup().then((isSetup) => {
            if (isSetup === status) {
                return __;
            }

            const completed = common.i18n.t('errors.api.authentication.setupAlreadyCompleted'),
                notCompleted = common.i18n.t('errors.api.authentication.setupMustBeCompleted');

            function throwReason(reason) {
                throw new common.errors.NoPermissionError({message: reason});
            }

            if (isSetup) {
                throwReason(completed);
            } else {
                throwReason(notCompleted);
            }
        });
    };
}

module.exports = {
    checkIsSetup: checkIsSetup,
    assertSetupCompleted: assertSetupCompleted
};
