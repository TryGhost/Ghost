/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import run from 'ember-runloop';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import Mirage from 'ember-cli-mirage';
import { invalidateSession, authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';

describe('Acceptance: Settings - Apps - Slack', function () {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/apps/slack');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/apps/slack');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/apps/slack');

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

        it('it validates and saves a slack url properly', function () {
            visit('/settings/apps/slack');

            andThen(() => {
                // has correct url
                expect(currentURL(), 'currentURL').to.equal('/settings/apps/slack');

            });

            fillIn('#slack-settings input[name="slack[url]"]', 'notacorrecturl');
            click('#saveSlackIntegration');

            andThen(() => {
                expect(find('#slack-settings .error .response').text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://hooks.slack.com/services/<your personal key>');
            });

            fillIn('#slack-settings input[name="slack[url]"]', 'https://hooks.slack.com/services/1275958430');
            click('#sendTestNotification');

            andThen(() => {
                expect(find('.gh-alert-blue').length, 'modal element').to.equal(1);
                expect(find('#slack-settings .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            andThen(() => {
                server.put('/settings/', function (db, request) {
                    return new Mirage.Response(402, {}, {
                        errors: [
                            {
                                errorType: 'ValidationError',
                                message: 'Test error'
                            }
                        ]
                    });
                });
            });

            click('.gh-alert-blue .gh-alert-close');
            click('#sendTestNotification');

            // we shouldn't try to send the test request if the save fails
            andThen(() => {
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.url).to.not.match(/\/slack\/test/);
                expect(find('.gh-alert-blue').length, 'check slack alert after api validation error').to.equal(0);
            });
        });

    });
});
