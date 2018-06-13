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
    const firstCollection = routingService.registry.getFirstCollectionRouter();

    if (!firstCollection) {
        return null;
    }

    return firstCollection.getRssUrl({
        secure: data.secure,
        absolute: absolute
    });
}

module.exports = getRssUrl;
