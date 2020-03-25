const common = require('../common');
const config = require('../../config');

let cardFactory, cards;

module.exports = {
    get cards() {
        if (cards) {
            return cards;
        }

        const CardFactory = require('@tryghost/kg-card-factory');
        const defaultCards = require('@tryghost/kg-default-cards');

        cardFactory = new CardFactory({
            siteUrl: config.get('url')
        });

        cards = defaultCards.map((card) => {
            return cardFactory.createCard(card);
        });

        return cards;
    },

    get atoms() {
        return require('./atoms');
    },

    get renderers() {
        return require('./renderers');
    },

    get htmlToMobiledocConverter() {
        try {
            return require('@tryghost/html-to-mobiledoc').toMobiledoc;
        } catch (err) {
            return () => {
                throw new common.errors.InternalServerError({
                    message: 'Unable to convert from source HTML to Mobiledoc',
                    context: 'The html-to-mobiledoc package was not installed',
                    help: 'Please review any errors from the install process by checking the Ghost logs',
                    code: 'HTML_TO_MOBILEDOC_INSTALLATION',
                    err: err
                });
            };
        }
    }
};
