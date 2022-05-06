const pathMatch = require('path-match')();

module.exports = (url) => {
    let apiRouteMatcher = '/:version(v2|v3|v4|canary)?/:api(admin|content)/*';

    if (url.startsWith('/ghost/api')) {
        apiRouteMatcher = `/ghost/api${apiRouteMatcher}`;
    }

    if (!url.endsWith('/')) {
        url += '/';
    }

    let {version, api} = pathMatch(apiRouteMatcher)(url);

    if (version === [null]) {
        version = null;
    }

    return {version, api};
};
