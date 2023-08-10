const SimpleDom = require('simple-dom');
const Renderer = require('mobiledoc-dom-renderer').default;
const {slugify} = require('@tryghost/kg-utils');

const walkDom = function (node, func) {
    func(node);
    node = node.firstChild;

    while (node) {
        walkDom(node, func);
        node = node.nextSibling;
    }
};

const nodeTextContent = function (node) {
    let textContent = '';

    walkDom(node, (currentNode) => {
        if (currentNode.nodeType === 3) {
            textContent += currentNode.nodeValue;
        }
    });

    return textContent;
};

// used to walk the rendered SimpleDOM output and modify elements before
// serializing to HTML. Saves having a large HTML parsing dependency such as
// jsdom that may break on malformed HTML in MD or HTML cards
class DomModifier {
    constructor(options) {
        this.usedIds = [];
        this.options = options;
    }

    addHeadingId(node) {
        if (!node.firstChild || node.getAttribute('id')) {
            return;
        }

        let text = nodeTextContent(node);
        let id = slugify(text, this.options);

        if (this.usedIds[id] !== undefined) {
            this.usedIds[id] += 1;
            id += `-${this.usedIds[id]}`;
        } else {
            this.usedIds[id] = 0;
        }

        node.setAttribute('id', id);
    }

    wrapBlockquoteContentInP(node) {
        if (node.firstChild && node.firstChild.tagName === 'P') {
            return;
        }

        const p = this.options.dom.createElement('p');
        while (node.firstChild) {
            p.appendChild(node.firstChild);
        }

        node.appendChild(p);
    }

    modifyChildren(node) {
        walkDom(node, this.modify.bind(this));
    }

    modify(node) {
        // add id attributes to H* tags
        if (node.nodeType === 1 && node.nodeName.match(/^h\d$/i)) {
            this.addHeadingId(node);
        }

        // wrap blockquote content in P tag for emails
        if (this.options.target === 'email' && node.nodeType === 1 && node.nodeName === 'BLOCKQUOTE') {
            this.wrapBlockquoteContentInP(node);
        }
    }
}

class MobiledocHtmlRenderer {
    constructor(options = {}) {
        this.options = {
            dom: new SimpleDom.Document(),
            cards: options.cards || [],
            atoms: options.atoms || [],
            unknownCardHandler: options.unknownCardHandler || function () {}
        };
    }

    render(mobiledoc, _cardOptions = {}) {
        const ghostVersion = mobiledoc.ghostVersion || '4.0';

        const defaultCardOptions = {
            ghostVersion,
            target: 'html'
        };
        const cardOptions = Object.assign({}, defaultCardOptions, _cardOptions);

        const sectionElementRenderer = {
            ASIDE: function (tagName, dom) {
                // we use ASIDE sections in Koenig as a workaround for applying
                // a different blockquote style because mobiledoc doesn't support
                // storing arbitrary attributes with sections
                const blockquote = dom.createElement('blockquote');
                blockquote.setAttribute('class', 'kg-blockquote-alt');
                return blockquote;
            }
        };

        const rendererOptions = Object.assign({}, this.options, {cardOptions, sectionElementRenderer});
        const renderer = new Renderer(rendererOptions);
        const rendered = renderer.render(mobiledoc);
        const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

        // Koenig keeps a blank paragraph at the end of a doc but we want to
        // make sure it doesn't get rendered
        const lastChild = rendered.result.lastChild;
        if (lastChild && lastChild.tagName === 'P') {
            if (!nodeTextContent(lastChild)) {
                rendered.result.removeChild(lastChild);
            }
        }

        // Walk the DOM output and modify nodes as needed
        // eg. to add ID attributes to heading elements
        const modifier = new DomModifier(Object.assign({}, cardOptions, {dom: this.options.dom}));
        modifier.modifyChildren(rendered.result);

        const output = serializer.serializeChildren(rendered.result);

        // clean up any DOM that could be kept around in our SimpleDom instance
        rendered.teardown();

        return output;
    }
}

module.exports = MobiledocHtmlRenderer;
