/* jshint expr:true */
import Mirage from 'ember-cli-mirage';
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

        it('it validates and saves an application id properly', async function () {
            server.get('/configuration/private', function () {
                return new Mirage.Response(200, {}, {
                    configuration: {
                        unsplashAPI: ''
                    }
                });
            });

            await visit('/settings/apps/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/unsplash');

            // without application id provided via config
            expect(find('[data-test-input="unsplash"]').text().trim(), 'default application id value')
                .to.equal('');

            expect(find('[data-test-checkbox="unsplash"]').prop('checked'), 'isActive checkbox').to.be.false;

            await click(find('[data-test-checkbox="unsplash"]'), 'enable without application id');

            expect(find('[data-test-checkbox="unsplash"]').prop('checked'), 'isActive checkbox').to.be.true;

            expect(find('#unsplash-toggle .error .response').text().trim(), 'inline validation checkbox')
                .to.equal('You need to enter an Application ID before enabling it');

            await fillIn('[data-test-input="unsplash"]', '345 456 567 ');

            expect(find('#unsplash-toggle .error .response').text().trim(), 'inline validation checkbox')
                .to.equal('');

            await click('[data-test-save-button]');

            // application id validation
            expect(find('#unsplash-settings .error .response').text().trim(), 'inline validation response')
                .to.equal('Please enter a valid Application Id for Unsplash');

            // doesn't save when errors
            expect(find('[data-test-save-button]').text().trim(), 'task button saved response')
                .to.equal('Retry');

            // CMD-S shortcut works
            await fillIn('[data-test-input="unsplash"]', '123456789012345678901234567890');
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [firstRequest] = server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(firstRequest.requestBody);
            let result = JSON.parse(params.settings.findBy('key', 'unsplash').value);

            expect(result.applicationId).to.equal('123456789012345678901234567890');
            expect(find('#unsplash-settings .error .response').text().trim(), 'inline validation response')
                .to.equal('');

            server.get('https://api.unsplash.com/photos/random', function () {
                return new Mirage.Response(401, {}, {
                    errors: ['OAuth error: The access token is invalid']
                });
            });

            // Test invalid application id
            await fillIn('[data-test-input="unsplash"]', '098765432109876543210987654321');
            await click('[data-test-button="send-request"]');

            expect(find('[data-test-button="send-request"]').text().trim(), 'test request button validation response')
                .to.equal('Invalid Application Id');

            expect(find('.gh-alert-red .gh-alert-content').text().trim(), 'server response')
                .to.equal('OAuth error: The access token is invalid');

            let [secondRequest] = server.pretender.handledRequests.slice(-1);

            // Result shouldn't be saved
            expect(secondRequest.requestBody).to.equal(null);
            expect(secondRequest.url).to.equal('https://api.unsplash.com/photos/random');

            server.get('https://api.unsplash.com/photos/random', function () {
                return new Mirage.Response(200);
            });

            // Test valid application id
            await fillIn('[data-test-input="unsplash"]', '098765432109876543210987654321');
            await click('[data-test-button="send-request"]');

            expect(find('[data-test-button="send-request"]').text().trim(), 'test request button validation response')
                .to.equal('Valid Application ID');

            // saves settings when valid application id
            expect(find('[data-test-save-button]').text().trim(), 'task button saved response')
                .to.equal('Saved');

            let [thirdRequest] = server.pretender.handledRequests.slice(-1);
            params = JSON.parse(thirdRequest.requestBody);
            result = JSON.parse(params.settings.findBy('key', 'unsplash').value);

            // Result should be saved
            expect(result.applicationId).to.equal('098765432109876543210987654321');
        });

        it('does not render application id input when config provides it', async function () {
            server.get('/configuration/private', function () {
                return new Mirage.Response(200, {}, {
                    configuration: [{
                        unsplashAPI: {
                            applicationId: '12345678923456789'
                        }
                    }]
                });
            });

            await visit('/settings/apps/unsplash');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/unsplash');

            // without application id provided via config
            expect(find('[data-test-input="unsplash"]').length, 'no application id input')
                .to.equal(0);
        });
    });
});
