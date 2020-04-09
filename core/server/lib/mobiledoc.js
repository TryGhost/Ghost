const common = require('./common');
const config = require('../config');

let cardFactory, cards, mobiledocHtmlRenderer;

module.exports = {
    get blankDocument() {
        return {
            version: '0.3.1',
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
                siteUrl: config.get('url')
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
                    common.logging.error(new common.errors.InternalServerError({
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
