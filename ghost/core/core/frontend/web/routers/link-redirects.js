const linkRedirects = require('../../../server/services/link-redirection');

module.exports = function handleRedirects(siteApp) {
    siteApp.get(linkRedirects.service.relativeRedirectPrefix() + '*', linkRedirects.service.handleRequest);
};
