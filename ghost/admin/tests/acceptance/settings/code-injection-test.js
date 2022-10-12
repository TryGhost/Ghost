import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {
    beforeEach,
    describe,
    it
} from 'mocha';
import {click, currentURL, fillIn, find, findAll, triggerEvent} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Code-Injection', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/code-injection');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/code-injection');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('redirects to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/code-injection');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    it('redirects to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/code-injection');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it renders, loads and saves editors correctly', async function () {
            await visit('/settings/code-injection');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/code-injection');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - Code injection - Test Blog');

            expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');

            expect(findAll('#ghost-head .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
            expect(find('#ghost-head .CodeMirror'), 'ghost head editor theme').to.have.class('cm-s-xq-light');

            expect(findAll('#ghost-foot .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
            expect(find('#ghost-foot .CodeMirror'), 'ghost head editor theme').to.have.class('cm-s-xq-light');

            await fillIn('#settings-code #ghost-head textarea', 'Test');

            await click('[data-test-save-button]');

            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(lastRequest.requestBody);

            expect(params.settings.findBy('key', 'codeinjection_head').value).to.equal('Test');
            // update should have been partial
            expect(params.settings.findBy('key', 'navigation')).to.be.undefined;
            expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');

            await fillIn('#settings-code #ghost-head textarea', '');

            // CMD-S shortcut works
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [newRequest] = this.server.pretender.handledRequests.slice(-1);
            params = JSON.parse(newRequest.requestBody);

            expect(params.settings.findBy('key', 'codeinjection_head').value).to.equal('');
            expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');

            // Saving when no changed have been made should work
            // (although no api request is expected)
            await click('[data-test-save-button]');            
            expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');
        });
    });
});
