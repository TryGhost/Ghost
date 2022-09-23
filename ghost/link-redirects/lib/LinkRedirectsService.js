const crypto = require('crypto');
const DomainEvents = require('@tryghost/domain-events');
const RedirectEvent = require('./RedirectEvent');
const LinkRedirect = require('./LinkRedirect');

/**
 * @typedef {object} ILinkRedirectRepository
 * @prop {(url: URL) => Promise<LinkRedirect|undefined>} getByURL
 * @prop {({filter: string}) => Promise<LinkRedirect[]>} getAll
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
     * Get a unique URL with slug for creating unique redirects
     *
     * @returns {Promise<URL>}
     */
    async getSlugUrl() {
        let url;
        while (!url || await this.#linkRedirectRepository.getByURL(url)) {
            const slug = crypto.randomBytes(4).toString('hex');
            url = new URL(`r/${slug}`, this.#baseURL);
        }
        return url;
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
