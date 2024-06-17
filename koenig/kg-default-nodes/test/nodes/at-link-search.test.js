require('../utils');
const {JSDOM} = require('jsdom');
const {createHeadlessEditor} = require('@lexical/headless');
const {AtLinkSearchNode, $createAtLinkSearchNode, $isAtLinkNode, $isAtLinkSearchNode} = require('../../');

const editorNodes = [AtLinkSearchNode];

describe('AtLinkSearchNode', function () {
    let editor;

    const config = {theme: {atLinkSearch: 'multiple classes'}};

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
    });

    afterEach(function () {
        delete global.document;
        delete global.window;
    });

    it('matches node with $isAtLinkSearchNode', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode();
        $isAtLinkSearchNode(atLinkSearchNode).should.be.true;
    }));

    it('can be constructed with text and placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'placeholder');
        atLinkNode.getTextContent().should.equal('test');
        atLinkNode.getPlaceholder().should.equal('placeholder');
    }));

    it('can be closed with all data', editorTest(function () {
        const atLinkSearch = $createAtLinkSearchNode('test', 'placeholder');
        const atLinkSearchClone = AtLinkSearchNode.clone(atLinkSearch);

        atLinkSearch.__key.should.equal(atLinkSearchClone.__key);
        atLinkSearchClone.getTextContent().should.equal('test');
        atLinkSearchClone.getPlaceholder().should.equal('placeholder');
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
        const atLinkSearch = AtLinkSearchNode.importJSON({text: 'test', placeholder: 'placeholder'});
        atLinkSearch.getTextContent().should.equal('test');
        atLinkSearch.getPlaceholder().should.equal('placeholder');
    }));

    it('renders using theme classes and default placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        const dom = atLinkNode.createDOM(config);
        dom.classList.contains('multiple').should.be.true;
        dom.classList.contains('classes').should.be.true;
        dom.dataset.placeholder.should.equal('Find a post, tag or author');
    }));

    it('renders without default placeholder if text is present', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder.should.equal('');
    }));

    it('renders with custom placeholder (no text)', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder.should.equal('custom');
    }));

    it('renders with custom placeholder (with text)', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder.should.equal('custom');
    }));

    it('updates to remove default placeholder when text is added', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder.should.equal('Find a post, tag or author');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('test');
        atLinkNode.updateDOM(prevNode, dom, config);
        dom.dataset.placeholder.should.equal('');
    }));

    it('keeps custom placeholder when text changes', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode('test', 'custom');
        const dom = atLinkNode.createDOM(config);
        dom.dataset.placeholder.should.equal('custom');

        const prevNode = AtLinkSearchNode.clone(atLinkNode);

        atLinkNode.setTextContent('test2');
        atLinkNode.updateDOM(prevNode, dom, config);
        dom.dataset.placeholder.should.equal('custom');
    }));

    it('returns null for exportDOM()', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode('test');
        should.equal(atLinkSearchNode.exportDOM(), null);
    }));

    it('cannot have format', editorTest(function () {
        const atLinkSearchNode = $createAtLinkSearchNode();
        atLinkSearchNode.canHaveFormat().should.be.false;
    }));

    it('can set custom placeholder', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        atLinkNode.setPlaceholder('test');
        atLinkNode.getPlaceholder().should.equal('test');
    }));

    it('returns contents from .getTextContent()', editorTest(function () {
        const atLinkNode = $createAtLinkSearchNode();
        atLinkNode.getTextContent().should.equal('');

        atLinkNode.setTextContent('test');
        atLinkNode.getTextContent().should.equal('test');
    }));
});
