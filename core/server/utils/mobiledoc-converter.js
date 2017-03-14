var SimpleDom   = require('simple-dom'),
    Renderer    = require('mobiledoc-dom-renderer').default,
    config      = require('../config'),
    defaults    = require(config.get('paths').internalAppPath + 'default-cards'),
    options = {
        dom: new SimpleDom.Document(),
        cards: defaults.cards,
        atoms: defaults.atoms
    };

// function getCards() {
//     return config.get('internalApps').reduce(
//         function (cards, appName) {
//             var app = require(path.join(config.get('paths').internalAppPath, appName));
//             if (app.hasOwnProperty('cards')) {
//                 cards = cards.concat(app.cards);
//             }
//         return cards;
//     }, [ ]);
// }
// function getAtoms() {
//     return config.get('internalApps').reduce(
//         function (atoms, appName) {
//             var app = require(path.join(config.get('paths').internalAppPath, appName));
//             if (app.hasOwnProperty('atoms')) {
//                 atoms = atoms.concat(app.atoms);
//             }
//         return atoms;
//     }, [ ]);
// }

module.exports = {
    render: function (mobiledoc) {
        var renderer = new Renderer(options),
        rendered = renderer.render(mobiledoc),
        serializer = new SimpleDom.HTMLSerializer([]),
        html = serializer.serializeChildren(rendered.result);
        return html;
    }
};
