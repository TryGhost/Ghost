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
        env = createBrowserEnvironment({
            html
        });

        const scriptPath = path.join(__dirname, '../../../../core/frontend/src/cards/js/toggle.js');
        loadScript(env, fs.readFileSync(scriptPath, 'utf8'));
    }

    function assertToggleState({toggleCard, toggleControl, toggleContent, state}) {
        const isOpen = state === 'open';

        assert.equal(toggleCard.getAttribute('data-kg-toggle-state'), state);
        assert.equal(toggleControl.getAttribute('aria-expanded'), isOpen ? 'true' : 'false');
        assert.equal(toggleContent.getAttribute('aria-hidden'), isOpen ? 'false' : 'true');
        assert.equal(toggleContent.hidden, !isOpen);
    }

    it('keeps disclosure state and hidden content in sync when toggling current markup', function () {
        loadToggleScript(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                        <div class="kg-toggle-heading">
                            <h4 class="kg-toggle-heading-text">Spoilers below</h4>
                            <button class="kg-toggle-card-icon" type="button" aria-expanded="false"></button>
                        </div>
                        <div class="kg-toggle-content" aria-hidden="true" hidden>Hidden spoiler content</div>
                    </div>
                </body>
            </html>
        `);

        const toggleCard = env.document.querySelector('.kg-toggle-card');
        const toggleHeading = env.document.querySelector('.kg-toggle-heading');
        const toggleControl = env.document.querySelector('.kg-toggle-card-icon');
        const toggleContent = env.document.querySelector('.kg-toggle-content');

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'close'
        });
        assert.equal(toggleControl.getAttribute('aria-label'), 'Spoilers below');

        toggleHeading.click();

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'open'
        });

        toggleHeading.click();

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'close'
        });
    });

    it('adds disclosure state and hides content when toggling old stored markup', function () {
        loadToggleScript(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                        <div class="kg-toggle-heading">
                            <h4 class="kg-toggle-heading-text">Spoilers below</h4>
                            <button class="kg-toggle-card-icon"></button>
                        </div>
                        <div class="kg-toggle-content">Hidden spoiler content</div>
                    </div>
                </body>
            </html>
        `);

        const toggleCard = env.document.querySelector('.kg-toggle-card');
        const toggleHeading = env.document.querySelector('.kg-toggle-heading');
        const toggleControl = env.document.querySelector('.kg-toggle-card-icon');
        const toggleContent = env.document.querySelector('.kg-toggle-content');

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'close'
        });
        assert.equal(toggleControl.getAttribute('aria-label'), 'Spoilers below');

        toggleHeading.click();

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'open'
        });

        toggleHeading.click();

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'close'
        });
    });

    it('does not toggle when clicking an interactive heading link', function () {
        loadToggleScript(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                        <div class="kg-toggle-heading">
                            <h4 class="kg-toggle-heading-text"><a href="https://example.com">Linked heading</a></h4>
                            <button class="kg-toggle-card-icon" type="button" aria-expanded="false"></button>
                        </div>
                        <div class="kg-toggle-content" aria-hidden="true" hidden>Hidden spoiler content</div>
                    </div>
                </body>
            </html>
        `);

        const toggleCard = env.document.querySelector('.kg-toggle-card');
        const toggleControl = env.document.querySelector('.kg-toggle-card-icon');
        const toggleContent = env.document.querySelector('.kg-toggle-content');
        const headingLink = env.document.querySelector('.kg-toggle-heading-text a');

        headingLink.click();

        assertToggleState({
            toggleCard,
            toggleControl,
            toggleContent,
            state: 'close'
        });
    });
});
