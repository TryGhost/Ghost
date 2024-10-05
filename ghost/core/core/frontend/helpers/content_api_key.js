const {SafeString} = require('../services/handlebars');
const logging = require('@tryghost/logging');
const {getFrontendKey} = require('../services/proxy');

module.exports = async function content_api_key() { // eslint-disable-line camelcase
    try {
        const frontendKey = await getFrontendKey();

        if (!frontendKey) {
            logging.warn('contentkey: No content key found');
            return '';
        }
        return new SafeString(frontendKey);
    } catch (error) {
        logging.error(error);
        return '';
    }
};
module.exports.async = true;