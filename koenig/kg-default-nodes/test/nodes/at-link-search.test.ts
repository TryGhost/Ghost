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
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

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
        expect($isAtLinkSearchNode(atLinkSearchNode)).toBe(true);
    }));

    it('can be constructed with text and placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'placeholder');
        expect(atLinkNode.getTextContent()).toBe('test');
        expect(atLinkNode.getPlaceholder()!).toBe('placeholder');
    }));

    it('can be closed with all data', editorTest(function () {
        const atLinkSearch = $createAtLinkSearchNode('test', 'placeholder');
        const atLinkSearchClone = AtLinkSearchNode.clone(atLinkSearch);

        expect(atLinkSearch.__key).toBe(atLinkSearchClone.__key);
        expect(atLinkSearchClone.getTextContent()).toBe('test');
        expect(atLinkSearchClone.getPlaceholder()!).toBe('placeholder');
    }));

    it('exports all data via exportJSON()', editorTest(function () {
        const atLinkSearch = $createAtLinkSearchNode('test', 'placeholder');
        expect(atLinkSearch.exportJSON()).toEqual({
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
        expect(atLinkSearch.getTextContent()).toBe('test');
        expect(atLinkSearch.getPlaceholder()!).toBe('placeholder');
    }));

    it('renders using theme classes and default placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        const dom = atLinkNode.createDOM(config);
        expect(dom.classList.contains('multiple')).toBe(true);
        expect(dom.classList.contains('classes')).toBe(true);
        expect(dom.dataset.placeholder!).toBe('Find a post, tag or author');
    }));

    it('renders without default placeholder if text is present', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test');
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('');
    }));

    it('renders with custom placeholder (no text)', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('', 'custom');
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('custom');
    }));

    it('renders with custom placeholder (with text)', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('custom');
    }));

    it('updates to remove default placeholder when text is added', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('Find a post, tag or author');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('test');
        atLinkNode.updateDOM(prevNode, dom, config);
        expect(dom.dataset.placeholder!).toBe('');
    }));

    it('keeps custom placeholder when text changes', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('custom');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('test2');
        atLinkNode.updateDOM(prevNode, dom, config);
        expect(dom.dataset.placeholder!).toBe('custom');
    }));

    it('updates placeholder when text is cleared', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('custom');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('');
        atLinkNode.setPlaceholder('updated');
        atLinkNode.updateDOM(prevNode, dom, config);
        expect(dom.dataset.placeholder!).toBe('updated');
    }));

    it('restores the default placeholder when text is cleared and placeholder is null', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test');
        const dom = atLinkNode.createDOM(config);
        expect(dom.dataset.placeholder!).toBe('');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('');
        atLinkNode.updateDOM(prevNode, dom, config);
        expect(dom.dataset.placeholder!).toBe('Find a post, tag or author');
    }));

    it('returns an empty element for exportDOM()', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        const {element, type} = atLinkSearchNode.exportDOM();

        expect(element).not.toBeNull();
        expect(element).not.toBeUndefined();
        expect(type).toBe('inner');
        expect(element.tagName).toBe('SPAN');
        expect(element.innerHTML).toBe('');
        expect(element.outerHTML).toBe('<span></span>');
    }));

    it('cannot have format', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode();
        expect(atLinkSearchNode.canHaveFormat()).toBe(false);
    }));

    it('can set custom placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        atLinkNode.setPlaceholder('test');
        expect(atLinkNode.getPlaceholder()!).toBe('test');
    }));

    it('returns contents from .getTextContent()', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        expect(atLinkNode.getTextContent()).toBe('');

        atLinkNode.setTextContent('test');
        expect(atLinkNode.getTextContent()).toBe('test');
    }));

    it('has "element"-like methods', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        expect(atLinkNode.getChildrenSize()).toBe(0);
        expect(atLinkNode.getChildAtIndex()).toBe(null);
    }));
});
