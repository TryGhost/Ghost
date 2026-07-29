const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createBrowserEnvironment, loadScript} = require('../../../utils/browser-test-utils');

describe('Toggle card script', function () {
    let env;

    afterEach(function () {
        env?.dom.window.close();
    });

    function loadToggleScript(html) {
        env = createBrowserEnvironment({html});

        const scriptPath = path.join(__dirname, '../../../../core/frontend/src/cards/js/toggle.js');
        loadScript(env, fs.readFileSync(scriptPath, 'utf8'));
    }

    function assertLegacyToggleState({card, control, content, state}) {
        const isOpen = state === 'open';

        assert.equal(card.getAttribute('data-kg-toggle-state'), state);
        assert.equal(control.getAttribute('aria-expanded'), isOpen ? 'true' : 'false');
        assert.equal(content.getAttribute('aria-hidden'), isOpen ? 'false' : 'true');
        assert.equal(content.hasAttribute('inert'), !isOpen);
    }

    it('adds accessible state to stored legacy cards and keeps it synchronized', function () {
        loadToggleScript(`
            <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                <div class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text">Spoilers below</h4>
                    <button class="kg-toggle-card-icon" aria-label="Expand toggle to read content"></button>
                </div>
                <div class="kg-toggle-content"><a href="/answer">The answer</a></div>
            </div>
        `);

        const card = env.document.querySelector('.kg-toggle-card');
        const control = env.document.querySelector('.kg-toggle-card-icon');
        const content = env.document.querySelector('.kg-toggle-content');

        assertLegacyToggleState({card, control, content, state: 'close'});
        assert.equal(control.getAttribute('aria-label'), 'Spoilers below');

        control.click();
        assertLegacyToggleState({card, control, content, state: 'open'});

        control.click();
        assertLegacyToggleState({card, control, content, state: 'close'});
    });

    it('does not toggle a legacy card when a heading link is clicked', function () {
        loadToggleScript(`
            <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                <div class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text"><a href="/more">Linked heading</a></h4>
                    <button class="kg-toggle-card-icon"></button>
                </div>
                <div class="kg-toggle-content">Content</div>
            </div>
        `);

        const card = env.document.querySelector('.kg-toggle-card');
        const headingLink = env.document.querySelector('.kg-toggle-heading-text a');

        headingLink.click();

        assert.equal(card.getAttribute('data-kg-toggle-state'), 'close');
    });

    it('leaves native details state and behavior to the browser', function () {
        loadToggleScript(`
            <details class="kg-card kg-toggle-card">
                <summary class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text">
                        Spoilers below
                        <span class="kg-toggle-card-icon" aria-hidden="true"></span>
                    </h4>
                </summary>
                <div class="kg-toggle-content">Content</div>
            </details>
        `);

        const card = env.document.querySelector('.kg-toggle-card');
        const summary = env.document.querySelector('.kg-toggle-heading');
        const content = env.document.querySelector('.kg-toggle-content');

        assert.equal(card.open, false);
        assert.equal(card.hasAttribute('data-kg-toggle-state'), false);
        assert.equal(content.hasAttribute('aria-hidden'), false);
        assert.equal(content.hasAttribute('inert'), false);

        summary.click();

        assert.equal(card.open, true);
        assert.equal(card.hasAttribute('data-kg-toggle-state'), false);
    });

    it('preserves the first-click behavior of legacy cards without a state attribute', function () {
        loadToggleScript(`
            <div class="kg-card kg-toggle-card">
                <div class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text">Heading</h4>
                    <button class="kg-toggle-card-icon"></button>
                </div>
                <div class="kg-toggle-content">Content</div>
            </div>
        `);

        const card = env.document.querySelector('.kg-toggle-card');
        const control = env.document.querySelector('.kg-toggle-card-icon');
        const content = env.document.querySelector('.kg-toggle-content');

        assert.equal(card.hasAttribute('data-kg-toggle-state'), false);
        assert.equal(content.hasAttribute('aria-hidden'), false);

        control.click();

        assertLegacyToggleState({card, control, content, state: 'close'});
    });
});
