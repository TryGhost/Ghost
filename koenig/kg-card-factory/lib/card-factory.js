module.exports = class CardFactory {
    constructor(options) {
        this.factoryOptions = options;
    }

    createCard(card) {
        const {factoryOptions} = this;

        const {
            name,
            type,
            config = {}
        } = card;

        return {
            name,
            type,
            factoryOptions,

            render({env, payload, options}) {
                const {dom} = env;
                const cardOptions = Object.assign({}, factoryOptions, options);

                const cardOutput = card.render({env, payload, options: cardOptions});

                if (cardOutput.nodeType === 3 && cardOutput.nodeValue === '') {
                    return cardOutput;
                }

                if (config.commentWrapper) {
                    const cleanName = name.replace(/^card-/, '');
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

            absoluteToRelative(payload, _options) {
                if (card.absoluteToRelative) {
                    const defaultOptions = {
                        assetsOnly: false,
                        siteUrl: factoryOptions.siteUrl
                    };
                    const options = Object.assign({}, defaultOptions, _options);
                    return card.absoluteToRelative(payload, options);
                }

                return payload;
            },

            relativeToAbsolute(payload, _options) {
                if (card.relativeToAbsolute) {
                    const defaultOptions = {
                        assetsOnly: false,
                        siteUrl: factoryOptions.siteUrl
                    };
                    const options = Object.assign({}, defaultOptions, _options);
                    return card.relativeToAbsolute(payload, options);
                }

                return payload;
            }
        };
    }
};
