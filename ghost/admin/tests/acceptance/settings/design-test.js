import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Design', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {roles: [role]});

        this.server.loadFixtures('themes');

        return await authenticateSession();
    });

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('renders with no custom theme settings', async function () {
        await visit('/settings');
        await click('[data-test-nav="design"]');

        expect(currentURL(), 'currentURL').to.equal('/settings/design');
        expect(document.title, 'page title').to.equal('Settings - Design - Test Blog');

        // side nav menu changes
        expect(find('[data-test-nav-menu="design"]'), 'design menu').to.exist;
        expect(find('[data-test-nav-menu="main"]'), 'main menu').to.not.exist;

        // side nav defaults to general group open
        expect(find('[data-test-nav-toggle="general"]'), 'general toggle').to.exist;
        expect(find('[data-test-nav-group="general"]'), 'general form').to.exist;

        // no other side nav groups exist
        expect(findAll('[data-test-nav-toggle]'), 'no of group toggles').to.have.lengthOf(1);
        expect(findAll('[data-test-nav-group]'), 'no of groups open').to.have.lengthOf(1);

        // current theme is shown in nav menu
        expect(find('[data-test-text="current-theme"]')).to.contain.text('casper - v1.0');

        // defaults to "home" desktop preview
        expect(find('[data-test-button="desktop-preview"]')).to.have.class('gh-btn-group-selected');
        expect(find('[data-test-button="mobile-preview"]')).to.not.have.class('gh-btn-group-selected');
    });

    it('has unsaved-changes confirmation', async function () {
        await visit('/settings/design');
        await fillIn('[data-test-input="siteDescription"]', 'Changed');
        await click('[data-test-link="back-to-settings"]');

        expect(find('[data-test-modal="unsaved-settings"]')).to.exist;

        await click('[data-test-modal="unsaved-settings"] [data-test-button="close"]');

        expect(currentURL()).to.equal('/settings/design');

        await click('[data-test-link="back-to-settings"]');
        await click('[data-test-modal="unsaved-settings"] [data-test-leave-button]');

        expect(currentURL()).to.equal('/settings');

        await click('[data-test-nav="design"]');

        expect(find('[data-test-input="siteDescription"]')).to.not.have.value('Changed');
    });

    it('renders with custom theme settings');

    it('can install an official theme', async function () {
        await visit('/settings/design');
        await click('[data-test-nav="change-theme"]');
        expect(currentURL(), 'currentURL').to.equal('/settings/design/change-theme');

        await click('[data-test-theme-link="Journal"]');
        expect(currentURL(), 'currentURL').to.equal('/settings/design/change-theme/Journal');

        await click('[data-test-button="install-theme"]');
        expect(find('[data-test-modal="install-theme"]'), 'install-theme modal').to.exist;
        expect(find('[data-test-state="confirm"]'), 'confirm state').to.exist;
        expect(findAll('[data-test-state]').length, 'state count').to.equal(1);

        await click('[data-test-button="confirm-install"]');
        expect(find('[data-test-state="installed-no-notes"]'), 'success state').to.exist;
        expect(findAll('[data-test-state]').length, 'state count').to.equal(1);

        // navigates back to design screen in background
        expect(currentURL(), 'currentURL').to.equal('/settings/design');

        await click('[data-test-button="cancel"]');
        expect(find('[data-test-modal="install-theme"]')).to.not.exist;

        // nav menu shows current theme
        expect(find('[data-test-text="current-theme"]')).to.contain.text('Journal - v0.1');
    });

    it('can upload custom theme', async function () {
        this.server.post('/themes/upload/', function ({themes}) {
            const theme = themes.create({
                name: 'custom',
                package: {
                    name: 'Custom',
                    version: '1.0'
                }
            });

            return {themes: [theme]};
        });

        await visit('/settings/design/change-theme');
        await click('[data-test-button="upload-theme"]');

        expect(find('[data-test-modal="upload-theme"]'), 'upload-theme modal').to.exist;

        await fileUpload('[data-test-modal="upload-theme"] input[type="file"]', ['test'], {name: 'valid-theme.zip', type: 'application/zip'});

        expect(find('[data-test-state="installed-no-notes"]'), 'success state').to.exist;
        expect(currentURL(), 'url after upload').to.equal('/settings/design/change-theme');

        await click('[data-test-button="activate"]');

        expect(currentURL(), 'url after activate').to.equal('/settings/design');
        expect(find('[data-test-modal="install-theme"]')).to.not.exist;
        expect(find('[data-test-text="current-theme"]')).to.contain.text('custom - v1.0');
    });

    it('can change between installed themes');
    it('can delete installed theme');

    describe('limits', function () {
        it('displays upgrade notice when custom themes are not allowed', async function () {
            this.server.loadFixtures('configs');
            const config = this.server.db.configs.find(1);
            config.hostSettings = {
                limits: {
                    customThemes: {
                        allowlist: ['casper', 'dawn', 'lyra'],
                        error: 'All our official built-in themes are available the Starter plan, if you upgrade to one of our higher tiers you will also be able to edit and upload custom themes for your site.'
                    }
                }
            };
            this.server.db.configs.update(1, config);

            await visit('/settings/design/change-theme');
            await click('[data-test-button="upload-theme"]');

            expect(find('[data-test-modal="limits/custom-theme"]'), 'limits/custom-theme modal').to.exist;
        });
    });
});
