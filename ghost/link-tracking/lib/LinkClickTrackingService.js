const {RedirectEvent} = require('@tryghost/link-redirects');
const LinkClick = require('./LinkClick');
const PostLink = require('./PostLink');
const ObjectID = require('bson-objectid').default;

/**
 * @typedef {object} ILinkClickRepository
 * @prop {(event: LinkClick) => Promise<void>} save
 * @prop {({filter: string}) => Promise<LinkClick[]>} getAll
 */

/**
 * @typedef {object} ILinkRedirect
 * @prop {ObjectID} link_id
 * @prop {URL} to
 * @prop {URL} from
 */

/**
 * @typedef {import('./FullPostLink')} FullPostLink
 */

/**
 * @typedef {object} ILinkRedirectService
 * @prop {(to: URL, slug: string) => Promise<ILinkRedirect>} addRedirect
 * @prop {() => Promise<string>} getSlug
 * @prop {({filter: string}) => Promise<ILinkRedirect[]>} getAll
 */

/**
 * @typedef {object} IPostLinkRepository
 * @prop {(postLink: PostLink) => Promise<void>} save
 * @prop {({filter: string}) => Promise<FullPostLink[]>} getAll
 */

class LinkClickTrackingService {
    #initialised = false;

    /** @type ILinkClickRepository */
    #linkClickRepository;
    /** @type ILinkRedirectService */
    #linkRedirectService;
    /** @type IPostLinkRepository */
    #postLinkRepository;
    /** @type DomainEvents */
    #DomainEvents;

    /**
     * @param {object} deps
     * @param {ILinkClickRepository} deps.linkClickRepository
     * @param {ILinkRedirectService} deps.linkRedirectService
     * @param {IPostLinkRepository} deps.postLinkRepository
     * @param {DomainEvents} deps.DomainEvents
     */
    constructor(deps) {
        this.#linkClickRepository = deps.linkClickRepository;
        this.#linkRedirectService = deps.linkRedirectService;
        this.#postLinkRepository = deps.postLinkRepository;
        this.#DomainEvents = deps.DomainEvents;
    }

    async init() {
        if (this.#initialised) {
            return;
        }
        this.subscribe();
        this.#initialised = true;
    }

    /**
     * @param {object} options
     * @param {string} options.filter
     * @return {Promise<FullPostLink[]>}
     */
    async getLinks(options) {
        return await this.#postLinkRepository.getAll({
            filter: options.filter
        });
    }

    /** 
     * @private (not using # to allow tests)
     * Replace URL with a redirect that redirects to the original URL, and link that redirect with the given post
     */
    async addRedirectToUrl(url, post) {
        // Generate a unique redirect slug
        const slugUrl = await this.#linkRedirectService.getSlugUrl();

        // Add redirect for link click tracking
        const redirect = await this.#linkRedirectService.addRedirect(slugUrl, url);

        // Store a reference of the link against the post
        const postLink = new PostLink({
            link_id: redirect.link_id,
            post_id: ObjectID.createFromHexString(post.id)
        });
        await this.#postLinkRepository.save(postLink);

        return redirect.from;
    }

    /**
     * Add tracking to a URL and returns a new URL (if link click tracking is enabled)
     * @param {URL} url
     * @param {Post} post
     * @param {string} memberUuid
     * @return {Promise<URL>}
     */
    async addTrackingToUrl(url, post, memberUuid) {
        url = await this.addRedirectToUrl(url, post);
        url.searchParams.set('m', memberUuid);
        return url;
    }

    subscribe() {
        this.#DomainEvents.subscribe(RedirectEvent, async (event) => {
            const uuid = event.data.url.searchParams.get('m');
            if (!uuid) {
                return;
            }

            const click = new LinkClick({
                member_uuid: uuid,
                link_id: event.data.link.link_id
            });
            await this.#linkClickRepository.save(click);
        });
    }
}

module.exports = LinkClickTrackingService;
