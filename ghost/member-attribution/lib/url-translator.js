/**
 * @typedef {Object} UrlService
 * @prop {(resourceId: string) => Object} getResource
 * 
 */

/**
 * Translate a url into a type and id
 */
class UrlTranslator {
    /**
     * 
     * @param {Object} deps 
     * @param {UrlService} deps.urlService
     */
    constructor({urlService}) {
        this.urlService = urlService;
    }

    getTypeAndId(url) {
        const resource = this.urlService.getResource(url);
        if (!resource) {
            return;
        }

        if (resource.config.type === 'posts') {
            return {
                type: 'post',
                id: resource.data.id
            };
        }

        if (resource.config.type === 'pages') {
            return {
                type: 'page',
                id: resource.data.id
            };
        }

        if (resource.config.type === 'tags') {
            return {
                type: 'tag',
                id: resource.data.id
            };
        }

        if (resource.config.type === 'authors') {
            return {
                type: 'author',
                id: resource.data.id
            };
        }
    }
}

module.exports = UrlTranslator;
