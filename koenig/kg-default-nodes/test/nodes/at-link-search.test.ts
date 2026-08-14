import should from 'should';
import '../test-utils/index.js';
import {JSDOM} from 'jsdom';
import {createHeadlessEditor} from '@lexical/headless';
import type {LexicalEditor, EditorConfig} from 'lexical';
import {AtLinkSearchNode, $createAtLinkSearchNode, $isAtLinkSearchNode} from '../../src/index.js';

const editorNodes = [AtLinkSearchNode];

describe('AtLinkSearchNode', function () {
    let editor: LexicalEditor;

    const config = {theme: {atLinkSearch: 'multiple classes'}} as unknown as EditorConfig;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => function (done: (err?: unknown) => void) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        const {window} = new JSDOM('<!doctype html><html><body></body></html>');
        global.document = window.document as unknown as Document;
        global.window = window as unknown as Window & typeof globalThis;
    });

    afterEach(function () {
        delete (global as Record<string, unknown>).document;
        delete (global as Record<string, unknown>).window;
    });

    it('matches node with $isAtLinkSearchNode', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode();
        $isAtLinkSearchNode(atLinkSearchNode).should.be.true();
    }));

    it('can be constructed with text and placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'placeholder');
        atLinkNode.getTextContent().should.equal('test');
        atLinkNode.getPlaceholder()!.should.equal('placeholder');
    }));

    it('can be closed with all data', editorTest(function () {
        const atLinkSearch = $createAtLinkSearchNode('test', 'placeholder');
        const atLinkSearchClone = AtLinkSearchNode.clone(atLinkSearch);

        atLinkSearch.__key.should.equal(atLinkSearchClone.__key);
        atLinkSearchClone.getTextContent().should.equal('test');
        atLinkSearchClone.getPlaceholder()!.should.equal('placeholder');
    }));

    it('exports all data via exportJSON()', editorTest(function () {
        const atLinkSearch = $createAtLinkSearchNode('test', 'placeholder');
        atLinkSearch.exportJSON().should.deepEqual({
            detail: 0,
            format: 0,
            mode: 'normal',
            placeholder: 'placeholder',
            style: '',
            text: 'test',
            type: 'at-link-search',
            version: 1
        });
    }));

    it('imports all data via importJSON()', editorTest(function () {
        const atLinkSearch = AtLinkSearchNode.importJSON({text: 'test', placeholder: 'placeholder'} as ReturnType<AtLinkSearchNode['exportJSON']>);
        atLinkSearch.getTextContent().should.equal('test');
        atLinkSearch.getPlaceholder()!.should.equal('placeholder');
    }));

    it('renders using theme classes and default placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        const dom = atLinkNode.createDOM(config);
        dom.classList.contains('multiple').should.be.true();
        dom.classList.contains('classes').should.be.true();
        dom.dataset.placeholder!.should.equal('Find a post, tag or author');
    }));

    it('renders without default placeholder if text is present', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('');
    }));

    it('renders with custom placeholder (no text)', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('custom');
    }));

    it('renders with custom placeholder (with text)', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('custom');
    }));

    it('updates to remove default placeholder when text is added', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('Find a post, tag or author');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('test');
        atLinkNode.updateDOM(prevNode, dom, config);
        dom.dataset.placeholder!.should.equal('');
    }));

    it('keeps custom placeholder when text changes', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('custom');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('test2');
        atLinkNode.updateDOM(prevNode, dom, config);
        dom.dataset.placeholder!.should.equal('custom');
    }));

    it('updates placeholder when text is cleared', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('custom');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('');
        atLinkNode.setPlaceholder('updated');
        atLinkNode.updateDOM(prevNode, dom, config);
        dom.dataset.placeholder!.should.equal('updated');
    }));

    it('restores the default placeholder when text is cleared and placeholder is null', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder!.should.equal('');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('');
        atLinkNode.updateDOM(prevNode, dom, config);
        dom.dataset.placeholder!.should.equal('Find a post, tag or author');
    }));

    it('returns an empty element for exportDOM()', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        const {element, type} = atLinkSearchNode.exportDOM();

        should.exist(element);
        should.equal(type, 'inner');
        element.tagName.should.equal('SPAN');
        element.innerHTML.should.equal('');
        element.outerHTML.should.equal('<span></span>');
    }));

    it('cannot have format', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode();
        atLinkSearchNode.canHaveFormat().should.be.false();
    }));

    it('can set custom placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        atLinkNode.setPlaceholder('test');
        atLinkNode.getPlaceholder()!.should.equal('test');
    }));

    it('returns contents from .getTextContent()', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        atLinkNode.getTextContent().should.equal('');

        atLinkNode.setTextContent('test');
        atLinkNode.getTextContent().should.equal('test');
    }));

    it('has "element"-like methods', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        atLinkNode.getChildrenSize().should.equal(0);
        should.equal(atLinkNode.getChildAtIndex(), null);
    }));
});
