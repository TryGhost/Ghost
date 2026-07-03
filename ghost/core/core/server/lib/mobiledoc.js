const path = require('path');
const config = require('../../shared/config');
const storage = require('../adapters/storage');

let cardFactory;
let cards;

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
            const {CardFactory} = require('@tryghost/kg-card-factory');
            const {cards: defaultCards} = require('@tryghost/kg-default-cards');

            cardFactory = new CardFactory({
                siteUrl: config.get('url'),
                imageBaseUrl: config.get('urls:image') || '',
                imageOptimization: config.get('imageOptimization'),
                canTransformImage(storagePath) {
                    const imageTransform = require('@tryghost/image-transform');
                    const {ext} = path.parse(storagePath);

                    // NOTE: the "saveRaw" check is smelly
                    return imageTransform.canTransformFiles()
                        && imageTransform.shouldResizeFileExtension(ext)
                        && typeof storage.getStorage('images').saveRaw === 'function';
                }
            });

            cards = defaultCards.map((card) => {
                return cardFactory.createCard(card);
            });
        }

        return cards;
    },

    // allow config changes to be picked up - useful in tests
    reload() {
        cardFactory = null;
        cards = null;
    }
};
