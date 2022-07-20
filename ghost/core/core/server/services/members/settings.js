const urlUtils = require('../../../shared/url-utils');
const SingleUseTokenProvider = require('./SingleUseTokenProvider');
const models = require('../../models');
const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;

// @todo: can get removed, since this is moved to the settings bread service
function createSettingsInstance() {
    const oldTokenProvider = new SingleUseTokenProvider(models.SingleUseToken, MAGIC_LINK_TOKEN_VALIDITY);

    const getEmailFromToken = async ({token}) => {
        const data = await oldTokenProvider.validate(token);
        return data.email;
    };

    const getAdminRedirectLink = ({type}) => {
        const adminUrl = urlUtils.urlFor('admin', true);
        if (type === 'supportAddressUpdate') {
            return urlUtils.urlJoin(adminUrl, `#/settings/members/?${type}=success`);
        } else {
            return urlUtils.urlJoin(adminUrl, `#/site/`);
        }
    };

    return {
        getEmailFromToken,
        getAdminRedirectLink
    };
}

module.exports = createSettingsInstance;
