const DomainEvents = require('@tryghost/domain-events');
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
 * @typedef {object} ILinkRedirectService
 * @prop {(to: URL, slug: string) => Promise<ILinkRedirect>} addRedirect
 * @prop {() => Promise<string>} getSlug
 * @prop {({filter: string}) => Promise<ILinkRedirect[]>} getAll
 */

/**
 * @typedef {object} ILinkClickTrackingService
 * @prop {(link: ILinkRedirect, uuid: string) => Promise<URL>} addTrackingToRedirect
 */

/**
 * @typedef {object} IPostLinkRepository
 * @prop {(postLink: PostLink) => Promise<void>} save
 * @prop {({filter: string}) => Promise<PostLink[]>} getAll
 */

class LinkClickTrackingService {
    #initialised = false;

    /** @type ILinkClickRepository */
    #linkClickRepository;
    /** @type ILinkRedirectService */
    #linkRedirectService;
    /** @type IPostLinkRepository */
    #postLinkRepository;

    /**
     * @param {object} deps
     * @param {ILinkClickRepository} deps.linkClickRepository
     * @param {ILinkRedirectService} deps.linkRedirectService
     * @param {IPostLinkRepository} deps.postLinkRepository
     */
    constructor(deps) {
        this.#linkClickRepository = deps.linkClickRepository;
        this.#linkRedirectService = deps.linkRedirectService;
        this.#postLinkRepository = deps.postLinkRepository;
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
     */
    async getLinks(options) {
        const data = [];

        const postLinks = await this.#postLinkRepository.getAll({
            filter: options.filter
        });

        if (postLinks.length === 0) {
            return data;
        }

        const links = await this.#linkRedirectService.getAll({
            filter: `id:[${postLinks.map(x => x.link_id.toHexString())}]`
        });

        for (const link of links) {
            const events = await this.#linkClickRepository.getAll({
                filter: `link_id:[${link.link_id.toHexString()}]`
            });

            const result = {
                id: link.link_id.toHexString(),
                url: link.to.toString(),
                post_id: postLinks.find((postLink) => {
                    return postLink.link_id.equals(link.link_id);
                }).post_id.toHexString(),
                click_events: events
            };

            data.push(result);
        }

        return data;
    }

    /**
     * Replace URL with a redirect that redirects to the original URL, and link that redirect with the given post
     */
    async addRedirectToUrl(url, post) {
        // Generate a unique redirect slug
        const slug = await this.#linkRedirectService.getSlug();

        // Add redirect for link click tracking
        const redirect = await this.#linkRedirectService.addRedirect(url, slug);

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
        DomainEvents.subscribe(RedirectEvent, async (event) => {
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
