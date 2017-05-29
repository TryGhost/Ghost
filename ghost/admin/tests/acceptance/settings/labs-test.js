/* jshint expr:true */
import $ from 'jquery';
import destroyApp from '../../helpers/destroy-app';
import startApp from '../../helpers/start-app';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Settings - Labs', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it.skip('it renders, loads modals correctly', async function () {
            await visit('/settings/labs');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/labs');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - Labs - Test Blog');

            // highlights nav menu
            expect($('.gh-nav-settings-labs').hasClass('active'), 'highlights nav menu item')
                .to.be.true;

            await click('#settings-resetdb .js-delete');
            expect(find('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);

            await click('.fullscreen-modal .modal-footer .gh-btn');
            expect(find('.fullscreen-modal').length, 'modal element').to.equal(0);
        });
    });
});
