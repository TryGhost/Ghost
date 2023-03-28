class LinkReplacer {
    /**
     * Replaces the links in the provided HTML
     * @param {string} html
     * @param {(url: URL): Promise<URL|string>} replaceLink
     * @returns {Promise<string>}
    */
    async replace(html, replaceLink) {
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
                    try {
                        url = new URL(entities.decode(href));
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
        } catch (e) {
            // Catch errors from cheerio
            return html;
        }
    }
}

module.exports = new LinkReplacer();
