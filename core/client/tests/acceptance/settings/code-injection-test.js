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

describe('Acceptance: Settings - Code-Injection', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/code-injection');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/code-injection');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/code-injection');

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

        it('it renders, loads editors correctly', function () {
            visit('/settings/code-injection');

            andThen(() => {
                // has correct url
                expect(currentURL(), 'currentURL').to.equal('/settings/code-injection');

                // has correct page title
                expect(document.title, 'page title').to.equal('Settings - Code Injection - Test Blog');

                // highlights nav menu
                expect($('.gh-nav-settings-code-injection').hasClass('active'), 'highlights nav menu item')
                    .to.be.true;

                expect(find('.view-header .view-actions .btn-blue').text().trim(), 'save button text').to.equal('Save');

                expect(find('#ghost-head .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
                expect($('#ghost-head .CodeMirror').hasClass('cm-s-xq-light'), 'ghost head editor theme').to.be.true;

                expect(find('#ghost-foot .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
                expect($('#ghost-foot .CodeMirror').hasClass('cm-s-xq-light'), 'ghost head editor theme').to.be.true;
            });
        });
    });
});
