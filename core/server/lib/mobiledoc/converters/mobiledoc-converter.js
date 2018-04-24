'use strict';

const SimpleDom = require('simple-dom');
const Renderer = require('mobiledoc-dom-renderer').default;
const common = require('../../common');
const atoms = require('../atoms');
const cards = require('../cards');

let options = {
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
    render: function (mobiledoc) {
        let renderer = new Renderer(options);
        let rendered = renderer.render(mobiledoc);

        let currentNode = rendered.result.firstChild;
        while (currentNode) {
            // ignore divs for now
            if (currentNode.tagName === 'DIV' && !currentNode.getAttribute('class')) {
                currentNode = currentNode.nextSibling;
                return;
            }

            let prevSibling = currentNode.previousSibling;
            let existingClass = currentNode.getAttribute('class');
            let nodeName = existingClass || `kg-${currentNode.tagName.toLowerCase()}`;

            if (prevSibling) {
                let afterTag = prevSibling.tagName.toLowerCase();
                currentNode.setAttribute('class', `${existingClass} ${nodeName}--after-${afterTag}`.trim());
            } else {
                currentNode.setAttribute('class', `${nodeName}`);
            }

            currentNode = currentNode.nextSibling;
        }

        let serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);
        let html = serializer.serializeChildren(rendered.result);
        rendered.teardown();
        return html;
    }
};
