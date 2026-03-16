import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
import MobiledocDomRenderer from 'mobiledoc-dom-renderer';
import {slugify} from '@tryghost/kg-utils';

// mobiledoc-dom-renderer may use CJS default export pattern
const Renderer = (MobiledocDomRenderer as {default?: typeof MobiledocDomRenderer}).default || MobiledocDomRenderer;

interface SimpleDomNode {
    nodeType: number;
    nodeName: string;
    nodeValue: string | null;
    tagName: string;
    firstChild: SimpleDomNode | null;
    lastChild: SimpleDomNode | null;
    nextSibling: SimpleDomNode | null;
    appendChild(child: SimpleDomNode): void;
    removeChild(child: SimpleDomNode): void;
    setAttribute(name: string, value: string): void;
    getAttribute(name: string): string | null;
}

const walkDom = function (node: SimpleDomNode, func: (node: SimpleDomNode) => void): void {
    func(node);
    let child = node.firstChild;

    while (child) {
        walkDom(child, func);
        child = child.nextSibling;
    }
};

const nodeTextContent = function (node: SimpleDomNode): string {
    let textContent = '';

    walkDom(node, (currentNode: SimpleDomNode) => {
        if (currentNode.nodeType === 3) {
            textContent += currentNode.nodeValue;
        }
    });

    return textContent;
};

interface SimpleDom {
    createElement(tag: string): SimpleDomNode;
}

interface DomModifierOptions {
    ghostVersion?: string;
    target?: string;
    dom: SimpleDom;
    [key: string]: unknown;
}

// used to walk the rendered SimpleDOM output and modify elements before
// serializing to HTML. Saves having a large HTML parsing dependency such as
// jsdom that may break on malformed HTML in MD or HTML cards
class DomModifier {
    usedIds: Record<string, number> = {};
    options: DomModifierOptions;

    constructor(options: DomModifierOptions) {
        this.options = options;
    }

    addHeadingId(node: SimpleDomNode): void {
        if (!node.firstChild || node.getAttribute('id')) {
            return;
        }

        const text = nodeTextContent(node);
        let id = slugify(text, this.options);

        if (this.usedIds[id] !== undefined) {
            this.usedIds[id] += 1;
            id += `-${this.usedIds[id]}`;
        } else {
            this.usedIds[id] = 0;
        }

        node.setAttribute('id', id);
    }

    wrapBlockquoteContentInP(node: SimpleDomNode): void {
        if (node.firstChild && node.firstChild.tagName === 'P') {
            return;
        }

        const p = this.options.dom.createElement('p');
        while (node.firstChild) {
            p.appendChild(node.firstChild);
        }

        node.appendChild(p);
    }

    modifyChildren(node: SimpleDomNode): void {
        walkDom(node, this.modify.bind(this));
    }

    modify(node: SimpleDomNode): void {
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

interface CardDefinition {
    name: string;
    type: string;
    render(args: Record<string, unknown>): unknown;
}

interface AtomDefinition {
    name: string;
    type: string;
    render(args: Record<string, unknown>): unknown;
}

interface RendererOptions {
    cards?: CardDefinition[];
    atoms?: AtomDefinition[];
    unknownCardHandler?: (...args: unknown[]) => void;
}

interface RendererInternalOptions {
    dom: SimpleDomDocument;
    cards: CardDefinition[];
    atoms: AtomDefinition[];
    unknownCardHandler: (...args: unknown[]) => void;
}

interface Mobiledoc {
    ghostVersion?: string;
    version: string;
    [key: string]: unknown;
}

export class MobiledocHtmlRenderer {
    options: RendererInternalOptions;

    constructor(options: RendererOptions = {}) {
        this.options = {
            dom: new SimpleDomDocument(),
            cards: options.cards || [],
            atoms: options.atoms || [],
            unknownCardHandler: options.unknownCardHandler || function () {}
        };
    }

    render(mobiledoc: Mobiledoc, _cardOptions: Record<string, unknown> = {}): string {
        const ghostVersion = mobiledoc.ghostVersion || '4.0';

        const defaultCardOptions = {
            ghostVersion,
            target: 'html'
        };
        const cardOptions = Object.assign({}, defaultCardOptions, _cardOptions);

        const sectionElementRenderer = {
            ASIDE: function (_tagName: string, dom: SimpleDom) {
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
        const serializer = new HTMLSerializer(voidMap);

        // Koenig keeps a blank paragraph at the end of a doc but we want to
        // make sure it doesn't get rendered
        const lastChild = rendered.result.lastChild as SimpleDomNode | null;
        if (lastChild && lastChild.tagName === 'P') {
            if (!nodeTextContent(lastChild)) {
                rendered.result.removeChild(lastChild);
            }
        }

        // Walk the DOM output and modify nodes as needed
        // eg. to add ID attributes to heading elements
        const modifier = new DomModifier(Object.assign({}, cardOptions, {dom: this.options.dom}) as DomModifierOptions);
        modifier.modifyChildren(rendered.result as unknown as SimpleDomNode);

        const output = serializer.serializeChildren(rendered.result);

        // clean up any DOM that could be kept around in our SimpleDom instance
        rendered.teardown();

        return output;
    }
}
