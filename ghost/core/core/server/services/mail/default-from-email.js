const urlUtils = require('../../../shared/url-utils');

function getDomain() {
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
}

function getDefaultFromEmail(prefix = 'noreply') {
    // Default to noreply@[blog.url]
    return `${prefix}@${getDomain()}`;
}

module.exports = {getDomain,getDefaultFromEmail};
