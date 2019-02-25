module.exports = function createCard(card) {
    const {name, type} = card;

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

            const beginComment = dom.createComment(`kg-card-begin: ${cleanName}`);
            const endComment = dom.createComment(`kg-card-end: ${cleanName}`);
            const fragment = dom.createDocumentFragment();

            fragment.appendChild(beginComment);
            fragment.appendChild(cardOutput);
            fragment.appendChild(endComment);

            return fragment;
        }
    };
};
