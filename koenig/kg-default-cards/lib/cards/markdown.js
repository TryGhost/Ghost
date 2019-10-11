const markdownCard = require('./_markdown');
const createCard = require('../create-card');

// uses the _markdown card definition function so that the card definition
// can be re-used in aliased cards
module.exports = createCard(markdownCard());
