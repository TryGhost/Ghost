var _         = require('lodash'),
    xml       = require('xml'),
    moment    = require('moment'),
    config    = require('../../../config'),
    events    = require('../../../events'),
    utils     = require('./utils'),
    Promise   = require('bluebird'),
    path      = require('path'),
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
        // Create all the url elements in JSON
        var self = this,
            nodes;

        nodes = _.reduce(data, function (nodeArr, datum) {
            var node = self.createUrlNodeFromDatum(datum);

            if (node) {
                self.updateLastModified(datum);
                self.updateLookups(datum, node);
                nodeArr.push(node);
            }

            return nodeArr;
        }, []);

        return this.generateXmlFromNodes(nodes);
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
            urlElements = _.map(sortedNodes, 'node'),
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
        var datum = model.toJSON(),
            node = this.createUrlNodeFromDatum(datum);

        if (node) {
            this.updateLastModified(datum);
            // TODO: Check if the node values changed, and if not don't regenerate
            this.updateLookups(datum, node);
            this.updateXmlFromNodes();
        }
    },

    removeUrl: function (model) {
        var datum = model.toJSON();
        // When the model is destroyed we need to fetch previousAttributes
        if (!datum.id) {
            datum = model.previousAttributes();
        }
        this.removeFromLookups(datum);

        this.lastModified = Date.now();

        this.updateXmlFromNodes();
    },

    validateDatum: function () {
        return true;
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

    createUrlNodeFromDatum: function (datum) {
        if (!this.validateDatum(datum)) {
            return false;
        }

        var url = this.getUrlForDatum(datum),
            priority = this.getPriorityForDatum(datum),
            node,
            imgNode;

        node = {
            url: [
                {loc: url},
                {lastmod: moment(this.getLastModifiedForDatum(datum)).toISOString()},
                {changefreq: CHANGE_FREQ},
                {priority: priority}
            ]
        };

        imgNode = this.createImageNodeFromDatum(datum);

        if (imgNode) {
            node.url.push(imgNode);
        }

        return node;
    },

    createImageNodeFromDatum: function (datum) {
        // Check for cover first because user has cover but the rest only have image
        var image = datum.cover || datum.image,
            imageUrl,
            imageEl;

        if (!image) {
            return;
        }

        // Grab the image url
        imageUrl = this.getUrlForImage(image);

        // Verify the url structure
        if (!this.validateImageUrl(imageUrl)) {
            return;
        }

        // Create the weird xml node syntax structure that is expected
        imageEl = [
            {'image:loc': imageUrl},
            {'image:caption': path.basename(imageUrl)}
        ];

        // Return the node to be added to the url xml node
        return {
            'image:image': imageEl
        };
    },

    validateImageUrl: function (imageUrl) {
        return !!imageUrl;
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
