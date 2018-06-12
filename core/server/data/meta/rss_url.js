const routingService = require('../../services/routing');

/**
 * https://github.com/TryGhost/Team/issues/65#issuecomment-393622816
 *
 * For now we output only the default rss feed link. And this is the first collection.
 * If the first collection has rss disabled, we output nothing.
 *
 * @TODO: We are currently investigating this.
 */
function getRssUrl(data, absolute) {
    return routingService
        .registry
        .getFirstCollectionRouter()
        .getRssUrl({
            secure: data.secure,
            absolute: absolute
        });
}

module.exports = getRssUrl;
