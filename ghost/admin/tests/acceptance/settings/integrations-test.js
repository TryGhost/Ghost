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

describe('Acceptance: Settings - Integrations', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    describe('access permissions', function () {
        beforeEach(function () {
            server.create('integration', {name: 'Test'});
        });

        it('redirects /integrations/ to signin when not authenticated', async function () {
            invalidateSession(application);
            await visit('/settings/integrations');

            expect(currentURL(), 'currentURL').to.equal('/signin');
        });

        it('redirects /integrations/ to team page when authenticated as contributor', async function () {
            let role = server.create('role', {name: 'Contributor'});
            server.create('user', {roles: [role], slug: 'test-user'});

            authenticateSession(application);
            await visit('/settings/integrations');

            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });

        it('redirects /integrations/ to team page when authenticated as author', async function () {
            let role = server.create('role', {name: 'Author'});
            server.create('user', {roles: [role], slug: 'test-user'});

            authenticateSession(application);
            await visit('/settings/integrations');

            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });

        it('redirects /integrations/ to team page when authenticated as editor', async function () {
            let role = server.create('role', {name: 'Editor'});
            server.create('user', {roles: [role], slug: 'test-user'});

            authenticateSession(application);
            await visit('/settings/integrations/1');

            expect(currentURL(), 'currentURL').to.equal('/team');
        });

        it('redirects /integrations/:id/ to signin when not authenticated', async function () {
            invalidateSession(application);
            await visit('/settings/integrations/1');

            expect(currentURL(), 'currentURL').to.equal('/signin');
        });

        it('redirects /integrations/:id/ to team page when authenticated as contributor', async function () {
            let role = server.create('role', {name: 'Contributor'});
            server.create('user', {roles: [role], slug: 'test-user'});

            authenticateSession(application);
            await visit('/settings/integrations/1');

            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });

        it('redirects /integrations/:id/ to team page when authenticated as author', async function () {
            let role = server.create('role', {name: 'Author'});
            server.create('user', {roles: [role], slug: 'test-user'});

            authenticateSession(application);
            await visit('/settings/integrations/1');

            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });

        it('redirects /integrations/:id/ to team page when authenticated as editor', async function () {
            let role = server.create('role', {name: 'Editor'});
            server.create('user', {roles: [role], slug: 'test-user'});

            authenticateSession(application);
            await visit('/settings/integrations/1');

            expect(currentURL(), 'currentURL').to.equal('/team');
        });
    });

    describe('navigation', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('renders correctly', async function () {
            await visit('/settings/integrations');

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
            await visit('/settings/integrations');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations');

            await click('[data-test-link="slack"]');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/slack');
        });

        it('it redirects to AMP when clicking on the grid', async function () {
            await visit('/settings/integrations');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations');

            await click('[data-test-link="amp"]');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/amp');
        });

        it('it redirects to Unsplash when clicking on the grid', async function () {
            await visit('/settings/integrations');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations');

            await click('[data-test-link="unsplash"]');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/integrations/unsplash');
        });
    });

    describe('custom integrations', function () {
        beforeEach(function () {
            server.loadFixtures('configurations');
            let config = server.schema.configurations.first();
            config.update({
                enableDeveloperExperiments: true
            });

            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('handles 404', async function () {
            await visit('/settings/integrations/1');
            expect(currentPath()).to.equal('error404');
        });

        it('can add new integration', async function () {
            // sanity check
            expect(
                server.db.integrations.length,
                'number of integrations in db at start'
            ).to.equal(0);
            expect(
                server.db.apiKeys.length,
                'number of apiKeys in db at start'
            ).to.equal(0);

            // blank slate
            await visit('/settings/integrations');

            expect(
                find('[data-test-blank="custom-integrations"]'),
                'initial blank slate'
            ).to.exist;

            // new integration modal opens/closes
            await click('[data-test-button="new-integration"]');

            expect(currentURL(), 'url after clicking new').to.equal('/settings/integrations/new');
            expect(find('[data-test-modal="new-integration"]'), 'modal after clicking new').to.exist;

            await click('[data-test-button="cancel-new-integration"]');

            expect(find('[data-test-modal="new-integration"]'), 'modal after clicking cancel')
                .to.not.exist;

            expect(
                find('[data-test-blank="custom-integrations"]'),
                'blank slate after cancelled creation'
            ).to.exist;

            // new integration validations
            await click('[data-test-button="new-integration"]');
            await click('[data-test-button="create-integration"]');

            expect(
                find('[data-test-error="new-integration-name"]').text(),
                'name error after create with blank field'
            ).to.have.string('enter a name');

            await fillIn('[data-test-input="new-integration-name"]', 'Duplicate');
            await click('[data-test-button="create-integration"]');

            expect(
                find('[data-test-error="new-integration-name"]').text(),
                'name error after create with duplicate name'
            ).to.have.string('already been used');

            // successful creation
            await fillIn('[data-test-input="new-integration-name"]', 'Test');

            expect(
                find('[data-test-error="new-integration-name"]').text().trim(),
                'name error after typing in field'
            ).to.be.empty;

            await click('[data-test-button="create-integration"]');

            expect(
                find('[data-test-modal="new-integration"]'),
                'modal after successful create'
            ).to.not.exist;

            expect(
                server.db.integrations.length,
                'number of integrations in db after create'
            ).to.equal(1);
            // mirage sanity check
            expect(
                server.db.apiKeys.length,
                'number of api keys in db after create'
            ).to.equal(2);

            expect(
                currentURL(),
                'url after integration creation'
            ).to.equal('/settings/integrations/1');

            // test navigation back to list then back to new integration
            await click('[data-test-link="integrations-back"]');

            expect(
                currentURL(),
                'url after clicking "Back"'
            ).to.equal('/settings/integrations');

            expect(
                find('[data-test-blank="custom-integrations"]'),
                'blank slate after creation'
            ).to.not.exist;

            expect(
                find('[data-test-custom-integration]').length,
                'number of custom integrations after creation'
            ).to.equal(1);

            await click(`[data-test-integration="1"]`);

            expect(
                currentURL(),
                'url after clicking integration in list'
            ).to.equal('/settings/integrations/1');
        });

        it('can manage an integration', async function () {
            server.create('integration');

            await visit('/settings/integrations/1');

            expect(
                currentURL(),
                'initial URL'
            ).to.equal('/settings/integrations/1');

            expect(
                find('[data-test-screen-title]').text(),
                'screen title'
            ).to.have.string('Integration 1');

            // fields have expected values
            // TODO: add test for logo

            expect(
                find('[data-test-input="name"]').val(),
                'initial name value'
            ).to.equal('Integration 1');

            expect(
                find('[data-test-input="description"]').val(),
                'initial description value'
            ).to.equal('');

            expect(
                find('[data-test-input="content_key"]').val(),
                'content key input value'
            ).to.equal('integration-1_content_key-12345');

            expect(
                find('[data-test-input="admin_key"]').val(),
                'admin key input value'
            ).to.equal('integration-1_admin_key-12345');

            // it can modify integration fields and has validation

            expect(
                find('[data-test-error="name"]').text().trim(),
                'initial name error'
            ).to.be.empty;

            await fillIn('[data-test-input="name"]', '');
            await triggerEvent('[data-test-input="name"]', 'blur');

            expect(
                find('[data-test-error="name"]').text(),
                'name validation for blank string'
            ).to.have.string('enter a name');

            await click('[data-test-button="save"]');

            expect(
                server.schema.integrations.first().name,
                'db integration name after failed save'
            ).to.equal('Integration 1');

            await fillIn('[data-test-input="name"]', 'Test Integration');
            await triggerEvent('[data-test-input="name"]', 'blur');

            expect(
                find('[data-test-error="name"]').text().trim(),
                'name error after valid entry'
            ).to.be.empty;

            await fillIn('[data-test-input="description"]', 'Description for Test Integration');
            await triggerEvent('[data-test-input="description"]', 'blur');
            await click('[data-test-button="save"]');

            // changes are reflected in the integrations list

            await click('[data-test-link="integrations-back"]');

            expect(
                currentURL(),
                'url after saving and clicking "back"'
            ).to.equal('/settings/integrations');

            expect(
                find('[data-test-integration="1"] [data-test-text="name"]').text().trim(),
                'integration name after save'
            ).to.equal('Test Integration');

            expect(
                find('[data-test-integration="1"] [data-test-text="description"]').text().trim(),
                'integration description after save'
            ).to.equal('Description for Test Integration');

            await click('[data-test-integration="1"]');

            // warns of unsaved changes when leaving

            await fillIn('[data-test-input="name"]', 'Unsaved test');
            await click('[data-test-link="integrations-back"]');

            expect(
                find('[data-modal="unsaved-settings"]'),
                'modal shown when navigating with unsaved changes'
            ).to.exist;

            await click('[data-test-stay-button]');

            expect(
                find('[data-modal="unsaved-settings"]'),
                'modal is closed after clicking "stay"'
            ).to.not.exist;

            expect(
                currentURL(),
                'url after clicking "stay"'
            ).to.equal('/settings/integrations/1');

            await click('[data-test-link="integrations-back"]');
            await click('[data-test-leave-button]');

            expect(
                find('[data-modal="unsaved-settings"]'),
                'modal is closed after clicking "leave"'
            ).to.not.exist;

            expect(
                currentURL(),
                'url after clicking "leave"'
            ).to.equal('/settings/integrations');

            expect(
                find('[data-test-integration="1"] [data-test-text="name"]').text().trim(),
                'integration name after leaving unsaved changes'
            ).to.equal('Test Integration');
        });

        it('can manage an integration\'s webhooks', async function () {
            server.create('integration');

            await visit('/settings/integrations/1');

            expect(find('[data-test-webhooks-blank-slate]').length).to.equal(1);

            // open new webhook modal
            await click('[data-test-link="add-webhook"]');
            expect(find('[data-test-modal="webhook-form"]').length).to.equal(1);
            expect(find('[data-test-modal="webhook-form"] [data-test-text="title"]').text())
                .to.have.string('New webhook');

            // can cancel new webhook
            await click('[data-test-button="cancel-webhook"]');
            expect(find('[data-test-modal="webhook-form"]').length).to.equal(0);

            // create new webhook
            await click('[data-test-link="add-webhook"]');
            await fillIn('[data-test-input="webhook-name"]', 'First webhook');
            await fillIn('[data-test-select="webhook-event"]', 'site.changed');
            await fillIn('[data-test-input="webhook-targetUrl"]', 'https://example.com/first-webhook');
            await click('[data-test-button="save-webhook"]');

            // modal closed and 1 webhook listed with correct details
            expect(find('[data-test-modal="webhook-form"]').length).to.equal(0);
            expect(find('[data-test-webhook-row]').length).to.equal(1);
            let row = find('[data-test-webhook-row="1"]');
            expect(row.find('[data-test-text="name"]').text())
                .to.have.string('First webhook');
            expect(row.find('[data-test-text="event"]').text())
                .to.have.string('Site Changed (rebuild)');
            expect(row.find('[data-test-text="targetUrl"]').text())
                .to.have.string('https://example.com/first-webhook');
            expect(row.find('[data-test-text="last-triggered"]').text())
                .to.have.string('Not triggered');

            // click edit webhook link
            await click('[data-test-webhook-row="1"] [data-test-link="edit-webhook"]');

            // modal appears and has correct title
            expect(find('[data-test-modal="webhook-form"]').length).to.equal(1);
            expect(find('[data-test-modal="webhook-form"] [data-test-text="title"]').text())
                .to.have.string('Edit webhook');
        });

        // test to ensure the `value=description` passed to `gh-text-input` is `readonly`
        it('doesn\'t show unsaved changes modal after placing focus on description field', async function () {
            server.create('integration');

            await visit('/settings/integrations/1');
            await click('[data-test-input="description"]');
            await triggerEvent('[data-test-input="description"]', 'blur');
            await click('[data-test-link="integrations-back"]');

            expect(
                find('[data-modal="unsaved-settings"]'),
                'unsaved changes modal is not shown'
            ).to.not.exist;

            expect(currentURL()).to.equal('/settings/integrations');
        });
    });
});
