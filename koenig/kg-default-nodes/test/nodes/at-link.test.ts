import should from 'should';
import '../test-utils/index.js';
import {JSDOM} from 'jsdom';
import {createHeadlessEditor} from '@lexical/headless';
import type {LexicalEditor, EditorConfig} from 'lexical';
import {AtLinkNode, $createAtLinkNode, $isAtLinkNode, $createAtLinkSearchNode, AtLinkSearchNode} from '../../src/index.js';

const editorNodes = [AtLinkNode, AtLinkSearchNode];

describe('AtLinkNode', function () {
    let editor: LexicalEditor;

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
        global.DOMParser = window.DOMParser;
    });

    afterEach(function () {
        delete (global as Record<string, unknown>).document;
        delete (global as Record<string, unknown>).window;
        delete (global as Record<string, unknown>).DOMParser;
    });

    it('matches node with $isAtLinkNode', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        $isAtLinkNode(atLinkNode).should.be.true();
    }));

    it('can be constructed with link format', editorTest(function () {
        const atLinkNode = $createAtLinkNode(1);
        atLinkNode.getLinkFormat()!.should.equal(1);
    }));

    it('defaults link format to null when called without args', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        should.equal(atLinkNode.getLinkFormat(), null);
    }));

    it('can be cloned with all data', editorTest(function () {
        const atLinkNode = $createAtLinkNode(1);
        const atLinkNodeClone = AtLinkNode.clone(atLinkNode);

        atLinkNode.__key.should.equal(atLinkNodeClone.__key);
        atLinkNodeClone.getLinkFormat()!.should.equal(1);
    }));

    it('exports all data via exportJSON()', editorTest(function () {
        const atLinkNode = $createAtLinkNode(1);
        atLinkNode.exportJSON().should.deepEqual({
            children: [],
            direction: null,
            format: '',
            indent: 0,
            linkFormat: 1,
            type: 'at-link',
            version: 1
        });
    }));

    it('imports all data via importJSON()', editorTest(function () {
        const atLinkNode = AtLinkNode.importJSON({linkFormat: 1} as ReturnType<AtLinkNode['exportJSON']>);
        atLinkNode.getLinkFormat()!.should.equal(1);
    }));

    it('uses theme class when creating DOM', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        const dom = atLinkNode.createDOM(
            {theme: {atLink: 'multiple classes'}} as unknown as EditorConfig
        );
        dom.classList.contains('multiple').should.be.true();
        dom.classList.contains('classes').should.be.true();
    }));

    it('never updates dom after creation', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        atLinkNode.updateDOM().should.be.false();
    }));

    it('can get and set link format', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        atLinkNode.setLinkFormat(1);
        atLinkNode.getLinkFormat()!.should.equal(1);
    }));

    it('returns an empty element for exportDOM()', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        atLinkNode.append(atLinkSearchNode);
        const {element, type} = atLinkNode.exportDOM();

        should.exist(element);
        should.equal(type, 'inner');
        element.tagName.should.equal('SPAN');
        element.innerHTML.should.equal('');
        element.outerHTML.should.equal('<span></span>');
    }));

    it('returns blank string for .getTextContent()', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        atLinkNode.append(atLinkSearchNode);
        atLinkNode.getTextContent().should.equal('');
    }));

    it('is inline', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        atLinkNode.isInline().should.be.true();
    }));

    it('cannot be empty', editorTest(function () {
        const atLinkNode = $createAtLinkNode(null);
        atLinkNode.canBeEmpty().should.be.false();
    }));
});
