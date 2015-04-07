var _       = require('lodash'),
    xml     = require('xml'),
    moment  = require('moment'),
    api     = require('../../../api'),
    config  = require('../../../config'),
    events  = require('../../../events'),
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
    this.nodeTimeLookup = {};
    this.siteMapContent = '';
    this.dataEvents = events;
}

_.extend(BaseSiteMapGenerator.prototype, {
    init: function () {
        var self = this;
        return this.refreshAll().then(function () {
            return self.bindEvents();
        });
    },

    bindEvents: _.noop,

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
                self.updateLookups(datum, node);

                return node;
            });
        }).then(this.generateXmlFromNodes.bind(this));
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
        this.updateXmlFromNodes();
    },

    generateXmlFromNodes: function () {
        var self = this,
            // Get a mapping of node to timestamp
            timedNodes = _.map(this.nodeLookup, function (node, id) {
                return {
                    id: id,
                    // Using negative here to sort newest to oldest
                    ts: -(self.nodeTimeLookup[id] || 0),
                    node: node
                };
            }, []),
            // Sort nodes by timestamp
            sortedNodes = _.sortBy(timedNodes, 'ts'),
            // Grab just the nodes
            urlElements = _.pluck(sortedNodes, 'node'),
            data = {
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

    addOrUpdateUrl: function (model) {
        var self = this,
            datum = model.toJSON();

        return this.getPermalinksValue().then(function (permalinks) {
            var node = self.createUrlNodeFromDatum(datum, permalinks);
            self.updateLastModified(datum);
            // TODO: Check if the node values changed, and if not don't regenerate
            self.updateLookups(datum, node);

            return self.updateXmlFromNodes();
        });
    },

    removeUrl: function (model) {
        var datum = model.toJSON();
        this.removeFromLookups(datum);

        this.lastModified = Date.now();

        return this.updateXmlFromNodes();
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

    getLastModifiedForDatum: function (datum) {
        return datum.updated_at || datum.published_at || datum.created_at;
    },

    createUrlNodeFromDatum: function (datum, permalinks) {
        var url = this.getUrlForDatum(datum, permalinks),
            priority = this.getPriorityForDatum(datum);

        return {
            url: [
                {loc: url},
                {lastmod: moment(this.getLastModifiedForDatum(datum)).toISOString()},
                {changefreq: CHANGE_FREQ},
                {priority: priority}
            ]
        };
    },

    setSiteMapContent: function (content) {
        this.siteMapContent = content;
    },

    updateLastModified: function (datum) {
        var lastModified = this.getLastModifiedForDatum(datum);

        if (lastModified > this.lastModified) {
            this.lastModified = lastModified;
        }
    },

    updateLookups: function (datum, node) {
        this.nodeLookup[datum.id] = node;
        this.nodeTimeLookup[datum.id] = this.getLastModifiedForDatum(datum);
    },

    removeFromLookups: function (datum) {
        var lookup = this.nodeLookup;
        delete lookup[datum.id];

        lookup = this.nodeTimeLookup;
        delete lookup[datum.id];
    }
});

module.exports = BaseSiteMapGenerator;
