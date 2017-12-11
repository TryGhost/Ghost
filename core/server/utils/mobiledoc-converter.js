var SimpleDom = require('simple-dom'),
    Renderer = require('mobiledoc-dom-renderer').default,
    config = require('../config'),
    common = require('../lib/common'),
    defaults = require(config.get('paths').internalAppPath + 'default-cards'),
    options = {
        dom: new SimpleDom.Document(),
        cards: defaults.cards,
        atoms: defaults.atoms,
        unknownCardHandler: function (args) {
            common.logging.error(new common.errors.InternalServerError({
                message: 'Mobiledoc card \'' + args.env.name + '\' not found.'
            }));
        }
    };

// function getCards() {
//     return config.get('apps:internal').reduce(
//         function (cards, appName) {
//             var app = require(path.join(config.get('paths').internalAppPath, appName));
//             if (app.hasOwnProperty('cards')) {
//                 cards = cards.concat(app.cards);
//             }
//         return cards;
//     }, [ ]);
// }
// function getAtoms() {
//     return config.get('apps:internal').reduce(
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
            serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap),
            html = serializer.serializeChildren(rendered.result);
        return html;
    }
};
