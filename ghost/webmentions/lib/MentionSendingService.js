const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

module.exports = class MentionSendingService {
    #discoveryService;
    #externalRequest;
    #getSiteUrl;
    #getPostUrl;
    #isEnabled;

    constructor({discoveryService, externalRequest, getSiteUrl, getPostUrl, isEnabled}) {
        this.#discoveryService = discoveryService;
        this.#externalRequest = externalRequest;
        this.#getSiteUrl = getSiteUrl;
        this.#getPostUrl = getPostUrl;
        this.#isEnabled = isEnabled;
    }

    get siteUrl() {
        try {
            return new URL(this.#getSiteUrl());
        } catch (e) {
            return null;
        }
    }

    /**
     * Listen for changes in posts and automatically send webmentions.
     * @param {*} events
     */
    listen(events) {
        // Note: we don't need to listen for post.published (post.edited is also called at that time)
        events.on('post.edited', this.sendForEditedPost.bind(this));
    }

    async sendForEditedPost(post) {
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
            await this.sendAll({
                url: new URL(this.#getPostUrl(post)),
                html: post.get('html'),
                previousHtml: post.previous('status') === 'published' ? post.previous('html') : null
            });
        } catch (e) {
            logging.error('Error in webmention sending service post.added event handler:');
            logging.error(e);
        }
    }

    async send({source, target, endpoint}) {
        logging.info('[Webmention] Sending webmention from ' + source.href + ' to ' + target.href + ' via ' + endpoint.href);
        const response = await this.#externalRequest.post(endpoint.href, {
            body: {
                source: source.href,
                target: target.href
            },
            form: true,
            throwHttpErrors: false,
            maxRedirects: 10,
            followRedirect: true,
            methodRewriting: false, // WARNING! this setting has a different meaning in got v12!
            timeout: 10000
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
    async sendAll(resource) {
        const links = this.getLinks(resource.html);
        if (resource.previousHtml) {
            // We also need to send webmentions for removed links
            const oldLinks = this.getLinks(resource.previousHtml);
            for (const link of oldLinks) {
                if (!links.find(l => l.href === link.href)) {
                    links.push(link);
                }
            }
        }

        if (links.length) {
            logging.info('[Webmention] Sending all webmentions for ' + resource.url.href);
        }

        for (const target of links) {
            const endpoint = await this.#discoveryService.getEndpoint(target);
            if (endpoint) {
                // Send webmention call
                try {
                    await this.send({source: resource.url, target, endpoint});
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
