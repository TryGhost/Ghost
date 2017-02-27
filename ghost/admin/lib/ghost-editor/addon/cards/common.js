/* jshint ignore:start */
// Provides a common.js list of all the cards for front end import - this is quite yuck so a new sollution should be found

var fs      = require('fs'),
    path    = require('path');

var htmlCards = [],
    editorCards = [],
    ampCards = [],
    textCards = [],
    cards = [];

fs.readdirSync(__dirname).forEach(function(card) {

    if(card !== 'index.js' && card!== 'common.js' && card.substr(card.length-7) !== '_dom.js' ) {
        var _card = require(path.resolve(__dirname, card));

        // todo check last 7 characters of filename to see if it's html, amp, text

        _card.type = 'html';


        htmlCards.push(_card);


        cards.push(_card);
    }
 });


module.exports = {
    editor: editorCards,
    html: htmlCards,
    amp: ampCards,
    text: textCards,
    all: cards
};
/* jshint ignore:end */
