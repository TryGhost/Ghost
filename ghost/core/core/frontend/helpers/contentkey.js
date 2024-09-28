// contentkey provides a new helper that returns the content API key.  

const {SafeString} = require('../services/handlebars');
const logging = require('@tryghost/logging');
const {getFrontendKey} = require('../services/proxy');

module.exports = async function contentkey() { // eslint-disable-line camelcase
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