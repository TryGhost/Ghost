import {authenticateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {find, triggerKeyEvent, visit, waitUntil} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

/**
 * Acceptance test suite for navigation menu accessibility features.
 * Tests keyboard navigation and ARIA attributes for the sidebar toggle button.
 * 
 * @module Acceptance Tests
 * @submodule Nav Menu Accessibility
 * @see {@link https://github.com/TryGhost/Ghost/issues/25054} for related issue
 */
describe('Acceptance: Nav Menu Accessibility', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    /**
     * Set up test environment before each test.
     * Creates an authenticated admin user to ensure the navigation menu is rendered.
     * 
     * @returns {Promise<void>}
     */
    beforeEach(async function () {
        // ensure we have an authenticated admin user so the nav is rendered
        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {id: '1', roles: [role]});
        await authenticateSession();
    });

    /**
     * Tests that the navigation menu toggle button is keyboard accessible.
     * Verifies:
     * - Toggle button exists with proper aria-controls attribute
     * - Button has aria-expanded attribute for screen reader support
     * - Enter key press toggles the aria-expanded state correctly
     * - State changes are properly reflected in the DOM
     * 
     * This test addresses keyboard navigation requirements for WCAG 2.1 Level AA compliance.
     * 
     * @returns {Promise<void>}
     * @see {@link https://github.com/TryGhost/Ghost/issues/25054}
     */
    it('toggle button is keyboard focusable and toggles aria-expanded', async function () {
        // visit a route that renders the primary navigation
        await visit('/site');

        let toggle = find('button[aria-controls="gh-nav"]');
        expect(toggle, 'nav toggle exists').to.exist;

        // Store the initial state
        let initialState = toggle.getAttribute('aria-expanded');
        expect(initialState, 'initial aria-expanded exists').to.exist;
        
        let expectedState = initialState === 'true' ? 'false' : 'true';

        // Press Enter on the toggle and wait for aria-expanded to change
        await triggerKeyEvent(toggle, 'keydown', 'Enter');

        await waitUntil(() => {
            let t = find('button[aria-controls="gh-nav"]');
            return t && t.getAttribute('aria-expanded') === expectedState;
        }, {timeout: 1000});

        let afterState = find('button[aria-controls="gh-nav"]').getAttribute('aria-expanded');
        expect(afterState, 'aria-expanded toggled correctly').to.equal(expectedState);
        expect(afterState, 'state changed from initial').to.not.equal(initialState);
    });

    /**
     * Tests that the Space key activates the navigation toggle button.
     * Verifies WCAG 2.1.1 Level A requirement that buttons respond to both Enter and Space keys.
     * 
     * @returns {Promise<void>}
     * @see {@link https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html}
     */
    it('responds to Space key activation', async function () {
        await visit('/site');

        let toggle = find('button[aria-controls="gh-nav"]');
        expect(toggle, 'nav toggle exists').to.exist;

        // Store the initial state
        let initialState = toggle.getAttribute('aria-expanded');
        expect(initialState, 'initial aria-expanded exists').to.exist;
        
        let expectedState = initialState === 'true' ? 'false' : 'true';

        // Press Space on the toggle and wait for aria-expanded to change
        await triggerKeyEvent(toggle, 'keydown', ' ');

        await waitUntil(() => {
            let t = find('button[aria-controls="gh-nav"]');
            return t && t.getAttribute('aria-expanded') === expectedState;
        }, {timeout: 1000});

        let afterState = find('button[aria-controls="gh-nav"]').getAttribute('aria-expanded');
        expect(afterState, 'aria-expanded toggled correctly with Space key').to.equal(expectedState);
        expect(afterState, 'state changed from initial').to.not.equal(initialState);
    });

    /**
     * Tests bidirectional keyboard toggle functionality.
     * Verifies that keyboard users can both expand and collapse the sidebar,
     * ensuring aria-expanded correctly returns to "false" state.
     * 
     * @returns {Promise<void>}
     */
    it('can toggle sidebar from expanded back to collapsed with keyboard', async function () {
        await visit('/site');

        let toggle = find('button[aria-controls="gh-nav"]');
        expect(toggle, 'nav toggle exists').to.exist;

        let initialState = toggle.getAttribute('aria-expanded');

        // First toggle: expand (or collapse if already expanded)
        await triggerKeyEvent(toggle, 'keydown', 'Enter');
        
        let firstState = initialState === 'true' ? 'false' : 'true';
        await waitUntil(() => {
            let t = find('button[aria-controls="gh-nav"]');
            return t && t.getAttribute('aria-expanded') === firstState;
        }, {timeout: 1000});

        let afterFirstToggle = find('button[aria-controls="gh-nav"]').getAttribute('aria-expanded');
        expect(afterFirstToggle, 'first toggle changed state').to.equal(firstState);

        // Second toggle: return to initial state
        await triggerKeyEvent(toggle, 'keydown', 'Enter');
        
        await waitUntil(() => {
            let t = find('button[aria-controls="gh-nav"]');
            return t && t.getAttribute('aria-expanded') === initialState;
        }, {timeout: 1000});

        let afterSecondToggle = find('button[aria-controls="gh-nav"]').getAttribute('aria-expanded');
        expect(afterSecondToggle, 'second toggle returned to initial state').to.equal(initialState);
        expect(afterSecondToggle, 'state toggled back correctly').to.not.equal(afterFirstToggle);
    });
});
