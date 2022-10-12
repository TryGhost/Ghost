import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {Response} from 'miragejs';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll, triggerEvent} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Integrations - Slack', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/integrations/slack');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/integrations/slack');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('redirects to home page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/integrations/slack');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    it('redirects to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/integrations/slack');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it validates and saves slack settings properly', async function () {
            await visit('/settings/integrations/slack');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/slack');

            await fillIn('[data-test-slack-url-input]', 'notacorrecturl');
            await click('[data-test-save-button]');

            expect(find('[data-test-error="slack-url"]').textContent.trim(), 'inline validation response')
                .to.equal('The URL must be in a format like https://hooks.slack.com/services/<your personal key>');

            // CMD-S shortcut works
            await fillIn('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
            await fillIn('[data-test-slack-username-input]', 'SlackBot');
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [newRequest] = this.server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(newRequest.requestBody);

            let urlResult = params.settings.findBy('key', 'slack_url').value;
            let usernameResult = params.settings.findBy('key', 'slack_username').value;

            expect(urlResult).to.equal('https://hooks.slack.com/services/1275958430');
            expect(usernameResult).to.equal('SlackBot');
            expect(find('[data-test-error="slack-url"]'), 'inline validation response')
                .to.not.exist;

            await fillIn('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
            await click('[data-test-send-notification-button]');

            expect(findAll('.gh-notification').length, 'number of notifications').to.equal(1);
            expect(find('[data-test-error="slack-url"]'), 'inline validation response')
                .to.not.exist;

            // modify model data or there will be no api call
            await fillIn('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958431');

            this.server.put('/settings/', function () {
                return new Response(422, {}, {
                    errors: [
                        {
                            type: 'ValidationError',
                            message: 'Test error'
                        }
                    ]
                });
            });

            await click('.gh-notification .gh-notification-close');
            await click('[data-test-send-notification-button]');

            // we shouldn't try to send the test request if the save fails
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.url).to.not.match(/\/slack\/test/);
            expect(findAll('.gh-notification').length, 'check slack notification after api validation error').to.equal(0);
        });

        it('warns when leaving without saving', async function () {
            await visit('/settings/integrations/slack');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/slack');

            await fillIn('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
            await blur('[data-test-slack-url-input]');

            await visit('/settings');

            expect(findAll('[data-test-modal="unsaved-settings"]').length, 'modal exists').to.equal(1);

            // Leave without saving
            await click('[data-test-modal="unsaved-settings"] [data-test-leave-button]');

            expect(currentURL(), 'currentURL').to.equal('/settings');

            await visit('/settings/integrations/slack');

            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/slack');

            // settings were not saved
            expect(
                find('[data-test-slack-url-input]').textContent.trim(),
                'Slack Webhook URL'
            ).to.equal('');
        });
    });
});
