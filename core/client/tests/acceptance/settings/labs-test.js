/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';

describe('Acceptance: Settings - Labs', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/labs');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/labs');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/labs');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('it renders, loads modals correctly', function () {
            visit('/settings/labs');

            andThen(() => {
                // has correct url
                expect(currentURL(), 'currentURL').to.equal('/settings/labs');

                // has correct page title
                expect(document.title, 'page title').to.equal('Settings - Labs - Test Blog');

                // highlights nav menu
                expect($('.gh-nav-settings-labs').hasClass('active'), 'highlights nav menu item')
                    .to.be.true;
            });

            click('#settings-resetdb .js-delete');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);
            });

            click('.fullscreen-modal .modal-footer .btn.btn-minor');

            andThen(() => {
                expect(find('.fullscreen-modal').length, 'modal element').to.equal(0);
            });
        });
    });
});
