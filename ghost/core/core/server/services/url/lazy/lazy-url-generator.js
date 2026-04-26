const localUtils = require('../../../../shared/url-utils');
const settingsCache = require('../../../../shared/settings-cache');
const BaseUrlGenerator = require('../base-url-generator');
const {compilePermalink} = require('./permalink-matcher');

const defaultGetTimezone = () => settingsCache.get('timezone');

/**
 * URL generator for the lazy URL service.
 *
 * Unlike the eager UrlGenerator, this class does not own resources, talk to
 * the queue, or maintain a Urls map. It exposes two pure operations:
 *
 *   - generateUrl(resource): apply this generator's permalink template to a
 *     resource's data
 *   - matchUrl(url): reverse a request URL into placeholder values, used for
 *     forward lookup in LazyUrlService.getResource()
 *
 * Filter evaluation is inherited from BaseUrlGenerator.matches().
 */
class LazyUrlGenerator extends BaseUrlGenerator {
    /**
     * @param {Object} options
     * @param {string} options.identifier router ID
     * @param {string} [options.filter] NQL filter from routes.yaml
     * @param {string} options.resourceType e.g. 'posts'
     * @param {string} options.permalink permalink template
     * @param {number} options.position position in the parent generator list
     * @param {Function} [options.getTimezone] override for tests
     */
    constructor({identifier, filter, resourceType, permalink, position, getTimezone}) {
        super({identifier, filter, resourceType, permalink, position});
        this.compiledPermalink = compilePermalink(permalink);
        this.getTimezone = getTimezone || defaultGetTimezone;
    }

    /**
     * Substitute placeholders in this generator's permalink with values from
     * the resource. Delegates to the same `replacePermalink` helper the eager
     * path uses, so generated URLs are byte-for-byte identical given the
     * same input.
     *
     * @param {Object} resourceData
     * @returns {string}
     */
    generateUrl(resourceData) {
        return localUtils.replacePermalink(this.permalink, resourceData, this.getTimezone());
    }

    /**
     * Reverse a request URL into placeholder values. Returns null when the
     * URL does not match this generator's permalink shape, or when the
     * permalink lacks an identifier (`:slug` or `:id`) and so cannot be used
     * to locate a single resource.
     *
     * @param {string} url
     * @returns {Object|null}
     */
    matchUrl(url) {
        if (!this.compiledPermalink.forwardLookupSafe) {
            return null;
        }
        const m = this.compiledPermalink.regex.exec(url);
        return m ? m.groups : null;
    }
}

module.exports = LazyUrlGenerator;
