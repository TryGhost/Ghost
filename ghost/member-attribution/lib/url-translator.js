/**
 * @typedef {Object} UrlService
 * @prop {(resourceId: string, options) => Object} getResource
 *  @prop {(resourceId: string, options) => string} getUrlByResourceId
 * 
 */

/**
 * Translate a url into, (id+type), or a resource, and vice versa
 */
class UrlTranslator {
    /**
     * 
     * @param {Object} deps 
     * @param {UrlService} deps.urlService
     * @param {Object} deps.urlUtils
     * @param {Object} deps.models
     * @param {Object} deps.models.Post
     * @param {Object} deps.models.Tag
     * @param {Object} deps.models.User
     */
    constructor({urlService, urlUtils, models}) {
        this.urlService = urlService;
        this.urlUtils = urlUtils;
        this.models = models;
    }

    /**
     * Convert root relative URLs to subdirectory relative URLs
     */
    stripSubdirectoryFromPath(path) {
        // Bit weird, but only way to do it with the urlUtils atm

        // First convert path to an absolute path
        const absolute = this.urlUtils.relativeToAbsolute(path);

        // Then convert it to a relative path, but without subdirectory
        return this.urlUtils.absoluteToRelative(absolute, {withoutSubdirectory: true});
    }

    /**
     * Convert root relative URLs to subdirectory relative URLs
     */
    relativeToAbsolute(path) {
        return this.urlUtils.relativeToAbsolute(path);
    }

    /**
     * Gives an ordinary URL a name, e.g. / is 'homepage'
     */
    getUrlTitle(url) {
        return url === '/' ? 'homepage' : url;
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

    getUrlByResourceId(id, options = {absolute: true}) {
        return this.urlService.getUrlByResourceId(id, options);
    }

    async getResourceById(id, type) {
        switch (type) {
        case 'post':
        case 'page': {
            const post = await this.models.Post.findOne({id}, {require: false});
            if (!post) {
                return null;
            }
    
            return post;
        }
        case 'author': {
            const user = await this.models.User.findOne({id}, {require: false});
            if (!user) {
                return null;
            }
    
            return user;
        }
        case 'tag': {
            const tag = await this.models.Tag.findOne({id}, {require: false});
            if (!tag) {
                return null;
            }
    
            return tag;
        }
        }
        return null;
    }
}

module.exports = UrlTranslator;
