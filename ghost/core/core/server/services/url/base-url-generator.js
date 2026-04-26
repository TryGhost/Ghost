const nql = require('@tryghost/nql');
const debug = require('@tryghost/debug')('services:url:base-generator');

// @TODO: merge with filter plugin
const EXPANSIONS = [{
    key: 'author',
    replacement: 'authors.slug'
}, {
    key: 'tags',
    replacement: 'tags.slug'
}, {
    key: 'tag',
    replacement: 'tags.slug'
}, {
    key: 'authors',
    replacement: 'authors.slug'
}, {
    key: 'primary_tag',
    replacement: 'primary_tag.slug'
}, {
    key: 'primary_author',
    replacement: 'primary_author.slug'
}];

const PAGE_TO_TYPE_TRANSFORMER = nql.utils.mapKeyValues({
    key: {
        from: 'page',
        to: 'type'
    },
    values: [{
        from: false,
        to: 'post'
    }, {
        from: true,
        to: 'page'
    }]
});

/**
 * Shared base for URL generators (eager + lazy).
 *
 * Holds the immutable identity of a router's URL contribution: an identifier,
 * a resource type, a permalink template, an optional NQL filter, and a
 * registration position. The filter (if provided) is compiled once into an
 * NQL query and exposed via `matches(resource)`.
 *
 * Subclasses add the strategy-specific behavior (queue/Urls integration for
 * the eager path; on-demand generation + permalink reverse-matching for the
 * lazy path).
 */
class BaseUrlGenerator {
    /**
     * @param {Object} options
     * @param {string} options.identifier router ID reference
     * @param {string} [options.filter] NQL filter string
     * @param {string} options.resourceType e.g. 'posts', 'tags'
     * @param {string} options.permalink permalink template
     * @param {number} [options.position] position in the parent generator list
     */
    constructor({identifier, filter, resourceType, permalink, position}) {
        this.identifier = identifier;
        this.resourceType = resourceType;
        this.permalink = permalink;
        this.uid = position;

        if (filter) {
            this.filter = filter;
            this.nql = nql(filter, {
                expansions: EXPANSIONS,
                transformer: PAGE_TO_TYPE_TRANSFORMER
            });
            debug('filter', this.filter);
        }
    }

    /**
     * Whether this generator's filter (if any) accepts the resource.
     *
     * Returns true when no filter is configured, true when the compiled NQL
     * query matches, false otherwise. Failures inside `queryJSON` are
     * swallowed and return false — same behavior the eager generator has
     * relied on since the filter feature was introduced.
     *
     * @param {Object} resourceData
     * @returns {boolean}
     */
    matches(resourceData) {
        if (!this.nql) {
            return true;
        }

        try {
            return this.nql.queryJSON(resourceData);
        } catch (err) {
            debug(`Failed to queryJSON with filter "${this.filter}"`, err);
            return false;
        }
    }
}

module.exports = BaseUrlGenerator;
module.exports.EXPANSIONS = EXPANSIONS;
