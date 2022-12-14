const urlUtils = require('../../shared/url-utils');

let nodes;
let lexicalHtmlRenderer;
let urlTransformMap;

module.exports = {
    get lexicalHtmlRenderer() {
        if (!lexicalHtmlRenderer) {
            const LexicalHtmlRenderer = require('@tryghost/kg-lexical-html-renderer');
            lexicalHtmlRenderer = new LexicalHtmlRenderer();
        }

        return lexicalHtmlRenderer;
    },

    get nodes() {
        if (!nodes) {
            const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
            nodes = DEFAULT_NODES;
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
