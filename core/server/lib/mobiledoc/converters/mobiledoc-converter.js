var SimpleDom = require('simple-dom'),
    Renderer = require('mobiledoc-dom-renderer').default,
    common = require('../../common'),
    atoms = require('../atoms'),
    cards = require('../cards'),
    options = {
        dom: new SimpleDom.Document(),
        cards: cards,
        atoms: atoms,
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
    // version 1 === Ghost 1.0 markdown-only mobiledoc
    // version 2 === Ghost 2.0 full mobiledoc
    render: function (mobiledoc, version) {
        version = version || 1;

        // pass the version through to the card renderers.
        // create a new object here to avoid modifying the default options
        // object because the version can change per-render until 2.0 is released
        let versionedOptions = Object.assign({}, options, {
            cardOptions: {version}
        });

        let renderer = new Renderer(versionedOptions);
        let rendered = renderer.render(mobiledoc);
        let serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

        // Koenig keeps a blank paragraph at the end of a doc but we want to
        // make sure it doesn't get rendered
        let lastChild = rendered.result.lastChild;
        if (lastChild && lastChild.tagName === 'P' && !lastChild.firstChild) {
            rendered.result.removeChild(lastChild);
        }

        let html = serializer.serializeChildren(rendered.result);

        // full version of Koenig wraps the content with a specific class to
        // be targetted with our default stylesheet for vertical rhythm and
        // card-specific styles
        if (version === 2) {
            html = `<div class="kg-post">\n${html}\n</div>`;
        }

        return html;
    }
};
