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

        it('renders correctly', async function () {
            await visit('/settings/apps');

            // slack is not configured in the fixtures
            expect(
                find('[data-test-app="slack"] [data-test-app-status]').text().trim(),
                'slack app status'
            ).to.equal('Configure');

            // amp is enabled in the fixtures
            expect(
                find('[data-test-app="amp"] [data-test-app-status]').text().trim(),
                'amp app status'
            ).to.equal('Active');
        });

        it('it redirects to Slack when clicking on the grid', async function () {
            await visit('/settings/apps');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps');

            await click('[data-test-link="slack"]');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/slack');
        });

        it('it redirects to AMP when clicking on the grid', async function () {
            await visit('/settings/apps');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps');

            await click('[data-test-link="amp"]');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/amp');
        });

        it('it redirects to Unsplash when clicking on the grid', async function () {
            await visit('/settings/apps');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps');

            await click('[data-test-link="unsplash"]');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/apps/unsplash');
        });
    });
});
