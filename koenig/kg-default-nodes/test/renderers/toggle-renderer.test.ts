import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

function assertCollapsedToggleIsAccessible(renderedHtml: string) {
    const {document} = new JSDOM(renderedHtml).window;
    const toggle = document.querySelector('.kg-toggle-card');
    const details = toggle?.matches('details') ? toggle : toggle?.querySelector('details');

    if (details) {
        assert.equal(details.hasAttribute('open'), false);
        assert.ok(details.querySelector('summary'));
        return;
    }

    const button = toggle?.querySelector('button');
    const content = toggle?.querySelector('.kg-toggle-content');

    assert.equal(button?.getAttribute('aria-expanded'), 'false');
    assert.equal(
        content?.hasAttribute('hidden') || content?.getAttribute('aria-hidden') === 'true',
        true
    );
}

describe('renderers/toggle-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            heading: 'Toggle Heading',
            content: 'Collapsible content',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('toggle', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('toggle', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                    <div class="kg-toggle-heading">
                        <h4 class="kg-toggle-heading-text">Toggle Heading</h4>
                        <button class="kg-toggle-card-icon" type="button" aria-expanded="false">
                            <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path
                                    class="cls-1"
                                    d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="kg-toggle-content" aria-hidden="true" hidden="">Collapsible content</div>
                </div>
            `);
        });

        it('renders a collapsed toggle that exposes state and hides content from assistive technology', function () {
            const result = renderForWeb({
                heading: 'Spoilers below',
                content: 'Hidden spoiler content'
            });

            assert.ok(result.html);
            assertCollapsedToggleIsAccessible(result.html);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table cellspacing="0" cellpadding="0" border="0" width="100%" class="kg-toggle-card">
                    <tbody>
                        <tr>
                            <td class="kg-toggle-heading">
                                <h4>Toggle Heading</h4>
                            </td>
                        </tr>
                        <tr>
                            <td class="kg-toggle-content">Collapsible content</td>
                        </tr>
                    </tbody>
                </table>
            `);
        });
    });
});
