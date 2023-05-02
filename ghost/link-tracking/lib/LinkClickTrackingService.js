const {RedirectEvent} = require('@tryghost/link-redirects');
const LinkClick = require('./ClickEvent');
const PostLink = require('./PostLink');
const ObjectID = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const nql = require('@tryghost/nql');
const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const moment = require('moment');

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
 * @prop {({filter: string}) => Promise<string[]>} getFilteredIds
 */

/**
 * @typedef {object} IPostLinkRepository
 * @prop {(postLink: PostLink) => Promise<void>} save
 * @prop {({filter: string}) => Promise<FullPostLink[]>} getAll
 * @prop {(linkIds: array, data, options) => Promise<FullPostLink[]>} updateLinks
 */

const messages = {
    invalidFilter: 'Invalid filter value received',
    unsupportedBulkAction: 'Unsupported bulk action',
    invalidRedirectUrl: 'Invalid redirect URL value'
};

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
    /** @type {Object} */
    #LinkRedirect;
    /** @type {Object} */
    #urlUtils;

    /**
     * @param {object} deps
     * @param {ILinkClickRepository} deps.linkClickRepository
     * @param {ILinkRedirectService} deps.linkRedirectService
     * @param {IPostLinkRepository} deps.postLinkRepository
     * @param {DomainEvents} deps.DomainEvents
     * @param {urlUtils} deps.urlUtils
     */
    constructor(deps) {
        this.#linkClickRepository = deps.linkClickRepository;
        this.#linkRedirectService = deps.linkRedirectService;
        this.#postLinkRepository = deps.postLinkRepository;
        this.#DomainEvents = deps.DomainEvents;
        this.#urlUtils = deps.urlUtils;
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
   * validate and manage the new redirect url in filter
   * `to` url needs decoding and transformation to relative url for comparision
   * @param {string} filter
   * @returns {Object} parsed filter
   * @throws {errors.BadRequestError}
   */
    #parseLinkFilter(filter) {
        // decode filter to manage any encoded uri components
        filter = decodeURIComponent(filter);

        try {
            const filterJson = nql(filter).parse();
            const postId = filterJson?.$and?.[0]?.post_id;
            const redirectUrl = new URL(filterJson?.$and?.[1]?.to);
            if (!postId || !redirectUrl) {
                throw new errors.BadRequestError({
                    message: tpl(messages.invalidFilter)
                });
            }
            return {
                postId,
                redirectUrl
            };
        } catch (e) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidFilter),
                context: e.message
            });
        }
    }

    #getRedirectLinkWithAttribution({newLink, oldLink, postId}) {
        const newUrl = new URL(newLink);
        const oldUrl = new URL(oldLink);
        // append newsletter ref query param from oldUrl to newUrl
        if (oldUrl.searchParams.has('ref')) {
            newUrl.searchParams.set('ref', oldUrl.searchParams.get('ref'));
        }

        // append post attribution to site urls
        const isSite = this.#urlUtils.isSiteUrl(newUrl);
        if (isSite) {
            newUrl.searchParams.set('attribution_type', 'post');
            newUrl.searchParams.set('attribution_id', postId);
        }
        return newUrl;
    }

    async #updateLinks(data, options) {
        const filterOptions = _.pick(options, ['transacting', 'context', 'filter']);

        // decode and parse filter to manage new redirect url
        const {postId, redirectUrl} = this.#parseLinkFilter(filterOptions.filter);

        // manages transformation of current url to relative for comparision
        const transformedOldUrl = this.#urlUtils.absoluteToTransformReady(redirectUrl.href);
        const filterQuery = `post_id:${postId}+to:'${transformedOldUrl}'`;

        const updatedFilterOptions = {
            ...filterOptions,
            filter: filterQuery
        };

        // get new redirect link with proper attribution
        const newRedirectUrl = this.#getRedirectLinkWithAttribution({
            newLink: data.meta?.link?.to,
            oldLink: redirectUrl.href,
            postId
        });
        const linkIds = await this.#linkRedirectService.getFilteredIds(updatedFilterOptions);

        const bulkUpdateOptions = _.pick(options, ['transacting']);
        const updateData = {
            to: this.#urlUtils.absoluteToTransformReady(newRedirectUrl.href),
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        return await this.#postLinkRepository.updateLinks(linkIds, updateData, bulkUpdateOptions);
    }

    async bulkEdit(data, options) {
        if (data.action === 'updateLink') {
            return await this.#updateLinks(data, options);
        }
        throw new errors.IncorrectUsageError({
            message: tpl(messages.unsupportedBulkAction)
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
