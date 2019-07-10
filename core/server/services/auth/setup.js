const models = require('../../models');

/**
 * Returns setup status
 *
 * @return {Promise<Boolean>}
 */
function checkIsSetup() {
    return models.User.isSetup();
}

module.exports = {
    checkIsSetup: checkIsSetup
};
