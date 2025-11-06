import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {find, triggerKeyEvent, visit, waitUntil} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Nav Menu Accessibility', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        // ensure we have an authenticated admin user so the nav is rendered
        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {id: '1', roles: [role]});
        await authenticateSession();
    });

    it('toggle button is keyboard focusable and toggles aria-expanded', async function () {
        // visit a route that renders the primary navigation
        await visit('/site');

        let toggle = find('button[aria-controls="gh-nav"]');
        expect(toggle, 'nav toggle exists').to.exist;

        // Press Enter on the toggle and wait for aria-expanded to become "true"
        await triggerKeyEvent(toggle, 'keydown', 'Enter');

        await waitUntil(() => {
            let t = find('button[aria-controls="gh-nav"]');
            return t && t.getAttribute('aria-expanded') === 'true';
        }, {timeout: 1000});

        let after = find('button[aria-controls="gh-nav"]').getAttribute('aria-expanded');
        expect(after).to.equal('true');
    });
});
