import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {attachEditInteractions} from '../src/edit-mode/interactions.js';

function createDom() {
    return new JSDOM(`<!DOCTYPE html><html><body>
        <article data-edit="index.hbs:3:5">
            <h1 data-edit="index.hbs:4:9"><span id="inner">Post title</span></h1>
        </article>
        <p id="unmarked">helper-emitted content</p>
        <a id="plain-link" href="/elsewhere/">plain link</a>
        <div id="ghost-admin-toolbar-root"><button id="toolbar-button">toolbar</button></div>
    </body></html>`, {url: 'https://site.example.com/'});
}

describe('edit-mode interactions', function () {
    it('resolves clicks to the nearest [data-edit] ancestor and prevents default', function () {
        const dom = createDom();
        const doc = dom.window.document;
        const selected = [];

        attachEditInteractions({
            doc,
            ignoreSelectors: ['#ghost-admin-toolbar-root'],
            onHover: () => {},
            onSelect: element => selected.push(element)
        });

        const event = new dom.window.MouseEvent('click', {bubbles: true, cancelable: true});
        doc.getElementById('inner').dispatchEvent(event);

        assert.equal(selected.length, 1);
        assert.equal(selected[0].getAttribute('data-edit'), 'index.hbs:4:9');
        assert.equal(event.defaultPrevented, true);
    });

    it('ignores clicks without a data-edit ancestor, keeping default behavior', function () {
        const dom = createDom();
        const doc = dom.window.document;
        const selected = [];

        attachEditInteractions({
            doc,
            ignoreSelectors: ['#ghost-admin-toolbar-root'],
            onHover: () => {},
            onSelect: element => selected.push(element)
        });

        const event = new dom.window.MouseEvent('click', {bubbles: true, cancelable: true});
        doc.getElementById('unmarked').dispatchEvent(event);

        assert.equal(selected.length, 0);
        assert.equal(event.defaultPrevented, false);
    });

    it('leaves the preserved UI surfaces alone', function () {
        const dom = createDom();
        const doc = dom.window.document;
        const selected = [];
        const hovered = [];

        attachEditInteractions({
            doc,
            ignoreSelectors: ['#ghost-admin-toolbar-root'],
            onHover: element => hovered.push(element),
            onSelect: element => selected.push(element)
        });

        doc.getElementById('toolbar-button').dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true, cancelable: true}));
        doc.getElementById('toolbar-button').dispatchEvent(new dom.window.MouseEvent('mouseover', {bubbles: true}));

        assert.equal(selected.length, 0);
        assert.equal(hovered.length, 0);
    });

    it('reports hover targets (and null on unmarked elements) for the highlight', function () {
        const dom = createDom();
        const doc = dom.window.document;
        const hovered = [];

        attachEditInteractions({
            doc,
            ignoreSelectors: ['#ghost-admin-toolbar-root'],
            onHover: element => hovered.push(element?.getAttribute('data-edit') ?? null),
            onSelect: () => {}
        });

        doc.getElementById('inner').dispatchEvent(new dom.window.MouseEvent('mouseover', {bubbles: true}));
        doc.getElementById('unmarked').dispatchEvent(new dom.window.MouseEvent('mouseover', {bubbles: true}));

        assert.deepEqual(hovered, ['index.hbs:4:9', null]);
    });

    it('stops reporting after detach()', function () {
        const dom = createDom();
        const doc = dom.window.document;
        const selected = [];

        const handle = attachEditInteractions({
            doc,
            ignoreSelectors: ['#ghost-admin-toolbar-root'],
            onHover: () => {},
            onSelect: element => selected.push(element)
        });

        handle.detach();
        doc.getElementById('inner').dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true, cancelable: true}));

        assert.equal(selected.length, 0);
    });
});
