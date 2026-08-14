import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDocumentSwapper} from '../src/edit-mode/swap.js';

// Iframes are deliberately NOT preserved: moving an iframe between parents
// discards its browsing context (it reloads), so the auth frame stays in the
// detached original body and comes back on restore — see swap.js/session.js.
const PRESERVE_SELECTORS = [
    '#ghost-admin-toolbar-root',
    '#ghost-admin-toolbar-edit-overlay'
];

function createLiveDom() {
    const dom = new JSDOM(`<!DOCTYPE html>
        <html lang="en" class="original-class" data-original="yes">
        <head><title>Original title</title><meta name="original" content="true"></head>
        <body class="original-body">
            <main id="original-main">Live site content</main>
            <div id="ghost-admin-toolbar-root"><span>toolbar</span></div>
            <iframe data-frame="admin-auth" src="about:blank"></iframe>
            <div id="ghost-admin-toolbar-edit-overlay"></div>
        </body></html>`, {url: 'https://site.example.com/'});

    // jsdom's scrollTo is not implemented — record calls instead
    const scrollCalls = [];
    dom.window.scrollTo = (x, y) => scrollCalls.push([x, y]);

    return {dom, scrollCalls};
}

const RENDERED_HTML = `<!DOCTYPE html>
    <html lang="fr" data-rendered="yes">
    <head><title>Rendered title</title></head>
    <body class="rendered-body">
        <article data-edit="index.hbs:3:5"><h1 data-edit="index.hbs:4:9">Post title</h1></article>
        <script>window.__themeScriptRan = true;</script>
    </body></html>`;

describe('edit-mode swap', function () {
    it('swaps head and body in place while preserving the toolbar and overlay', function () {
        const {dom} = createLiveDom();
        const doc = dom.window.document;
        const swapper = createDocumentSwapper({doc, win: dom.window, preserveSelectors: PRESERVE_SELECTORS});

        const toolbarBefore = doc.getElementById('ghost-admin-toolbar-root');
        swapper.swap(RENDERED_HTML);

        // rendered content is live
        assert.equal(doc.title, 'Rendered title');
        assert.notEqual(doc.querySelector('[data-edit="index.hbs:4:9"]'), null);
        assert.equal(doc.getElementById('original-main'), null);

        // documentElement attributes follow the rendered document
        assert.equal(doc.documentElement.getAttribute('lang'), 'fr');
        assert.equal(doc.documentElement.getAttribute('data-rendered'), 'yes');
        assert.equal(doc.documentElement.getAttribute('data-original'), null);

        // preserved nodes are the SAME nodes, still connected
        const toolbarAfter = doc.getElementById('ghost-admin-toolbar-root');
        assert.equal(toolbarAfter, toolbarBefore, 'toolbar host must be moved, not recreated');
        assert.ok(toolbarAfter.isConnected);
        assert.ok(doc.getElementById('ghost-admin-toolbar-edit-overlay').isConnected);
        // the auth iframe is NOT preserved (moving it would discard its
        // browsing context) — it waits in the detached original body
        assert.equal(doc.querySelector('iframe[data-frame="admin-auth"]'), null);
        assert.equal(swapper.hasSwapped(), true);
    });

    it('does not execute scripts in the swapped-in DOM (DOMParser semantics)', function () {
        const {dom} = createLiveDom();
        const doc = dom.window.document;
        const swapper = createDocumentSwapper({doc, win: dom.window, preserveSelectors: PRESERVE_SELECTORS});

        swapper.swap(RENDERED_HTML);

        // the script element exists in the DOM but never ran
        assert.notEqual(doc.querySelector('script'), null);
        assert.equal(dom.window.__themeScriptRan, undefined);
    });

    it('supports repeated swaps (one per edit) with preservation intact', function () {
        const {dom} = createLiveDom();
        const doc = dom.window.document;
        const swapper = createDocumentSwapper({doc, win: dom.window, preserveSelectors: PRESERVE_SELECTORS});
        const toolbar = doc.getElementById('ghost-admin-toolbar-root');

        swapper.swap(RENDERED_HTML);
        swapper.swap(RENDERED_HTML.replace('Post title', 'Edited title'));

        assert.match(doc.querySelector('h1').textContent, /Edited title/);
        assert.equal(doc.getElementById('ghost-admin-toolbar-root'), toolbar);
        assert.ok(toolbar.isConnected);
    });

    it('restores the original document, attributes, and preserved nodes on restore()', function () {
        const {dom} = createLiveDom();
        const doc = dom.window.document;
        const swapper = createDocumentSwapper({doc, win: dom.window, preserveSelectors: PRESERVE_SELECTORS});

        const originalBody = doc.body;
        const originalHead = doc.head;
        const toolbar = doc.getElementById('ghost-admin-toolbar-root');

        swapper.swap(RENDERED_HTML);
        swapper.restore();

        assert.equal(doc.body, originalBody, 'the original body element returns');
        assert.equal(doc.head, originalHead, 'the original head element returns');
        assert.equal(doc.title, 'Original title');
        assert.notEqual(doc.getElementById('original-main'), null);
        assert.equal(doc.documentElement.getAttribute('lang'), 'en');
        assert.equal(doc.documentElement.getAttribute('data-original'), 'yes');
        assert.equal(doc.documentElement.getAttribute('data-rendered'), null);
        assert.equal(doc.documentElement.className, 'original-class');

        // preserved nodes came back with the original body
        assert.equal(doc.getElementById('ghost-admin-toolbar-root'), toolbar);
        assert.ok(toolbar.isConnected);
        // the non-preserved auth iframe returns with the original body
        assert.ok(doc.querySelector('iframe[data-frame="admin-auth"]').isConnected);
        assert.equal(swapper.hasSwapped(), false);
    });

    it('keeps the scroll position across swap and restore', function () {
        const {dom, scrollCalls} = createLiveDom();
        const doc = dom.window.document;
        const swapper = createDocumentSwapper({doc, win: dom.window, preserveSelectors: PRESERVE_SELECTORS});

        swapper.swap(RENDERED_HTML);
        swapper.restore();

        // jsdom reports scrollX/scrollY as 0 — the contract is that the
        // swapper re-applies whatever the position was at swap/restore time
        assert.deepEqual(scrollCalls, [[0, 0], [0, 0]]);
    });

    it('restore() before any swap is a no-op', function () {
        const {dom} = createLiveDom();
        const doc = dom.window.document;
        const swapper = createDocumentSwapper({doc, win: dom.window, preserveSelectors: PRESERVE_SELECTORS});
        const body = doc.body;

        swapper.restore();

        assert.equal(doc.body, body);
        assert.equal(swapper.hasSwapped(), false);
    });
});
