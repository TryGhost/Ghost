const pathMatch = require('path-match')();

module.exports = (url) => {
  const basePath = 'ghost/api';
  const apiRouteMatcher = '/:version(v2|v3|v4|canary)?/:api(admin|content)/*';
  let urlToMatch = url;

  if (url.includes(basePath)) {
    urlToMatch = url.split(basePath)[1];
  }

  if (!urlToMatch.endsWith('/')) {
    urlToMatch += '/';
  }

  let { version, api } = pathMatch(apiRouteMatcher)(urlToMatch);

  if (version === undefined) {
    version = null;
  }

  return { version, api };
};
