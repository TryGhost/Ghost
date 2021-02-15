const path = require('path');
const errors = require('@tryghost/errors');
const logging = require('../../shared/logging');
const config = require('../../shared/config');
const storage = require('../adapters/storage');
const imageTransform = require('@tryghost/image-transform');

let cardFactory;
let cards;
let mobiledocHtmlRenderer;

module.exports = {
    get blankDocument() {
        return {
            version: '0.3.1',
            ghostVersion: '4.0',
            markups: [],
            atoms: [],
            cards: [],
            sections: [
                [1, 'p', [
                    [0, [], 0, '']
                ]]
            ]
        };
    },

    get cards() {
        if (!cards) {
            const CardFactory = require('@tryghost/kg-card-factory');
            const defaultCards = require('@tryghost/kg-default-cards');

            cardFactory = new CardFactory({
                siteUrl: config.get('url'),
                imageOptimization: config.get('imageOptimization'),
                canTransformImage(storagePath) {
                    const {ext} = path.parse(storagePath);

                    return imageTransform.canTransformFiles()
                        && imageTransform.canTransformFileExtension(ext)
                        && typeof storage.getStorage().saveRaw === 'function';
                }
            });

            cards = defaultCards.map((card) => {
                return cardFactory.createCard(card);
            });
        }

        return cards;
    },

    get atoms() {
        return require('@tryghost/kg-default-atoms');
    },

    get mobiledocHtmlRenderer() {
        if (!mobiledocHtmlRenderer) {
            const MobiledocHtmlRenderer = require('@tryghost/kg-mobiledoc-html-renderer');

            mobiledocHtmlRenderer = new MobiledocHtmlRenderer({
                cards: this.cards,
                atoms: this.atoms,
                unknownCardHandler(args) {
                    logging.error(new errors.InternalServerError({
                        message: 'Mobiledoc card \'' + args.env.name + '\' not found.'
                    }));
                }
            });
        }

        return mobiledocHtmlRenderer;
    },

    get htmlToMobiledocConverter() {
        try {
            return require('@tryghost/html-to-mobiledoc').toMobiledoc;
        } catch (err) {
            return () => {
                throw new errors.InternalServerError({
                    message: 'Unable to convert from source HTML to Mobiledoc',
                    context: 'The html-to-mobiledoc package was not installed',
                    help: 'Please review any errors from the install process by checking the Ghost logs',
                    code: 'HTML_TO_MOBILEDOC_INSTALLATION',
                    err: err
                });
            };
        }
    },

    // used when force-rerendering post content to ensure that old image card
    // payloads contain width/height values to be used when generating srcsets
    populateImageSizes: async function (mobiledocJson) {
        // do not require image-size until it's requested to avoid circular dependencies
        // shared/url-utils > server/lib/mobiledoc > server/lib/image/image-size > server/adapters/storage/utils
        const {imageSize} = require('./image');
        const urlUtils = require('../../shared/url-utils');
        const storageInstance = storage.getStorage();

        async function getUnsplashSize(url) {
            const parsedUrl = new URL(url);
            parsedUrl.searchParams.delete('w');
            parsedUrl.searchParams.delete('fit');
            parsedUrl.searchParams.delete('crop');
            parsedUrl.searchParams.delete('dpr');

            return await imageSize.getImageSizeFromUrl(parsedUrl.href);
        }

        async function getLocalSize(url) {
            // local storage adapter's .exists() expects image paths without any prefixes
            const subdirRegex = new RegExp(`^${urlUtils.getSubdir()}`);
            const contentRegex = new RegExp(`^/${urlUtils.STATIC_IMAGE_URL_PREFIX}`);
            const storagePath = url.replace(subdirRegex, '').replace(contentRegex, '');

            const {dir, name, ext} = path.parse(storagePath);
            const [imageNameMatched, imageName, imageNumber] = name.match(/^(.+?)(-\d+)?$/) || [null];

            if (!imageNameMatched || !(await storageInstance.exists(storagePath))) {
                return;
            }

            // get the original/unoptimized image if it exists as that will have
            // the maximum dimensions that srcset/handle-image-sizes can use
            const originalImagePath = path.join(dir, `${imageName}_o${imageNumber || ''}${ext}`);
            const imagePath = await storageInstance.exists(originalImagePath) ? originalImagePath : storagePath;

            return await imageSize.getImageSizeFromStoragePath(imagePath);
        }

        const mobiledoc = JSON.parse(mobiledocJson);

        const sizePromises = mobiledoc.cards.map(async (card) => {
            const [cardName, payload] = card;

            const needsFilling = cardName === 'image' && payload && payload.src && (!payload.width || !payload.height);
            if (!needsFilling) {
                return;
            }

            const isUnsplash = payload.src.match(/images\.unsplash\.com/);
            try {
                const size = isUnsplash ? await getUnsplashSize(payload.src) : await getLocalSize(payload.src);

                if (size && size.width && size.height) {
                    payload.width = size.width;
                    payload.height = size.height;
                }
            } catch (e) {
                // TODO: use debug instead?
                logging.error(e);
            }
        });

        await Promise.all(sizePromises);

        return JSON.stringify(mobiledoc);
    },

    // allow config changes to be picked up - useful in tests
    reload() {
        cardFactory = null;
        cards = null;
        mobiledocHtmlRenderer = null;
    }
};
