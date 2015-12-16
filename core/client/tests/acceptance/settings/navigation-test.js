/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
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

describe('Acceptance: Settings - Navigation', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/navigation');

        andThen(function () {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/navigation');

        andThen(function () {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            // load the settings fixtures
            // TODO: this should always be run for acceptance tests
            server.loadFixtures();

            authenticateSession(application);
        });

        it('can visit /settings/navigation', function () {
            visit('/settings/navigation');

            andThen(function () {
                expect(currentPath()).to.equal('settings.navigation');
                // test has expected number of rows
                expect($('.gh-blognav-item').length, 'navigation items count').to.equal(3);
            });
        });

        it('saves settings', function () {
            visit('/settings/navigation');
            fillIn('.gh-blognav-label:first input', 'Test');
            fillIn('.gh-blognav-url:first input', '/test');
            triggerEvent('.gh-blognav-url:first input', 'blur');

            click('.btn-blue');

            andThen(function () {
                // TODO: Test for successful save here once we have a visual
                // indication. For now we know the save happened because
                // Pretender doesn't complain about an unknown URL

                // don't test against .error directly as it will pick up failed
                // tests "pre.error" elements
                expect($('span.error').length, 'error fields count').to.equal(0);
                expect($('.gh-alert').length, 'alerts count').to.equal(0);
            });
        });

        it('clears unsaved settings when navigating away', function () {
            visit('/settings/navigation');
            fillIn('.gh-blognav-label:first input', 'Test');
            triggerEvent('.gh-blognav-label:first input', 'blur');

            andThen(function () {
                expect($('.gh-blognav-label:first input').val()).to.equal('Test');
            });

            visit('/settings/code-injection');
            visit('/settings/navigation');

            andThen(function () {
                expect($('.gh-blognav-label:first input').val()).to.equal('Home');
            });
        });
    });
});
