var _       = require('lodash'),
    xml     = require('xml'),
    moment  = require('moment'),
    api     = require('../../api'),
    config  = require('../../config'),
    utils   = require('./utils'),
    Promise = require('bluebird'),
    CHANGE_FREQ = 'weekly',
    XMLNS_DECLS;

// Sitemap specific xml namespace declarations that should not change
XMLNS_DECLS = {
    _attr: {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
    }
};

function BaseSiteMapGenerator() {
    this.lastModified = 0;
    this.nodeLookup = {};
    this.siteMapContent = '';
}

_.extend(BaseSiteMapGenerator.prototype, {
    init: function () {
        return this.refreshAll();
    },

    getData: function () {
        return Promise.resolve([]);
    },

    refreshAll: function () {
        var self = this;

        // Load all data
        return this.getData().then(function (data) {
            // Generate SiteMap from data
            return self.generateXmlFromData(data);
        }).then(function (generatedXml) {
            self.siteMapContent = generatedXml;
        });
    },

    generateXmlFromData: function (data) {
        // This has to be async because of the permalinks retrieval
        var self = this;

        // Fetch the permalinks value only once for all the urlFor calls
        return this.getPermalinksValue().then(function (permalinks) {
            // Create all the url elements in JSON
            return _.map(data, function (datum) {
                var node = self.createUrlNodeFromDatum(datum, permalinks);
                self.updateLastModified(datum);
                self.nodeLookup[datum.id] = node;

                return node;
            });
        }).then(self.generateXmlFromNodes);
    },

    getPermalinksValue: function () {
        var self = this;

        if (this.permalinks) {
            return Promise.resolve(this.permalinks);
        }

        return api.settings.read('permalinks').then(function (response) {
            self.permalinks = response.settings[0];
            return self.permalinks;
        });
    },

    updatePermalinksValue: function (permalinks) {
        this.permalinks = permalinks;

        // Re-generate xml with new permalinks values
        this.updateXmlFromNodes(_.values(this.nodeLookup));
    },

    generateXmlFromNodes: function (urlElements) {
        var data = {
            // Concat the elements to the _attr declaration
            urlset: [XMLNS_DECLS].concat(urlElements)
        };

        // Return the xml
        return utils.getDeclarations() + xml(data);
    },

    updateXmlFromNodes: function (urlElements) {
        var content = this.generateXmlFromNodes(urlElements);

        this.setSiteMapContent(content);

        return content;
    },

    addUrl: function (datum) {
        var self = this;
        return this.getPermalinksValue().then(function (permalinks) {
            var node = self.createUrlNodeFromDatum(datum, permalinks);
            self.updateLastModified(datum);
            self.nodeLookup[datum.id] = node;

            return self.updateXmlFromNodes(_.values(self.nodeLookup));
        });
    },

    removeUrl: function (datum) {
        var lookup = this.nodeLookup;
        delete lookup[datum.id];

        this.lastModified = Date.now();

        return this.updateXmlFromNodes(_.values(lookup));
    },

    updateUrl: function (datum) {
        var self = this;
        return this.getPermalinksValue().then(function (permalinks) {
            var node = self.createUrlNodeFromDatum(datum, permalinks);
            self.updateLastModified(datum);
            // TODO: Check if the node values changed, and if not don't regenerate
            self.nodeLookup[datum.id] = node;

            return self.updateXmlFromNodes(_.values(self.nodeLookup));
        });
    },

    getUrlForDatum: function () {
        return config.urlFor('home', true);
    },

    getUrlForImage: function (image) {
        return config.urlFor('image', {image: image}, true);
    },

    getPriorityForDatum: function () {
        return 1.0;
    },

    createUrlNodeFromDatum: function (datum, permalinks) {
        var url = this.getUrlForDatum(datum, permalinks),
            priority = this.getPriorityForDatum(datum);

        return {
            url: [
                {loc: url},
                {lastmod: moment(datum.updated_at || datum.published_at || datum.created_at).toISOString()},
                {changefreq: CHANGE_FREQ},
                {priority: priority}
            ]
        };
    },

    setSiteMapContent: function (content) {
        this.siteMapContent = content;
    },

    updateLastModified: function (datum) {
        var lastModified = datum.updated_at || datum.published_at || datum.created_at;

        if (lastModified > this.lastModified) {
            this.lastModified = lastModified;
        }
    }
});

module.exports = BaseSiteMapGenerator;
