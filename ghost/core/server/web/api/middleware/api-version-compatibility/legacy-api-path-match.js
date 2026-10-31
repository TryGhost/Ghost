const pathMatch = require('path-match')();

module.exports = (url) => {
  const basePath = 'ghost/api';
  const apiRouteMatcher = '/:version(v2|v3|v4|canary)?/:api(admin|content)/*';
  // Only the path identifies a versioned API URL. The query string is
  // client-controlled data and must never influence the match.
  const [path] = url.split('?');
  let urlToMatch = path;

  if (path.includes(basePath)) {
    urlToMatch = path.split(basePath)[1];
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
