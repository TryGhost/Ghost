const path = require('path');
const errors = require('@tryghost/errors');
const urlUtils = require('../../shared/url-utils');
const config = require('../../shared/config');
const storage = require('../adapters/storage');

let nodes;
let lexicalHtmlRenderer;
let urlTransformMap;
let postsService;
let serializePosts;

function populateNodes() {
    const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
    nodes = DEFAULT_NODES;
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
            if (!nodes) {
                populateNodes();
            }

            const LexicalHtmlRenderer = require('@tryghost/kg-lexical-html-renderer');
            lexicalHtmlRenderer = new LexicalHtmlRenderer({nodes});
        }

        return lexicalHtmlRenderer;
    },

    async render(lexical, userOptions = {}) {
        if (!postsService) {
            const getPostServiceInstance = require('../services/posts/posts-service');
            postsService = getPostServiceInstance();
        }
        if (!serializePosts) {
            serializePosts = require('../api/endpoints/utils/serializers/output/posts').all;
        }

        const getCollectionPosts = async (collectionSlug, postCount) => {
            const frame = {
                options: {
                    columns: ['url','excerpt','reading_time']
                },
                original: {
                    context: {
                        member: {
                            status: 'paid'
                        }
                    }
                },
                apiType: 'content',
                response: {}
            };

            const transacting = userOptions.transacting;
            const response = await postsService.browsePosts({
                context: {public: true}, // mimic Content API request
                collection: collectionSlug,
                limit: postCount,
                transacting
            });
            await serializePosts(response, null, frame);
            return frame.response.posts;
        };

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
            getCollectionPosts
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
