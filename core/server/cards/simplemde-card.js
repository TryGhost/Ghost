var md = require('markdown-it')(),
    card;

card = {
    name: 'simplemde-card',
    type: 'html',
    render: function (card) {
        if (card.payload.markdown) {
            return md.render(card.payload.markdown);
        } else {
            return '';
        }
    }
};

module.exports = card;
