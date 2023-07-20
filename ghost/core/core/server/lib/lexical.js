const path = require('path');
const urlUtils = require('../../shared/url-utils');
const config = require('../../shared/config');
const storage = require('../adapters/storage');

let nodes;
let lexicalHtmlRenderer;
let urlTransformMap;

function populateNodes() {
    const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
    nodes = DEFAULT_NODES;
}

module.exports = {
    get lexicalHtmlRenderer() {
        if (!lexicalHtmlRenderer) {
            if (!nodes) {
                populateNodes();
            }

            const LexicalHtmlRenderer = require('@tryghost/kg-lexical-html-renderer');
            lexicalHtmlRenderer = new LexicalHtmlRenderer({nodes});
        }

        return lexicalHtmlRenderer;
    },

    async render(lexical, userOptions = {}) {
        const options = Object.assign({
            siteUrl: config.get('url'),
            imageOptimization: config.get('imageOptimization'),
            canTransformImage(storagePath) {
                const imageTransform = require('@tryghost/image-transform');
                const {ext} = path.parse(storagePath);

                // NOTE: the "saveRaw" check is smelly
                return imageTransform.canTransformFiles()
                    && imageTransform.shouldResizeFileExtension(ext)
                    && typeof storage.getStorage('images').saveRaw === 'function';
            },
            createDocument() {
                const {JSDOM} = require('jsdom');
                return (new JSDOM()).window.document;
            }
        }, userOptions);

        return await this.lexicalHtmlRenderer.render(lexical, options);
    },

    get nodes() {
        if (!nodes) {
            populateNodes();
        }

        return nodes;
    },

    get urlTransformMap() {
        if (!urlTransformMap) {
            urlTransformMap = {
                absoluteToRelative: {
                    url: urlUtils.absoluteToRelative.bind(urlUtils),
                    html: urlUtils.htmlAbsoluteToRelative.bind(urlUtils),
                    markdown: urlUtils.markdownAbsoluteToRelative.bind(urlUtils)
                },
                relativeToAbsolute: {
                    url: urlUtils.relativeToAbsolute.bind(urlUtils),
                    html: urlUtils.htmlRelativeToAbsolute.bind(urlUtils),
                    markdown: urlUtils.markdownRelativeToAbsolute.bind(urlUtils)
                },
                toTransformReady: {
                    url: urlUtils.toTransformReady.bind(urlUtils),
                    html: urlUtils.htmlToTransformReady.bind(urlUtils),
                    markdown: urlUtils.markdownToTransformReady.bind(urlUtils)
                }
            };
        }

        return urlTransformMap;
    }
};
