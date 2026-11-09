const linkRedirects = require('../../../server/services/link-redirection').default;

module.exports = function handleRedirects(siteApp) {
  siteApp.get(
    linkRedirects.service.relativeRedirectPrefix() + '*',
    linkRedirects.service.handleRequest,
  );
};
