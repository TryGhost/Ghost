const SimpleDom = require('simple-dom');
const Renderer = require('mobiledoc-dom-renderer').default;
const common = require('../../common');
const atoms = require('../atoms');
const cards = require('../cards');
const options = {
    dom: new SimpleDom.Document(),
    cards: cards,
    atoms: atoms,
    unknownCardHandler: function (args) {
        common.logging.error(new common.errors.InternalServerError({
            message: 'Mobiledoc card \'' + args.env.name + '\' not found.'
        }));
    }
};

// used to walk the rendered SimpleDOM output and modify elements before
// serializing to HTML. Saves having a large HTML parsing dependency such as
// jsdom that may break on malformed HTML in MD or HTML cards
class DomModifier {
    constructor() {
        this.usedIds = [];
    }

    addHeadingId(node) {
        if (!node.firstChild || node.getAttribute('id')) {
            return;
        }

        let text = this.getTextValue(node);
        let id = text
            .replace(/[<>&"?]/g, '')
            .trim()
            .replace(/[^\w]/g, '-')
            .replace(/-{2,}/g, '-')
            .toLowerCase();

        if (this.usedIds[id] !== undefined) {
            this.usedIds[id] += 1;
            id += `-${this.usedIds[id]}`;
        } else {
            this.usedIds[id] = 0;
        }

        node.setAttribute('id', id);
    }

    // extract to util?
    getTextValue(node) {
        let buffer = '';
        let next = node.firstChild;
        while (next !== null) {
            buffer += this._extractTextValue(next);
            next = next.nextSibling;
        }

        return buffer;
    }

    _extractTextValue(node) {
        let buffer = '';

        if (node.nodeType === 3) {
            buffer += node.nodeValue;
        }

        buffer += this.getTextValue(node);

        return buffer;
    }

    modifyChildren(node) {
        let next = node.firstChild;
        while (next !== null) {
            this.modify(next);
            next = next.nextSibling;
        }
    }

    modify(node) {
        // add id attributes to H* tags
        if (node.nodeType === 1 && node.nodeName.match(/^h\d$/i)) {
            this.addHeadingId(node);
        }

        this.modifyChildren(node);
    }
}

module.exports = {
    render(mobiledoc, version) {
        /**
         * @deprecated: version 1 === Ghost 1.0 markdown-only mobiledoc
         *              We keep the version 1 logic till Ghost 3.0 to be able to rollback posts.
         *
         * version 2 (latest) === Ghost 2.0 full mobiledoc
         */
        version = version || 2;

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

        // Walk the DOM output and modify nodes as needed
        // eg. to add ID attributes to heading elements
        let modifier = new DomModifier();
        modifier.modifyChildren(rendered.result);

        return serializer.serializeChildren(rendered.result);
    },

    blankStructure() {
        return {
            version: '0.3.1',
            markups: [],
            atoms: [],
            cards: [],
            sections: [
                [1, 'p', [
                    [0, [], 0, '']
                ]]
            ]
        };
    }
};
