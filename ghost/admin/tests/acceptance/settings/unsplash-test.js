import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {
    beforeEach,
    describe,
    it
} from 'mocha';
import {click, currentURL, find, findAll, triggerEvent} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Integrations - Unsplash', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('redirects to home page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    it('redirects to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it can activate/deactivate', async function () {
            await visit('/settings/integrations/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/unsplash');

            // it's enabled by default when settings is empty
            expect(find('[data-test-unsplash-checkbox]').checked, 'checked by default').to.be.true;

            await click('[data-test-unsplash-checkbox]');

            expect(find('[data-test-unsplash-checkbox]').checked, 'unsplash checkbox').to.be.false;

            // trigger a save
            await click('[data-test-save-button]');

            // server should now have an unsplash setting
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(lastRequest.requestBody);

            expect(params.settings.findBy('key', 'unsplash').value).to.equal(false);

            // save via CMD-S shortcut
            await click('[data-test-unsplash-checkbox]');
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // we've already saved in this test so there's no on-screen indication
            // that we've had another save, check the request was fired instead
            let [newRequest] = this.server.pretender.handledRequests.slice(-1);
            params = JSON.parse(newRequest.requestBody);

            expect(find('[data-test-unsplash-checkbox]').checked, 'AMP checkbox').to.be.true;
            expect(params.settings.findBy('key', 'unsplash').value).to.equal(true);
        });

        it('warns when leaving without saving', async function () {
            await visit('/settings/integrations/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/unsplash');

            // AMP is enabled by default
            expect(find('[data-test-unsplash-checkbox]').checked, 'AMP checkbox default').to.be.true;

            await click('[data-test-unsplash-checkbox]');

            expect(find('[data-test-unsplash-checkbox]').checked, 'Unsplash checkbox').to.be.false;

            await visit('/settings/labs');

            expect(findAll('[data-test-modal="unsaved-settings"]').length, 'unsaved changes modal exists').to.equal(1);

            // Leave without saving
            await click('[data-test-modal="unsaved-settings"] [data-test-leave-button]');

            expect(currentURL(), 'currentURL after leave without saving').to.equal('/settings/labs');

            await visit('/settings/integrations/unsplash');

            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/unsplash');

            // settings were not saved
            expect(find('[data-test-unsplash-checkbox]').checked, 'Unsplash checkbox').to.be.true;
        });
    });
});
