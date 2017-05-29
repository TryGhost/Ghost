/* jshint expr:true */
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

describe('Acceptance: Settings - Apps', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/apps');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/apps');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('it redirects to Slack when clicking on the grid', async function () {
            await visit('/settings/apps');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps');

            await click('#slack-link');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/slack');
        });
        it('it redirects to AMP when clicking on the grid', async function () {
            await visit('/settings/apps');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps');

            await click('#amp-link');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/amp');
        });
    });
});
