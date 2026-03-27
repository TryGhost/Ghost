const crypto = require('crypto');
const DomainEvents = require('@tryghost/domain-events');
const RedirectEvent = require('./redirect-event');
const LinkRedirect = require('./link-redirect');

/**
 * @typedef {object} ILinkRedirectRepository
 * @prop {(url: URL) => Promise<LinkRedirect|undefined>} getByURL
 * @prop {({filter: string}) => Promise<LinkRedirect[]>} getAll
 * @prop {({filter: string}) => Promise<String[]>} getFilteredIds
 * @prop {(linkRedirect: LinkRedirect) => Promise<void>} save
 */

// Placeholder pattern for member UUID in redirect destinations
// %%{uuid}%% is substituted with the actual UUID at redirect time
const MEMBER_UUID_PLACEHOLDER = '%%{uuid}%%';

// UUID pattern (8-4-4-4-12 hex format) for validating member UUIDs
//   Ghost uses UUID v4; this regex is not that strict
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class LinkRedirectsService {
    /** @type ILinkRedirectRepository */
    #linkRedirectRepository;
    /** @type URL */
    #baseURL;

    /** @type String */
    #redirectURLPrefix = 'r/';

    /**
     * @param {object} deps
     * @param {ILinkRedirectRepository} deps.linkRedirectRepository
     * @param {object} deps.config
     * @param {URL} deps.config.baseURL
     */
    constructor(deps) {
        this.#linkRedirectRepository = deps.linkRedirectRepository;
        if (!deps.config.baseURL.pathname.endsWith('/')) {
            this.#baseURL = new URL(deps.config.baseURL);
            this.#baseURL.pathname += '/';
        } else {
            this.#baseURL = deps.config.baseURL;
        }
        this.handleRequest = this.handleRequest.bind(this);
    }

    /**
     * Get a unique URL with slug for creating unique redirects
     *
     * @returns {Promise<URL>}
     */
    async getSlugUrl() {
        let url;
        while (!url || await this.#linkRedirectRepository.getByURL(url)) {
            const slug = crypto.randomBytes(4).toString('hex');
            url = new URL(`${this.#redirectURLPrefix}${slug}`, this.#baseURL);
        }
        return url;
    }

    /**
     * @param {Object} options
     *
     * @returns {Promise<String[]>}
     */
    async getFilteredIds(options) {
        return await this.#linkRedirectRepository.getFilteredIds(options);
    }

    /**
     * @param {URL} from
     * @param {URL} to
     *
     * @returns {Promise<LinkRedirect>}
     */
    async addRedirect(from, to) {
        const link = new LinkRedirect({
            from,
            to
        });

        await this.#linkRedirectRepository.save(link);

        return link;
    }

    /**
     * Returns the relative path prefix without subdirectory (e.g., /r/)
     * Used for Express route matching where subdirectory is already stripped
     * @return {string}
     **/
    relativeRedirectPrefix() {
        return '/' + this.#redirectURLPrefix;
    }

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     *
     * @returns {Promise<void>}
     */
    async handleRequest(req, res, next) {
        try {
            const url = new URL(req.originalUrl, this.#baseURL);
            const link = await this.#linkRedirectRepository.getByURL(url);

            if (!link) {
                return next();
            }

            const event = RedirectEvent.create({
                url,
                link
            });

            DomainEvents.dispatch(event);

            // Substitute %%{uuid}%% placeholder if present in the destination URL
            // This allows tracked links to include dynamic member UUIDs (e.g., for Transistor embeds)
            // The URL may be stored in different encoded forms depending on placeholder position:
            //   - Query string: %%{uuid}%% is preserved as-is
            //   - Path: {/} are encoded to %7B/%7D, producing %%%7Buuid%7D%%
            //   - Double-encoded: %25%25%7Buuid%7D%25%25
            // We try decodeURIComponent first (handles double-encoded), then normalize
            // URL-encoded braces to recover the placeholder from path-encoded forms
            let redirectUrl = link.to.href;
            let decodedUrl;
            try {
                decodedUrl = decodeURIComponent(redirectUrl);
            } catch (e) {
                // decodeURIComponent fails on malformed sequences (e.g. %%%7Buuid%7D%%)
                // Normalize URL-encoded braces so we can still detect the placeholder
                decodedUrl = redirectUrl.replace(/%7B/gi, '{').replace(/%7D/gi, '}');
            }
            const hasMemberUuidPlaceholder = decodedUrl.includes(MEMBER_UUID_PLACEHOLDER);
            if (hasMemberUuidPlaceholder) {
                const memberUuid = url.searchParams.get('m');
                if (memberUuid && UUID_REGEX.test(memberUuid)) {
                    redirectUrl = decodedUrl.replaceAll(MEMBER_UUID_PLACEHOLDER, memberUuid);
                } else {
                    // Remove placeholder if no valid UUID (includes unsubstituted Mailgun variables)
                    redirectUrl = decodedUrl.replaceAll(MEMBER_UUID_PLACEHOLDER, '');
                }
            }

            res.setHeader('X-Robots-Tag', 'noindex, nofollow');
            return res.redirect(redirectUrl);
        } catch (e) {
            return next(e);
        }
    }
}

module.exports = LinkRedirectsService;
