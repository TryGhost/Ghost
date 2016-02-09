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

                // fixtures contain two nav items, check for three rows as we
                // should have one extra that's blank
                expect(
                    find('.gh-blognav-item').length,
                    'navigation items count'
                ).to.equal(3);
            });
        });

        it('saves navigation settings', function () {
            visit('/settings/navigation');
            fillIn('.gh-blognav-label:first input', 'Test');
            fillIn('.gh-blognav-url:first input', '/test');
            triggerEvent('.gh-blognav-url:first input', 'blur');

            click('.btn-blue');

            andThen(function () {
                let [navSetting] = server.db.settings.where({key: 'navigation'});

                expect(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]');

                // don't test against .error directly as it will pick up failed
                // tests "pre.error" elements
                expect(find('span.error').length, 'error fields count').to.equal(0);
                expect(find('.gh-alert').length, 'alerts count').to.equal(0);
                expect(find('.response:visible').length, 'validation errors count')
                    .to.equal(0);
            });
        });

        it('validates new item correctly on save', function () {
            visit('/settings/navigation');

            click('.btn-blue');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after saving with blank new item'
                ).to.equal(3);
            });

            fillIn('.gh-blognav-label:last input', 'Test');
            fillIn('.gh-blognav-url:last input', 'http://invalid domain/');
            triggerEvent('.gh-blognav-url:last input', 'blur');

            click('.btn-blue');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after saving with invalid new item'
                ).to.equal(3);

                expect(
                    find('.gh-blognav-item:last .response:visible').length,
                    'number of invalid fields in new item'
                ).to.equal(1);
            });
        });

        it('clears unsaved settings when navigating away', function () {
            visit('/settings/navigation');
            fillIn('.gh-blognav-label:first input', 'Test');
            triggerEvent('.gh-blognav-label:first input', 'blur');

            andThen(function () {
                expect(find('.gh-blognav-label:first input').val()).to.equal('Test');
            });

            visit('/settings/code-injection');
            visit('/settings/navigation');

            andThen(function () {
                expect(find('.gh-blognav-label:first input').val()).to.equal('Home');
            });
        });

        it('can add and remove items', function (done) {
            visit('/settings/navigation');

            click('.gh-blognav-add');

            andThen(function () {
                expect(
                    find('.gh-blognav-label:last .response').is(':visible'),
                    'blank label has validation error'
                ).to.be.true;

                expect(
                    find('.gh-blognav-url:last .response').is(':visible'),
                    'blank url has validation error'
                ).to.be.true;
            });

            fillIn('.gh-blognav-label:last input', 'New');
            triggerEvent('.gh-blognav-label:last input', 'keypress', {});

            andThen(function () {
                expect(
                    find('.gh-blognav-label:last .response').is(':visible'),
                    'label validation is visible after typing'
                ).to.be.false;

                expect(
                    find('.gh-blognav-url:last .response').is(':visible'),
                    'blank url still has validation error'
                ).to.be.true;
            });

            fillIn('.gh-blognav-url:last input', '/new');
            triggerEvent('.gh-blognav-url:last input', 'keypress', {});
            triggerEvent('.gh-blognav-url:last input', 'blur');

            andThen(function () {
                expect(
                    find('.gh-blognav-url:last .response').is(':visible'),
                    'url validation is visible after typing'
                ).to.be.false;

                expect(
                    find('.gh-blognav-url:last input').val()
                ).to.equal(`${window.location.protocol}//${window.location.host}/new/`);
            });

            click('.gh-blognav-add');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after successful add'
                ).to.equal(4);

                expect(
                    find('.gh-blognav-label:last input').val(),
                    'new item label value after successful add'
                ).to.be.blank;

                expect(
                    find('.gh-blognav-url:last input').val(),
                    'new item url value after successful add'
                ).to.equal(`${window.location.protocol}//${window.location.host}/`);

                expect(
                    find('.gh-blognav-item .response:visible').length,
                    'number or validation errors shown after successful add'
                ).to.equal(0);
            });

            click('.gh-blognav-item:first .gh-blognav-delete');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after successful remove'
                ).to.equal(3);
            });

            click('.btn-blue');

            andThen(function () {
                let [navSetting] = server.db.settings.where({key: 'navigation'});

                expect(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');

                done();
            });
        });
    });
});
