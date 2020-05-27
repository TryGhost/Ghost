// this card is just an alias of the `markdown` card which is necessary because
// our markdown-only editor was using the `card-markdown` card name
const markdownCard = require('./_markdown');

const v1CompatMarkdownCard = markdownCard();
v1CompatMarkdownCard.name = 'card-markdown';

module.exports = v1CompatMarkdownCard;
