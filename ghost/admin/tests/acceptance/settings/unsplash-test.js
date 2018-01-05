import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../../helpers/destroy-app';
import startApp from '../../helpers/start-app';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Settings - Apps - Unsplash', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/apps/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps/unsplash');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('it can activate/deactivate', async function () {
            await visit('/settings/apps/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/unsplash');

            // verify we don't have an unsplash setting fixture loaded
            expect(
                server.db.settings.where({key: 'unsplash'}),
                'initial server settings'
            ).to.be.empty;

            // it's enabled by default when settings is empty
            expect(
                find('[data-test-checkbox="unsplash"]').prop('checked'),
                'checked by default'
            ).to.be.true;

            // trigger a save
            await click('[data-test-save-button]');

            // server should now have an unsplash setting
            let [setting] = server.db.settings.where({key: 'unsplash'});
            expect(setting, 'unsplash setting after save').to.exist;
            expect(setting.value).to.equal('{"isActive":true}');

            // disable
            await click(find('[data-test-checkbox="unsplash"]'));

            // save via CMD-S shortcut
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // server should have an updated setting
            [setting] = server.db.settings.where({key: 'unsplash'});
            expect(setting.value).to.equal('{"isActive":false}');
        });

        it('warns when leaving without saving', async function () {
            await visit('/settings/apps/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/unsplash');

            expect(
                find('[data-test-checkbox="unsplash"]').prop('checked'),
                'checked by default'
            ).to.be.true;

            await click('[data-test-checkbox="unsplash"]');

            expect(find('[data-test-checkbox="unsplash"]').prop('checked'), 'Unsplash checkbox').to.be.false;

            await visit('/settings/labs');

            expect(find('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await (click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving');

            expect(currentURL(), 'currentURL').to.equal('/settings/labs');

            await visit('/settings/apps/unsplash');

            expect(currentURL(), 'currentURL').to.equal('/settings/apps/unsplash');

            // settings were not saved
            expect(find('[data-test-checkbox="unsplash"]').prop('checked'), 'Unsplash checkbox').to.be.true;
        });
    });
});
