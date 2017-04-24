/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import {expect} from 'chai';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import {invalidateSession, authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';

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
