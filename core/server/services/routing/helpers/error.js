const common = require('../../../lib/common');

function handleError(next) {
    return function handleError(err) {
        // If we've thrown an error message of type: 'NotFound' then we found no path match.
        if (err.errorType === 'NotFoundError') {
            return next();
        }

        // CASE: the site should not output validation errors e.g. you ask for /feed.xml/ and it tries to fetch
        //       this post from Content API (by slug), but this is not a valid slug. With dynamic routing we cannot
        //       add a regex to the target express route, because we don't know if people use /:slug/ or not. It's dynamic.
        if (err.errorType === 'ValidationError') {
            common.logging.error(err);

            // @NOTE: Just try next router, it will end in a 404 if no router can resolve the request.
            return next();
        }

        return next(err);
    };
}

module.exports = handleError;
