import {JSDOM} from 'jsdom';
import {DecoratorNode} from 'lexical';
import {LexicalHTMLRenderer as Renderer} from '../src/index.js';
import type {NodeKey, SerializedLexicalNode} from 'lexical';
import type {RendererOptions} from '../src/types.js';

type SerializedBadgeNode = SerializedLexicalNode & {label: string};

class InlineBadgeNode extends DecoratorNode<null> {
    __label: string;

    static getType() {
        return 'inline-badge';
    }

    static clone(node: InlineBadgeNode) {
        return new InlineBadgeNode(node.__label, node.__key);
    }

    static importJSON(serializedNode: SerializedBadgeNode) {
        return new InlineBadgeNode(serializedNode.label);
    }

    constructor(label: string, key?: NodeKey) {
        super(key);
        this.__label = label;
    }

    exportJSON(): SerializedBadgeNode {
        return {type: 'inline-badge', version: 1, label: this.__label};
    }

    isInline() {
        return true;
    }

    decorate() {
        return null;
    }

    exportDOM(_editor: unknown, options: RendererOptions = {}) {
        const span = options.dom!.window.document.createElement('span');
        span.className = 'badge';
        span.textContent = this.__label;
        return {element: span, type: 'outer' as const};
    }
}

// inline decorator relying on Lexical's default exportDOM
class EditorOnlyInlineNode extends DecoratorNode<null> {
    static getType() {
        return 'editor-only-inline';
    }

    static clone(node: EditorOnlyInlineNode) {
        return new EditorOnlyInlineNode(node.__key);
    }

    static importJSON() {
        return new EditorOnlyInlineNode();
    }

    exportJSON() {
        return {type: 'editor-only-inline', version: 1};
    }

    isInline() {
        return true;
    }

    decorate() {
        return null;
    }
}

const dom = new JSDOM();
const nodes = [InlineBadgeNode, EditorOnlyInlineNode];

const text = (t: string, format = 0) => ({detail: 0, format, mode: 'normal', style: '', text: t, type: 'text', version: 1});
const badge = (label: string) => ({type: 'inline-badge', version: 1, label});
const element = (type: string, children: object[], extra = {}) => ({children, direction: 'ltr', format: '', indent: 0, type, version: 1, ...extra});
const state = (...children: object[]) => JSON.stringify({root: element('root', children)});

async function render(input: string) {
    const renderer = new Renderer({dom, nodes, onError: (e: Error) => {
        throw e;
    }});
    return renderer.render(input);
}

describe('Inline decorator nodes', function () {
    it('renders inline decorators within a paragraph', async function () {
        const html = await render(state(
            element('paragraph', [text('Before '), badge('one'), text(' after')])
        ));

        expect(html).toBe('<p>Before <span class="badge">one</span> after</p>');
    });

    it('keeps surrounding text formats open across an inline decorator', async function () {
        const html = await render(state(
            element('paragraph', [text('Italic ', 2), badge('two'), text(' still italic', 2)])
        ));

        expect(html).toBe('<p><em>Italic <span class="badge">two</span> still italic</em></p>');
    });

    it('renders inline decorators in headings and list items', async function () {
        const html = await render(state(
            element('heading', [text('Title '), badge('h')], {tag: 'h2'}),
            element('list', [
                element('listitem', [text('Item '), badge('li')], {value: 1})
            ], {listType: 'bullet', start: 1, tag: 'ul'})
        ));

        expect(html).toBe('<h2 id="title">Title <span class="badge">h</span></h2><ul><li>Item <span class="badge">li</span></li></ul>');
    });

    it('skips inline decorators without their own exportDOM', async function () {
        const html = await render(state(
            element('paragraph', [text('Kept'), {type: 'editor-only-inline', version: 1}, text(' text')])
        ));

        expect(html).toBe('<p>Kept text</p>');
    });
});
