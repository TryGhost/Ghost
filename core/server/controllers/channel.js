var _ = require('lodash'),
    common = require('../lib/common'),
    filters = require('../filters'),
    safeString = require('../utils').safeString,
    handleError = require('./frontend/error'),
    fetchData = require('./frontend/fetch-data'),
    setRequestIsSecure = require('./frontend/secure'),
    renderChannel = require('./frontend/render-channel');

// This here is a controller.
// The "route" is handled in services/channels/router.js
// There's both a top-level channelS router, and an individual channel one
module.exports = function channelController(req, res, next) {
    // Parse the parameters we need from the URL
    var pageParam = req.params.page !== undefined ? req.params.page : 1,
        slugParam = req.params.slug ? safeString(req.params.slug) : undefined;

    // @TODO: fix this, we shouldn't change the channel object!
    // Set page on postOptions for the query made later
    res.locals.channel.postOptions.page = pageParam;
    res.locals.channel.slugParam = slugParam;

    // Call fetchData to get everything we need from the API
    return fetchData(res.locals.channel).then(function handleResult(result) {
        // If page is greater than number of pages we have, go straight to 404
        if (pageParam > result.meta.pagination.pages) {
            return next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
        }

        // Format data 1
        // @TODO: figure out if this can be removed, it's supposed to ensure that absolutely URLs get generated
        // correctly for the various objects, but I believe it doesn't work and a different approach is needed.
        setRequestIsSecure(req, result.posts);
        _.each(result.data, function (data) {
            setRequestIsSecure(req, data);
        });

        // @TODO: properly design these filters
        filters.doFilter('prePostsRender', result.posts, res.locals)
            .then(function (posts) {
                result.posts = posts;
                return result;
            })
            .then(renderChannel(req, res));
    }).catch(handleError(next));
};
