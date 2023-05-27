const crypto = require('crypto');
const DomainEvents = require('@tryghost/domain-events');
const RedirectEvent = require('./RedirectEvent');
const LinkRedirect = require('./LinkRedirect');

/**
 * @typedef {object} ILinkRedirectRepository
 * @prop {(url: URL) => Promise<LinkRedirect|undefined>} getByURL
 * @prop {({filter: string}) => Promise<LinkRedirect[]>} getAll
 * @prop {({filter: string}) => Promise<String[]>} getFilteredIds
 * @prop {(linkRedirect: LinkRedirect) => Promise<void>} save
 */

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
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     *
     * @returns {Promise<void>}
     */
    async handleRequest(req, res, next) {
        try {
            // skip handling if original url doesn't match the prefix
            const fullURLWithRedirectPrefix = `${this.#baseURL.pathname}${this.#redirectURLPrefix}`;
            // @NOTE: below is equivalent to doing:
            //          router.get('/r/'), (req, res) ...
            //        To make it cleaner we should rework it to:
            //          linkRedirects.service.handleRequest(router);
            //        and mount routes on top like for example sitemapHandler does
            //        Cleanup issue: https://github.com/TryGhost/Toolbox/issues/516
            if (!req.originalUrl.startsWith(fullURLWithRedirectPrefix)) {
                return next();
            }

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

            res.setHeader('X-Robots-Tag', 'noindex, nofollow');
            return res.redirect(link.to.href);
        } catch (e) {
            return next(e);
        }
    }
}

module.exports = LinkRedirectsService;
