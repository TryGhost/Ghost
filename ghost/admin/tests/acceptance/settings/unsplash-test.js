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
        await visit('/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/staff/test-user');
    });

    it('redirects to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/staff/test-user');
    });

    it('redirects to staff page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/integrations/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/staff');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it can activate/deactivate', async function () {
            await visit('/integrations/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/integrations/unsplash');

            // verify we don't have an unsplash setting fixture loaded
            expect(
                this.server.db.settings.where({key: 'unsplash'}),
                'initial server settings'
            ).to.be.empty;

            // it's enabled by default when settings is empty
            expect(
                find('[data-test-checkbox="unsplash"]').checked,
                'checked by default'
            ).to.be.true;

            // trigger a save
            await click('[data-test-save-button]');

            // server should now have an unsplash setting
            let [setting] = this.server.db.settings.where({key: 'unsplash'});
            expect(setting, 'unsplash setting after save').to.exist;
            expect(setting.value).to.equal('{"isActive":true}');

            // disable
            await click('[data-test-checkbox="unsplash"]');

            // save via CMD-S shortcut
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // server should have an updated setting
            [setting] = this.server.db.settings.where({key: 'unsplash'});
            expect(setting.value).to.equal('{"isActive":false}');
        });

        it('warns when leaving without saving', async function () {
            await visit('/integrations/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/integrations/unsplash');

            expect(
                find('[data-test-checkbox="unsplash"]').checked,
                'checked by default'
            ).to.be.true;

            await click('[data-test-checkbox="unsplash"]');

            expect(find('[data-test-checkbox="unsplash"]').checked, 'Unsplash checkbox').to.be.false;

            await visit('/settings/labs');

            expect(findAll('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await click('.fullscreen-modal [data-test-leave-button]');

            expect(currentURL(), 'currentURL').to.equal('/settings/labs');

            await visit('/integrations/unsplash');

            expect(currentURL(), 'currentURL').to.equal('/integrations/unsplash');

            // settings were not saved
            expect(find('[data-test-checkbox="unsplash"]').checked, 'Unsplash checkbox').to.be.true;
        });
    });
});
