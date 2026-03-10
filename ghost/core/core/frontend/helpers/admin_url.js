const {urlUtils} = require('../services/proxy');
const {SafeString} = require('../services/handlebars');

module.exports = function admin_url() { // eslint-disable-line camelcase
    return new SafeString(urlUtils.urlFor('admin', true));
};
