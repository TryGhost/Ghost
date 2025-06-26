const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

module.exports = class MentionSendingService {
    #discoveryService;
    #externalRequest;
    #getSiteUrl;
    #getPostUrl;
    #isEnabled;
    #jobService;

    constructor({discoveryService, externalRequest, getSiteUrl, getPostUrl, isEnabled, jobService}) {
        this.#discoveryService = discoveryService;
        this.#externalRequest = externalRequest;
        this.#getSiteUrl = getSiteUrl;
        this.#getPostUrl = getPostUrl;
        this.#isEnabled = isEnabled;
        this.#jobService = jobService;
    }

    get siteUrl() {
        try {
            return new URL(this.#getSiteUrl());
        } catch (e) {
            return null;
        }
    }

    /**
     * Listen for new and edited published posts and automatically send webmentions. Unpublished posts should send mentions
     *  so the receiver can discover a 404 response and remove the mentions.
     * @param {*} events
     */
    listen(events) {
        events.on('post.published', this.sendForPost.bind(this));
        events.on('post.published.edited', this.sendForPost.bind(this));
        events.on('post.unpublished', this.sendForPost.bind(this));
        events.on('page.published', this.sendForPost.bind(this));
        events.on('page.published.edited', this.sendForPost.bind(this));
        events.on('page.unpublished', this.sendForPost.bind(this));
    }

    async sendForPost(post, options) {
        // NOTE: this is not ideal and shouldn't really be handled within the package...
        // for now we don't want to evaluate mentions when importing data (at least needs queueing set up)
        // we do not want to evaluate mentions with fixture (internal) data, e.g. generating posts
        // TODO: real solution is likely suppressing event emission when building fixture data
        if (options && (options.importing || (options.context && options.context.internal))) {
            return;
        }

        try {
            if (!this.#isEnabled()) {
                return;
            }
            // TODO: we need to check old url and send webmentions in case the url changed of a post
            if (post.get('status') === post.previous('status') && post.get('html') === post.previous('html')) {
                // Not changed
                return;
            }
            if (post.get('status') !== 'published' && post.previous('status') !== 'published') {
                // Post should be or should have been published
                return;
            }
            // make sure we have something to parse before we create a job
            let html = post.get('status') === 'published' ? post.get('html') : null;
            let previousHtml = post.previous('status') === 'published' ? post.previous('html') : null;
            if (html || previousHtml) {
                await this.#jobService.addJob('sendWebmentions', async () => {
                    await this.sendForHTMLResource({
                        url: new URL(this.#getPostUrl(post)),
                        html: html,
                        previousHtml: previousHtml
                    });
                });
            }
        } catch (e) {
            logging.error('Error in webmention sending service post update event handler:');
            logging.error(e);
        }
    }

    /**
     * @param {{source: URL, target: URL, endpoint: URL}} options
     * @returns
     */
    async send({source, target, endpoint}) {
        logging.info('[Webmention] Sending webmention from ' + source.href + ' to ' + target.href + ' via ' + endpoint.href);

        // default content type is application/x-www-form-encoded which is what we need for the webmentions spec
        const response = await this.#externalRequest.post(endpoint.href, {
            form: {
                source: source.href,
                target: target.href,
                source_is_ghost: true
            },
            throwHttpErrors: false,
            maxRedirects: 10,
            followRedirect: true,
            timeout: 15000,
            retry: {
                // Only retry on network issues, or specific HTTP status codes
                limit: 3
            }
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
            return;
        }

        throw new errors.BadRequestError({
            message: 'Webmention sending failed with status code ' + response.statusCode,
            statusCode: response.statusCode
        });
    }

    /**
     * Send a webmention call for the links in a resource.
     * @param {object} resource
     * @param {URL} resource.url
     * @param {string} resource.html
     * @param {string|null} [resource.previousHtml]
     */
    async sendForHTMLResource(resource) {
        let links = resource.html ? this.getLinks(resource.html) : [];
        if (resource.previousHtml) {
            // Only send for NEW or DELETED links (to avoid spamming when lots of small changes happen to a post)
            const existingLinks = links;
            links = [];
            const oldLinks = this.getLinks(resource.previousHtml);

            for (const link of oldLinks) {
                if (!existingLinks.find(l => l.href === link.href)) {
                    // Deleted link
                    links.push(link);
                }
            }

            for (const link of existingLinks) {
                if (!oldLinks.find(l => l.href === link.href)) {
                    // New link
                    links.push(link);
                }
            }
        }

        if (links.length) {
            logging.info('[Webmention] Sending all webmentions for ' + resource.url.href);
        }

        await this.sendAll({
            url: resource.url,
            links
        });
    }

    /**
     * Send a webmention call for the links in a resource.
     * @param {object} resource
     * @param {URL} resource.url
     * @param {URL[]} resource.links
     */
    async sendAll({url, links}) {
        for (const target of links) {
            const endpoint = await this.#discoveryService.getEndpoint(target);
            if (endpoint) {
                // Send webmention call
                try {
                    await this.send({source: url, target, endpoint});
                } catch (e) {
                    logging.error('[Webmention] Failed sending via ' + endpoint.href + ': ' + e.message);
                }
            }
        }
    }

    /**
     * @private
     * Get all external links in a HTML document.
     * Excludes the site's own domain.
     * @param {string} html
     * @returns {URL[]}
    */
    getLinks(html) {
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        const urls = [];
        const siteUrl = this.siteUrl;

        for (const el of $('a').toArray()) {
            const href = $(el).attr('href');
            if (href) {
                let url;
                try {
                    url = new URL(href);

                    if (siteUrl && url.hostname === siteUrl.hostname) {
                        // Ignore links to the site's own domain
                        continue;
                    }

                    if (['http:', 'https:'].includes(url.protocol) && !urls.find(u => u.href === url.href)) {
                        // Ignore duplicate URLs
                        urls.push(url);
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            }
        }
        return urls;
    }
};
