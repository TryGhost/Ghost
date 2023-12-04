class LinkReplacer {
    /**
     * Replaces the links in the provided HTML
     * @param {string} html
     * @param {(url: URL, originalPath: string): Promise<URL|string|false>} replaceLink
     * @param {object} options
     * @param {string} [options.base] If you want to replace relative links, this will replace them to an absolute link and call the replaceLink method too
     * @returns {Promise<string>}
    */
    async replace(html, replaceLink, options = {}) {
        const cheerio = require('cheerio');
        const entities = require('entities');
        try {
            const $ = cheerio.load(html, {
                xml: {
                    // This makes sure we use the faster and less destructive htmlparser2 parser
                    xmlMode: false
                },
                // Do not replace &, ', " and others with HTML entities (is bugged because it replaces &map_ with something weird (&#x21A6;))
                decodeEntities: false
            }, false);

            for (const el of $('a').toArray()) {
                const href = $(el).attr('href');
                if (href) {
                    let url;
                    const path = entities.decode(href);
                    try {
                        url = new URL(path, options.base);
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                    if (url) {
                        url = await replaceLink(url, path);
                        const str = url.toString();
                        $(el).attr('href', str);
                    }
                }
            }

            return $.html();
        } catch (e) {
            // Catch errors from cheerio
            return html;
        }
    }
}

module.exports = new LinkReplacer();
