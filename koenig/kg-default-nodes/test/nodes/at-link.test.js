require('../test-utils');
const {JSDOM} = require('jsdom');
const {createHeadlessEditor} = require('@lexical/headless');
const {AtLinkNode, $createAtLinkNode, $isAtLinkNode, $createAtLinkSearchNode, AtLinkSearchNode} = require('../../');

const editorNodes = [AtLinkNode, AtLinkSearchNode];

describe('AtLinkNode', function () {
    let editor;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = testFn => function (done) {
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
        global.document = window.document;
        global.window = window;
        global.DOMParser = window.DOMParser;
    });

    afterEach(function () {
        delete global.document;
        delete global.window;
        delete global.DOMParser;
    });

    it('matches node with $isAtLinkNode', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        $isAtLinkNode(atLinkNode).should.be.true();
    }));

    it('can be constructed with link format', editorTest(function () {
        const atLinkNode = $createAtLinkNode('bold');
        atLinkNode.getLinkFormat().should.equal('bold');
    }));

    it('can be cloned with all data', editorTest(function () {
        const atLinkNode = $createAtLinkNode('bold');
        const atLinkNodeClone = AtLinkNode.clone(atLinkNode);

        atLinkNode.__key.should.equal(atLinkNodeClone.__key);
        atLinkNodeClone.getLinkFormat().should.equal('bold');
    }));

    it('exports all data via exportJSON()', editorTest(function () {
        const atLinkNode = $createAtLinkNode('bold');
        atLinkNode.exportJSON().should.deepEqual({
            children: [],
            direction: null,
            format: '',
            indent: 0,
            linkFormat: 'bold',
            type: 'at-link',
            version: 1
        });
    }));

    it('imports all data via importJSON()', editorTest(function () {
        const atLinkNode = AtLinkNode.importJSON({linkFormat: 'bold'});
        atLinkNode.getLinkFormat().should.equal('bold');
    }));

    it('uses theme class when creating DOM', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        const dom = atLinkNode.createDOM(
            {theme: {atLink: 'multiple classes'}},
            editor
        );
        dom.classList.contains('multiple').should.be.true();
        dom.classList.contains('classes').should.be.true();
    }));

    it('never updates dom after creation', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        atLinkNode.updateDOM().should.be.false();
    }));

    it('can get and set link format', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        atLinkNode.setLinkFormat('bold');
        atLinkNode.getLinkFormat().should.equal('bold');
    }));

    it('returns null for exportDOM()', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        atLinkNode.append(atLinkSearchNode);
        should.equal(atLinkNode.exportDOM(), null);
    }));

    it('returns blank string for .getTextContent()', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        atLinkNode.append(atLinkSearchNode);
        atLinkNode.getTextContent().should.equal('');
    }));

    it('is inline', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        atLinkNode.isInline().should.be.true();
    }));

    it('cannot be empty', editorTest(function () {
        const atLinkNode = $createAtLinkNode();
        atLinkNode.canBeEmpty().should.be.false();
    }));
});
