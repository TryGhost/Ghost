class LinkReplacer {
    /**
     * Replaces the links in the provided HTML
     * @param {string} html
     * @param {(url: URL): Promise<URL|string>} replaceLink
     * @returns {Promise<string>}
    */
    async replace(html, replaceLink) {
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        for (const el of $('a').toArray()) {
            const href = $(el).attr('href');
            if (href) {
                let url;
                try {
                    url = new URL(href);
                } catch (e) {
                    // Ignore invalid URLs
                }
                if (url) {
                    url = await replaceLink(url);
                    const str = url.toString();
                    $(el).attr('href', str);
                }
            }
        }

        return $.html();
    }
}

module.exports = new LinkReplacer();
