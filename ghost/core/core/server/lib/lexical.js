const path = require('path');
const errors = require('@tryghost/errors');
const urlUtils = require('../../shared/url-utils');
const config = require('../../shared/config');
const labs = require('../../shared/labs');
const settingsCache = require('../../shared/settings-cache');
const adapterManager = require('../services/adapter-manager').default;

let nodes;
let lexicalHtmlRenderer;
let urlTransformMap;
let postsService;
let serializePosts;

function populateNodes() {
    const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
    nodes = DEFAULT_NODES;
}

function createLexicalHtmlRenderer(onError) {
    if (!nodes) {
        populateNodes();
    }

    const {LexicalHTMLRenderer} = require('@tryghost/kg-lexical-html-renderer');
    return new LexicalHTMLRenderer({
        nodes,
        onError
    });
}

function buildRenderOptions(userOptions) {
    if (!postsService) {
        const getPostServiceInstance = require('../services/posts/posts-service-instance');
        postsService = getPostServiceInstance();
    }
    if (!serializePosts) {
        serializePosts = require('../api/endpoints/utils/serializers/output/posts').all;
    }

    return Object.assign({
        siteUuid: settingsCache.get('site_uuid'),
        siteUrl: config.get('url'),
        imageBaseUrl: config.get('urls:image') || '',
        imageOptimization: config.get('imageOptimization'),
        canTransformImage(storagePath) {
            const imageTransform = require('@tryghost/image-transform');
            const {ext} = path.parse(storagePath);

            // NOTE: the "saveRaw" check is smelly
            return imageTransform.canTransformFiles()
                && imageTransform.shouldResizeFileExtension(ext)
                && typeof adapterManager.getAdapter('storage:images').saveRaw === 'function';
        },
        canTransformImageToFormat(format) {
            const imageTransform = require('@tryghost/image-transform');

            return imageTransform.canTransformFiles()
                && imageTransform.canTransformToFormat(format);
        },
        feature: {
            emailUniqueid: labs.isSet('emailUniqueid'),
            pictureImageFormats: labs.isSet('pictureImageFormats')
        }
    }, userOptions);
}

module.exports = {
    get blankDocument() {
        return {
            root: {
                children: [
                    {
                        children: [],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };
    },

    get lexicalHtmlRenderer() {
        if (!lexicalHtmlRenderer) {
            lexicalHtmlRenderer = createLexicalHtmlRenderer();
        }

        return lexicalHtmlRenderer;
    },

    async render(lexical, userOptions = {}) {
        const options = buildRenderOptions(userOptions);
        return await this.lexicalHtmlRenderer.render(lexical, options);
    },

    async validate(lexical, userOptions = {}) {
        try {
            const lexicalValidationRenderer = createLexicalHtmlRenderer((error) => {
                throw error;
            });

            // The validation renderer rethrows parser errors so this method can
            // convert every malformed document into a boolean result.
            const options = buildRenderOptions(userOptions);
            await lexicalValidationRenderer.render(lexical, options);
            return true;
        } catch {
            return false;
        }
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
    },

    get htmlToLexicalConverter() {
        try {
            if (process.env.CI) {
                console.time('require @tryghost/kg-html-to-lexical'); // eslint-disable-line no-console
            }

            const htmlToLexical = require('@tryghost/kg-html-to-lexical').htmlToLexical;

            if (process.env.CI) {
                console.timeEnd('require @tryghost/kg-html-to-lexical'); // eslint-disable-line no-console
            }

            return htmlToLexical;
        } catch (err) {
            throw new errors.InternalServerError({
                message: 'Unable to convert from source HTML to Lexical',
                context: 'The html-to-lexical package was not installed',
                help: 'Please review any errors from the install process by checking the Ghost logs',
                code: 'HTML_TO_LEXICAL_INSTALLATION',
                err: err
            });
        }
    }
};
