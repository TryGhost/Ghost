class LinkReplacementService {
    /// Placeholder method
    async createRedirect(url) {
        return Promise.resolve({
            from: 'https://example.com/r/' + Math.random().toString(36).substring(2, 15),
            to: url
        });
    }

    // Todo: move to different service
    addTrackingToRedirect(redirect, memberUuid) {
        const newUrl = new URL(redirect.from);
        newUrl.searchParams.append('m', memberUuid);
        return newUrl;
    }

    async replaceLink(url, newsletter, post) {
        // Can probably happen in one call to the MemberAttributionService (but just to make clear what happens here)
        
        // 1. Add attribution
        // TODO: this should move the the attribution service in the future
        url.searchParams.append('rel', newsletter.get('slug') + '-newsletter');
        url.searchParams.append('attribution_id', post.id);
        url.searchParams.append('attribution_type', 'post');

        // 2. Add redirect for link click tracking
        const redirect = await this.createRedirect(url.toString());

        // 3. Add member tracking
        return this.addTrackingToRedirect(redirect, '--uuid--');
    }

    /**
        Replaces the links in the provided HTML
        @param {string} html
        @param {Object} newsletter
        @param {Object} post
        @returns {Promise<string>}
    */
    async replaceLinks(html, newsletter, post) {
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        for (const el of $('a').toArray()) {
            const href = $(el).attr('href');
            try {
                if (href) {
                    let url = new URL(href);
                    url = await this.replaceLink(url, newsletter, post);

                    // Replace the replacement placeholder with a string that is not a valid URL but that will get replaced later on
                    const str = url.toString().replace(/--uuid--/g, '%%{uuid}%%');
                    $(el).attr('href', str);
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }

        return Promise.resolve($.html());
    }   
}
module.exports = LinkReplacementService;

