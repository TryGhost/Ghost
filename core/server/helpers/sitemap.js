var XML = require('xml'),
    fs = require('fs');

function Sitemap(options, items) {

    options = options || {};

    this.version = options.version || '1.0';
    this.encoding = options.encoding || 'UTF-8';
    this.attr = options.attr || {
        'xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi_schemaLocation': 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd'
    };

    this.items = items || [];

    this.item = function(options) {
        options = options || {};

        var item = [ { loc: options.loc || '' } ];

        if (options.lastmod) {
            var date = new Date(options.lastmod).toISOString();
            item.push({ lastmod: date });
        }

        if (options.changefreq) {
            item.push({ changefreq: options.changefreq });
        }

        if (options.priority) {
            item.push({ priority: options.priotiy });
        }

        this.items.push(item);

        return this;
    };

    this.xml = function(indent) {
        return '<?xml version="' + this.version + '" encoding="' + this.encoding + '"?>\n' + XML(generateXML(this), indent);
    }

}

function generateXML(data) {

    var urlset = [];

    if (data.attr) {
        urlset.push({ '_attr': data.attr });
    }

    if (data.items) {
        data.items.forEach(function (item) {
            urlset.push({ url: item });
        });
    }

    return { urlset: urlset };

}

module.exports = Sitemap;