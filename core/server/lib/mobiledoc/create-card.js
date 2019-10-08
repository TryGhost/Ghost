let urlUtils;

module.exports = function createCard(card) {
    const defaultTransformer = function (payload) {
        return payload;
    };

    const {
        name,
        type,
        config = {},
        absoluteToRelative = defaultTransformer,
        relativeToAbsolute = defaultTransformer
    } = card;

    return {
        name,
        type,

        render({env, payload, options}) {
            const {dom} = env;
            const cleanName = name.replace(/^card-/, '');

            const cardOutput = card.render({env, payload, options});

            if (!cardOutput) {
                return cardOutput;
            }

            if (config.commentWrapper) {
                const beginComment = dom.createComment(`kg-card-begin: ${cleanName}`);
                const endComment = dom.createComment(`kg-card-end: ${cleanName}`);
                const fragment = dom.createDocumentFragment();

                fragment.appendChild(beginComment);
                fragment.appendChild(cardOutput);
                fragment.appendChild(endComment);

                return fragment;
            }

            return cardOutput;
        },

        absoluteToRelative() {
            // it's necessary to wait until the method is called to require
            // urlUtils to ensure the class has actually been instantiated
            // as cards are passed in as an arg to the class instantiation
            if (!urlUtils) {
                urlUtils = require('../url-utils');
            }
            return absoluteToRelative(urlUtils, ...arguments);
        },

        relativeToAbsolute() {
            // it's necessary to wait until the method is called to require
            // urlUtils to ensure the class has actually been instantiated
            // as cards are passed in as an arg to the class instantiation
            if (!urlUtils) {
                urlUtils = require('../url-utils');
            }
            return relativeToAbsolute(urlUtils, ...arguments);
        }
    };
};
