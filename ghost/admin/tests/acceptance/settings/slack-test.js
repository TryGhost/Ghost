/* jshint expr:true */
import Mirage from 'ember-cli-mirage';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../../helpers/destroy-app';
import startApp from '../../helpers/start-app';
import testSelector from 'ember-test-selectors';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Settings - Apps - Slack', function () {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/apps/slack');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps/slack');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps/slack');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('it validates and saves a slack url properly', async function () {
            await visit('/settings/apps/slack');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/slack');

            await fillIn('#slack-settings input[name="slack[url]"]', 'notacorrecturl');
            await click(testSelector('save-button'));

            expect(find('#slack-settings .error .response').text().trim(), 'inline validation response')
                .to.equal('The URL must be in a format like https://hooks.slack.com/services/<your personal key>');

            // CMD-S shortcut works
            await fillIn(testSelector('slack-url-input'), 'https://hooks.slack.com/services/1275958430');
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [newRequest] = server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(newRequest.requestBody);
            let [result] = JSON.parse(params.settings.findBy('key', 'slack').value);

            expect(result.url).to.equal('https://hooks.slack.com/services/1275958430');
            expect(find('#slack-settings .error .response').text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn('#slack-settings input[name="slack[url]"]', 'https://hooks.slack.com/services/1275958430');
            await click(testSelector('send-notification-button'));

            expect(find('.gh-alert-blue').length, 'modal element').to.equal(1);
            expect(find('#slack-settings .error .response').text().trim(), 'inline validation response')
                .to.equal('');

            server.put('/settings/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [
                        {
                            errorType: 'ValidationError',
                            message: 'Test error'
                        }
                    ]
                });
            });

            await click('.gh-alert-blue .gh-alert-close');
            await click(testSelector('send-notification-button'));

            // we shouldn't try to send the test request if the save fails
            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.url).to.not.match(/\/slack\/test/);
            expect(find('.gh-alert-blue').length, 'check slack alert after api validation error').to.equal(0);
        });
    });
});
