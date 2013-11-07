var XML = require('xml'),
    fs = require('fs');

function Sitemap(options, items) {

    options = options || {};

    this.version = options.version || '1.0';
    this.encoding = options.encoding || 'UTF-8';
    this.attr = options.attr || {
        'xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd'
    };

    this.items = items || [];

    this.item = function (options) {
        options = options || {};

        var item = [ { loc: options.loc || '' }],
            date;

        if (options.lastmod) {
            date = new Date(options.lastmod).toISOString();
            item.push({ lastmod: date });
        }

        if (options.changefreq) {
            item.push({ changefreq: options.changefreq });
        }

        if (options.priority) {
            item.push({ priority: options.priority });
        }

        this.items.push(item);

        return this;
    };

    this.xml = function (indent) {
        var urlset = [];

        if (this.attr) {
            urlset.push({ '_attr': this.attr });
        }

        if (this.items) {
            this.items.forEach(function (item) {
                urlset.push({ url: item });
            });
        }

        return '<?xml version="' + this.version + '" encoding="' + this.encoding + '"?>\n' + XML({ urlset: urlset }, indent);
    };

}

module.exports = Sitemap;