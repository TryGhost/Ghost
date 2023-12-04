const _ = require('lodash');
const xml = require('xml');
const moment = require('moment');
const path = require('path');
const urlUtils = require('../../../shared/url-utils');
const localUtils = require('./utils');

// Sitemap specific xml namespace declarations that should not change
const XMLNS_DECLS = {
    _attr: {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
    }
};

class BaseSiteMapGenerator {
    constructor() {
        this.nodeLookup = {};
        this.nodeTimeLookup = {};
        this.siteMapContent = new Map();
        this.lastModified = 0;
        this.maxPerPage = 50000;
    }

    hasCanonicalUrl(datum) {
        return Boolean(datum?.canonical_url);
    }

    generateXmlFromNodes(page) {
        // Get a mapping of node to timestamp
        let nodesToProcess = _.map(this.nodeLookup, (node, id) => {
            return {
                id: id,
                // Using negative here to sort newest to oldest
                ts: -(this.nodeTimeLookup[id] || 0),
                node: node
            };
        });

        // Sort nodes by timestamp
        nodesToProcess = _.sortBy(nodesToProcess, 'ts');

        // Get the page of nodes that was requested
        nodesToProcess = nodesToProcess.slice((page - 1) * this.maxPerPage, page * this.maxPerPage);

        // Do not generate empty sitemaps
        if (nodesToProcess.length === 0) {
            return null;
        }

        // Grab just the nodes
        const nodes = _.map(nodesToProcess, 'node');

        const data = {
            // Concat the elements to the _attr declaration
            urlset: [XMLNS_DECLS].concat(nodes)
        };

        // Generate full xml
        let sitemapXml = localUtils.getDeclarations() + xml(data);

        // Perform url transformations
        // - Necessary because sitemap data is supplied by the router which
        //   uses knex directly bypassing model-layer attribute transforms
        sitemapXml = urlUtils.transformReadyToAbsolute(sitemapXml);

        return sitemapXml;
    }

    updateURL(datum) {
        const url = this.nodeLookup[datum.id]?.url[0].loc;

        if (url) {
            this.removeUrl(url, datum);
            this.addUrl(url, datum);
        }
    }

    addUrl(url, datum) {
        const node = this.createUrlNodeFromDatum(url, datum);

        if (node && !this.hasCanonicalUrl(datum)) {
            this.updateLastModified(datum);
            this.updateLookups(datum, node);
            // force regeneration of xml
            this.siteMapContent.clear();
        }
    }

    removeUrl(url, datum) {
        this.removeFromLookups(datum);

        // force regeneration of xml
        this.siteMapContent.clear();
        this.lastModified = Date.now();
    }

    getLastModifiedForDatum(datum) {
        if (datum.updated_at || datum.published_at || datum.created_at) {
            const modifiedDate = datum.updated_at || datum.published_at || datum.created_at;

            return moment(modifiedDate);
        } else {
            return moment();
        }
    }

    updateLastModified(datum) {
        const lastModified = this.getLastModifiedForDatum(datum);

        if (lastModified > this.lastModified) {
            this.lastModified = lastModified;
        }
    }

    /**
     *
     * @param {String} url
     * @param {Object} datum
     * @returns
     */
    createUrlNodeFromDatum(url, datum) {
        let node;
        let imgNode;

        node = {
            url: [
                {loc: url},
                {lastmod: moment(this.getLastModifiedForDatum(datum)).toISOString()}
            ]
        };

        imgNode = this.createImageNodeFromDatum(datum);

        if (imgNode) {
            node.url.push(imgNode);
        }

        return node;
    }

    createImageNodeFromDatum(datum) {
        // Check for cover first because user has cover but the rest only have image
        const image = datum.cover_image || datum.profile_image || datum.feature_image;

        let imageUrl;
        let imageEl;

        if (!image) {
            return;
        }

        // Grab the image url
        imageUrl = urlUtils.urlFor('image', {image: image}, true);

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
    }

    validateImageUrl(imageUrl) {
        return !!imageUrl;
    }

    getXml(page = 1) {
        if (this.siteMapContent.has(page)) {
            return this.siteMapContent.get(page);
        }

        const content = this.generateXmlFromNodes(page);
        this.siteMapContent.set(page, content);
        return content;
    }

    /**
     * @NOTE
     * The url service currently has no url update event.
     * It removes and adds the url. If the url service extends it's
     * feature set, we can detect if a node has changed.
     */
    updateLookups(datum, node) {
        this.nodeLookup[datum.id] = node;
        this.nodeTimeLookup[datum.id] = this.getLastModifiedForDatum(datum);
    }

    removeFromLookups(datum) {
        delete this.nodeLookup[datum.id];
        delete this.nodeTimeLookup[datum.id];
    }

    reset() {
        this.nodeLookup = {};
        this.nodeTimeLookup = {};
        this.siteMapContent.clear();
    }
}

module.exports = BaseSiteMapGenerator;
