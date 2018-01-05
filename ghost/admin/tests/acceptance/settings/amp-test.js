import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../../helpers/destroy-app';
import startApp from '../../helpers/start-app';
import {
    afterEach,
    beforeEach,
    describe,
    it
} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Settings - Apps - AMP', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/apps/amp');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps/amp');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps/amp');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('it enables or disables AMP properly and saves it', async function () {
            await visit('/settings/apps/amp');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/amp');

            // AMP is enabled by default
            expect(find('[data-test-amp-checkbox]').prop('checked'), 'AMP checkbox').to.be.true;

            await click('[data-test-amp-checkbox]');

            expect(find('[data-test-amp-checkbox]').prop('checked'), 'AMP checkbox').to.be.false;

            await click('[data-test-save-button]');

            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(lastRequest.requestBody);

            expect(params.settings.findBy('key', 'amp').value).to.equal(false);

            // CMD-S shortcut works
            await click('[data-test-amp-checkbox]');
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // we've already saved in this test so there's no on-screen indication
            // that we've had another save, check the request was fired instead
            let [newRequest] = server.pretender.handledRequests.slice(-1);
            params = JSON.parse(newRequest.requestBody);

            expect(find('[data-test-amp-checkbox]').prop('checked'), 'AMP checkbox').to.be.true;
            expect(params.settings.findBy('key', 'amp').value).to.equal(true);
        });

        it('warns when leaving without saving', async function () {
            await visit('/settings/apps/amp');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/amp');

            // AMP is enabled by default
            expect(find('[data-test-amp-checkbox]').prop('checked'), 'AMP checkbox').to.be.true;

            await click('[data-test-amp-checkbox]');

            expect(find('[data-test-amp-checkbox]').prop('checked'), 'AMP checkbox').to.be.false;

            await visit('/team');

            expect(find('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await (click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving');

            expect(currentURL(), 'currentURL').to.equal('/team');

            await visit('/settings/apps/amp');

            expect(currentURL(), 'currentURL').to.equal('/settings/apps/amp');

            // settings were not saved
            expect(find('[data-test-amp-checkbox]').prop('checked'), 'AMP checkbox').to.be.true;
        });
    });
});
