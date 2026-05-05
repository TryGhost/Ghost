/**
 * @typedef {Object} UrlService
 * @prop {{
 *   getUrlForResource: (resource: Object, options: Object) => string,
 *   resolveUrl: (path: string) => Promise<Object | null>
 * }} facade
 */

const toPlain = require('../../lib/common/to-plain');

const TYPE_TO_RESOURCE = {
    post: 'posts',
    page: 'pages',
    tag: 'tags',
    author: 'authors'
};

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

    /**
     * Get the resource type and ID from a URLHistory item that was added by the frontend attribution script
     * @param {import('./url-history').UrlHistoryItem} item
     * @returns {Promise<{type: string, id: string | null, url: string}|null>} Returns null if the item is invalid
     */
    async getResourceDetails(item) {
        if (item.type) {
            const resource = await this.getResourceById(item.id, item.type);
            if (resource) {
                return {
                    type: item.type,
                    id: item.id,
                    url: this.getResourceUrl(item.id, item.type, resource, {absolute: false})
                };
            }

            // Invalid id: ignore
            return null;
        }

        if (!item.path) {
            return null;
        }

        const path = this.stripSubdirectoryFromPath(item.path);
        return {
            type: 'url',
            id: null,
            ...(await this.getTypeAndIdFromPath(path)),
            url: path
        };
    }

    /**
     * Get the resource type and ID from a path that was visited on the site
     * @param {string} path (excluding subdirectory)
     */
    async getTypeAndIdFromPath(path) {
        // resolveUrl may reject during route rebuilds (URL service not yet
        // ready). Member attribution is best-effort: a failed lookup should
        // fall back to the URL-typed result (handled by the caller), not
        // surface as an error.
        let resource;
        try {
            resource = await this.urlService.facade.resolveUrl(path);
        } catch (err) {
            return;
        }
        if (!resource) {
            return;
        }

        if (resource.type === 'posts') {
            return {
                type: 'post',
                id: resource.id
            };
        }

        if (resource.type === 'pages') {
            return {
                type: 'page',
                id: resource.id
            };
        }

        if (resource.type === 'tags') {
            return {
                type: 'tag',
                id: resource.id
            };
        }

        if (resource.type === 'authors') {
            return {
                type: 'author',
                id: resource.id
            };
        }
    }

    /**
     * Get the URL for a resource, handling email-only posts which have no
     * public URL (the URL service returns /404/ for them).
     */
    getResourceUrl(id, type, model, {absolute = true} = {}) {
        const isEmailOnly = type === 'post' && model.get('status') === 'sent';
        if (isEmailOnly) {
            const emailPath = `/email/${model.get('uuid')}/`;
            return absolute ? this.relativeToAbsolute(emailPath) : emailPath;
        }
        // Lazy URL service evaluates permalink templates against resource fields
        // (slug, published_at, primary_tag, ...). Caller already loaded the model,
        // so spread its plain data so those fields reach the facade.
        const data = toPlain(model);
        const resource = {...data, id, type: TYPE_TO_RESOURCE[type]};
        return this.urlService.facade.getUrlForResource(resource, {absolute});
    }

    async getResourceById(id, type) {
        switch (type) {
        case 'post':
        case 'page': {
            // withRelated: tags+authors so the lazy URL service can evaluate
            // `:primary_tag` / `:primary_author` permalink templates against
            // the resource. Mirrors services/url/config.js's posts config.
            const post = await this.models.Post.findOne({id}, {
                require: false,
                filter: 'type:[post,page]+status:[published,sent]',
                withRelated: ['tags', 'authors']
            });
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
