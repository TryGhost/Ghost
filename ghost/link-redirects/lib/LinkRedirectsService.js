const crypto = require('crypto');
const DomainEvents = require('@tryghost/domain-events');
const RedirectEvent = require('./RedirectEvent');
const LinkRedirect = require('./LinkRedirect');

/**
 * @typedef {object} ILinkRedirectRepository
 * @prop {(url: URL) => Promise<LinkRedirect>} getByURL
 * @prop {(linkRedirect: LinkRedirect) => Promise<void>} save
 */

class LinkRedirectsService {
    /** @type ILinkRedirectRepository */
    #linkRedirectRepository;
    /** @type URL */
    #baseURL;

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
     * Get a unique slug for a redirect which hasn't already been taken
     *
     * @returns {Promise<string>}
     */
    async getSlug() {
        return crypto.randomBytes(4).toString('hex');
    }

    /**
     * @param {URL} to
     * @param {string} slug
     *
     * @returns {Promise<LinkRedirect>}
     */
    async addRedirect(to, slug) {
        const from = new URL(`r/${slug}`, this.#baseURL);

        const link = new LinkRedirect({
            to,
            from
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

        return res.redirect(link.to.href);
    }
}

module.exports = LinkRedirectsService;
