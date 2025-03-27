const {SafeString} = require('../services/handlebars');
const logging = require('@tryghost/logging');
const {urlUtils} = require('../services/proxy');

module.exports = function content_api_url(options) { // eslint-disable-line camelcase
    let result;
    const absoluteUrlRequested = getAbsoluteOption(options);

    try {
        let path = urlUtils.urlFor('api', {type: 'content'}, absoluteUrlRequested);
        result = new SafeString(path);
    } catch (error) {
        logging.error(error);
        result = '';
    }

    return result;
};

function getAbsoluteOption(options) {
    const absoluteOption = options && options.hash && options.hash.absolute;
    if (absoluteOption === undefined || absoluteOption === 'true' || absoluteOption === true || absoluteOption === null) {
        return true;
    } else {
        return false;
    }
}

