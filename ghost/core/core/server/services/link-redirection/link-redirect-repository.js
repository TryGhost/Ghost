const LinkRedirect = require('./link-redirect');
const ObjectID = require('bson-objectid').default;
const debug = require('@tryghost/debug')('LinkRedirectRepository');

module.exports = class LinkRedirectRepository {
    /** @type {Object} */
    #LinkRedirect;
    /** @type {Object} */
    #urlUtils;
    /** @type {Boolean} */
    #cacheEnabled;
    /** @type {Object} */
    #cache;

    /**
     * @param {object} deps
     * @param {object} deps.LinkRedirect - Bookshelf Model
     * @param {object} deps.urlUtils
     * @param {object} deps.cacheAdapter - Cache Adapter instance, or null if cache is disabled
     * @param {object} deps.EventRegistry
     */
    constructor(deps) {
        debug('Creating LinkRedirectRepository');
        this.#LinkRedirect = deps.LinkRedirect;
        this.#urlUtils = deps.urlUtils;
        this.#cache = null;
        if (deps.cacheAdapter !== null) {
            debug('Caching enabled with adapter:', deps.cacheAdapter.constructor.name);
            this.#cache = deps.cacheAdapter;
            // This is a bit of a blunt instrument, but it's the best we can do for now
            // It covers all the cases we would need to invalidate the links cache
            // We need to invalidate the cache when:
            // - a redirect is edited
            // - a site's subdirectory is changed (rare)
            // - analytics settings are changed
            deps.EventRegistry.on('site.changed', () => {
                this.#cache.reset();
            });
        }
    }

    /**
     * Save a new LinkRedirect to the DB
     * @param {InstanceType<LinkRedirect>} linkRedirect
     * @returns {Promise<void>}
     */
    async save(linkRedirect) {
        debug('Saving link redirect', linkRedirect.from.pathname, '->', linkRedirect.to.href);
        const model = await this.#LinkRedirect.add({
            // Only store the pathname (no support for variable query strings)
            from: this.stripSubdirectoryFromPath(linkRedirect.from.pathname),
            to: linkRedirect.to.href
        }, {});

        linkRedirect.link_id = ObjectID.createFromHexString(model.id);
        if (this.#cache) {
            debug('Caching new link redirect', linkRedirect.from.pathname);
            this.#cache.set(linkRedirect.from.pathname, this.#serialize(linkRedirect));
        }
    }

    /**
     * Trim the leading slash from a URL path
     * @param {string} url
     * @returns {string} url without leading slash
     */
    #trimLeadingSlash(url) {
        return url.replace(/^\//, '');
    }

    /**
     * Returns a LinkRedirect object from a model
     * @param {object} model - Bookshelf model instance
     * @returns {InstanceType<LinkRedirect>} LinkRedirect
     */
    fromModel(model) {
        // Store if link has been edited
        // Note: in some edge cases updated_at is set directly after created_at, sometimes with a second difference, so we need to check for that
        const edited = model.get('updated_at')?.getTime() > (model.get('created_at')?.getTime() + 1000);

        return new LinkRedirect({
            id: model.id,
            from: new URL(this.#trimLeadingSlash(model.get('from')), this.#urlUtils.urlFor('home', true)),
            to: new URL(model.get('to')),
            edited
        });
    }

    /**
     * Create a LinkRedirect object from a JSON object (e.g. from the cache)
     * @param {object} serialized
     * @param {string} serialized.link_id - string representation of ObjectID
     * @param {string} serialized.from - path of the URL
     * @param {string} serialized.to - URL to redirect to
     * @param {boolean} serialized.edited - whether the link has been edited
     * @returns {InstanceType<LinkRedirect>} LinkRedirect
     */
    #fromSerialized(serialized) {
        return new LinkRedirect({
            id: serialized.link_id,
            from: new URL(this.#trimLeadingSlash(serialized.from), this.#urlUtils.urlFor('home', true)),
            to: new URL(serialized.to),
            edited: serialized.edited
        });
    }

    /**
     * Serialize a LinkRedirect object to a plain object (e.g. for caching)
     * @param {InstanceType<LinkRedirect>} linkRedirect
     * @returns {object} - serialized LinkRedirect
     */
    #serialize(linkRedirect) {
        return {
            link_id: linkRedirect.link_id.toHexString(),
            from: linkRedirect.from.pathname,
            to: linkRedirect.to.href,
            edited: linkRedirect.edited
        };
    }

    /**
     * Get all LinkRedirects from the DB, with optional filters
     * @param {object} options - options passed directly to LinkRedirect.findAll
     * @returns {Promise<InstanceType<LinkRedirect>[]>} array of LinkRedirects
     */
    async getAll(options) {
        const collection = await this.#LinkRedirect.findAll(options);

        const result = [];

        for (const model of collection.models) {
            result.push(this.fromModel(model));
        }

        return result;
    }

    /**
     * Get all LinkRedirect IDs from the DB, with optional filters
     * @param {object} options - options passed directly to LinkRedirect.getFilteredCollectionQuery
     * @returns {Promise<string[]>} array of LinkRedirect IDs
     */
    async getFilteredIds(options) {
        const linkRows = await this.#LinkRedirect.getFilteredCollectionQuery(options)
            .select('redirects.id')
            .distinct();
        return linkRows.map(row => row.id);
    }

    /**
     * Get a LinkRedirect by its URL
     * @param {URL} url
     * @returns {Promise<InstanceType<LinkRedirect>|undefined>} LinkRedirect
     */
    async getByURL(url) {
        debug('Getting link redirect for', url.pathname);
        // Strip subdirectory from path
        const from = this.stripSubdirectoryFromPath(url.pathname);

        if (this.#cache) {
            const cachedLink = await this.#cache.get(from);
            debug(`getByUrl ${url}: Cache ${cachedLink ? 'HIT' : 'MISS'}`);
            // Cache hit, serve from cache
            if (cachedLink) {
                return this.#fromSerialized(cachedLink);
            }
        }

        // Cache miss, fetch from the DB
        const linkRedirectModel = await this.#LinkRedirect.findOne({
            from
        }, {});

        if (linkRedirectModel) {
            const linkRedirect = this.fromModel(linkRedirectModel);
            if (this.#cache) {
                this.#cache.set(from, this.#serialize(linkRedirect));
            }
            return linkRedirect;
        }
    }

    /**
     * Convert root relative URLs to subdirectory relative URLs
     * @param {string} path
     * @returns {string} path without subdirectory
    */
    stripSubdirectoryFromPath(path) {
        // Bit weird, but only way to do it with the urlUtils atm

        // First convert path to an absolute path
        const absolute = this.#urlUtils.relativeToAbsolute(path);

        // Then convert it to a relative path, but without subdirectory
        return this.#urlUtils.absoluteToRelative(absolute, {withoutSubdirectory: true});
    }
};
