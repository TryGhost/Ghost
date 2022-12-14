import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {blur, click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Membership', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
    });

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('tiers');

        this.server.db.configs.update(1, {blogUrl: 'http://localhost:2368'});

        const role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    describe('permissions', function () {
        let visitAs;

        before(function () {
            visitAs = async (roleName) => {
                const role = this.server.create('role', {name: roleName});
                this.server.create('user', {roles: [role]});
                await authenticateSession();
                await visit('/settings/members');
            };
        });

        beforeEach(async function () {
            this.server.db.users.remove();
            await invalidateSession();
        });

        it('allows Owners', async function () {
            await visitAs('Owner');
            expect(currentURL()).to.equal('/settings/members');
        });

        it('allows Administrators', async function () {
            await visitAs('Administrator');
            expect(currentURL()).to.equal('/settings/members');
        });

        it('disallows Editors', async function () {
            await visitAs('Editor');
            expect(currentURL()).to.not.equal('/settings/members');
        });

        it('disallows Authors', async function () {
            await visitAs('Author');
            expect(currentURL()).to.not.equal('/settings/members');
        });

        it('disallows Contributors', async function () {
            await visitAs('Contributor');
            expect(currentURL()).to.not.equal('/settings/members');
        });
    });

    it('can change subscription access', async function () {
        await visit('/settings/members');

        expect(this.server.db.settings.findBy({key: 'members_signup_access'}).value).to.equal('all');
        expect(find('[data-test-members-subscription-option="all"]'), 'initial selection is "all"').to.exist;
        expect(find('[data-test-iframe="portal-preview"]'), 'initial preview src matches "all"')
            .to.have.attribute('src').match(/membersSignupAccess=all/);

        // open dropdown
        await click('[data-test-members-subscription-option="all"]');

        // all settings exist in dropdown
        expect(find('.ember-power-select-options [data-test-members-subscription-option="all"]'), 'all option').to.exist;
        expect(find('.ember-power-select-options [data-test-members-subscription-option="invite"]'), 'invite option').to.exist;
        expect(find('.ember-power-select-options [data-test-members-subscription-option="none"]'), 'none option').to.exist;

        // switch to invite
        await click('.ember-power-select-options [data-test-members-subscription-option="invite"]');

        expect(find('.ember-power-select-options'), 'dropdown closes').to.not.exist;
        expect(find('[data-test-members-subscription-option="invite"]'), 'invite option shown after selected').to.exist;
        expect(find('[data-test-iframe="portal-preview"]'))
            .to.have.attribute('src').match(/membersSignupAccess=invite/);

        await click('[data-test-button="save-settings"]');

        expect(this.server.db.settings.findBy({key: 'members_signup_access'}).value).to.equal('invite');

        // switch to nobody
        await click('[data-test-members-subscription-option="invite"]');
        await click('.ember-power-select-options [data-test-members-subscription-option="none"]');

        expect(find('.ember-power-select-options'), 'dropdown closes').to.not.exist;
        expect(find('[data-test-members-subscription-option="none"]'), 'none option shown after selected').to.exist;
        expect(find('[data-test-iframe="portal-preview"]')).to.not.exist;
        expect(find('[data-test-portal-preview-disabled]')).to.exist;

        expect(find('[data-test-default-post-access] .ember-basic-dropdown-trigger')).to.have.attribute('aria-disabled', 'true');

        await click('[data-test-button="save-settings"]');

        expect(this.server.db.settings.findBy({key: 'members_signup_access'}).value).to.equal('none');

        // automatically saves when switching back off nobody
        await click('[data-test-members-subscription-option="none"]');
        await click('.ember-power-select-options [data-test-members-subscription-option="invite"]');
        expect(this.server.db.settings.findBy({key: 'members_signup_access'}).value).to.equal('invite');
    });

    it('can change default post access', async function () {
        await visit('/settings/members');

        // fixtures match what we expect
        expect(this.server.db.settings.findBy({key: 'default_content_visibility'}).value).to.equal('public');
        expect(this.server.db.settings.findBy({key: 'default_content_visibility_tiers'}).value).to.equal('[]');

        expect(find('[data-test-default-post-access-option="public"]'), 'initial selection is "public"').to.exist;
        expect(find('[data-test-default-post-access-tiers]')).to.not.exist;

        // open dropdown
        await click('[data-test-default-post-access-option="public"]');

        // all settings exist in dropdown
        expect(find('.ember-power-select-options [data-test-default-post-access-option="public"]'), 'public option').to.exist;
        expect(find('.ember-power-select-options [data-test-default-post-access-option="members"]'), 'members-only option').to.exist;
        expect(find('.ember-power-select-options [data-test-default-post-access-option="paid"]'), 'paid-only option').to.exist;
        expect(find('.ember-power-select-options [data-test-default-post-access-option="tiers"]'), 'specific tiers option').to.exist;

        // switch to members only
        await click('.ember-power-select-options [data-test-default-post-access-option="members"]');
        await click('[data-test-button="save-settings"]');

        expect(this.server.db.settings.findBy({key: 'default_content_visibility'}).value).to.equal('members');
        expect(this.server.db.settings.findBy({key: 'default_content_visibility_tiers'}).value).to.equal('[]');

        expect(find('[data-test-default-post-access-option="members"]'), 'post-members selection is "members"').to.exist;
        expect(find('[data-test-default-post-access-tiers]')).to.not.exist;

        // can switch to specific tiers
        await click('[data-test-default-post-access-option="members"]');
        await click('.ember-power-select-options [data-test-default-post-access-option="tiers"]');

        // tiers input is shown
        expect(find('[data-test-default-post-access-tiers]')).to.exist;

        // open tiers dropdown
        await click('[data-test-default-post-access-tiers] .ember-basic-dropdown-trigger');

        // paid tiers are available in tiers input
        expect(find('[data-test-default-post-access-tiers] [data-test-visibility-segment-option="Default Tier"]')).to.exist;

        // select tier
        await click('[data-test-default-post-access-tiers] [data-test-visibility-segment-option="Default Tier"]');

        // save
        await click('[data-test-button="save-settings"]');
        expect(this.server.db.settings.findBy({key: 'default_content_visibility'}).value).to.equal('tiers');
        expect(this.server.db.settings.findBy({key: 'default_content_visibility_tiers'}).value).to.equal('["2"]');

        // switch back to non-tiers option
        await click('[data-test-default-post-access-option="tiers"]');
        await click('.ember-power-select-options [data-test-default-post-access-option="paid"]');

        expect(find('[data-test-default-post-access-tiers]')).to.not.exist;

        await click('[data-test-button="save-settings"]');
        expect(this.server.db.settings.findBy({key: 'default_content_visibility'}).value).to.equal('paid');
        expect(this.server.db.settings.findBy({key: 'default_content_visibility_tiers'}).value).to.equal('["2"]');
    });

    it('can manage free tier', async function () {
        await visit('/settings/members');
        await click('[data-test-button="toggle-free-settings"]');
        expect(find('[data-test-free-settings-expanded]'), 'expanded free settings').to.exist;

        // we aren't viewing the non-labs-flag input
        expect(find('[data-test-input="old-free-welcome-page"]')).to.not.exist;

        // it can set free signup welcome page

        // initial value
        expect(find('[data-test-input="free-welcome-page"]')).to.exist;
        expect(find('[data-test-input="free-welcome-page"]')).to.have.value('');

        // saving
        await fillIn('[data-test-input="free-welcome-page"]', 'not a url');
        await blur('[data-test-input="free-welcome-page"]');
        await click('[data-test-button="save-settings"]');

        expect(this.server.db.tiers.findBy({slug: 'free'}).welcomePageUrl)
            .to.equal('/not%20a%20url');

        // re-rendering will insert full URL in welcome page input
        await visit('/settings');
        await visit('/settings/members');

        expect(find('[data-test-input="free-welcome-page"]')).to.exist;
        expect(find('[data-test-input="free-welcome-page"]'))
            .to.have.value('http://localhost:2368/not%20a%20url');

        // it can manage free tier description and benefits

        // initial free tier details are as expected
        expect(find('[data-test-tier-card="free"]')).to.exist;
        expect(find('[data-test-tier-card="free"] [data-test-name]')).to.contain.text('Free');
        expect(find('[data-test-tier-card="free"] [data-test-description]')).to.contain.text('No description');
        expect(find('[data-test-tier-card="free"] [data-test-benefits]')).to.contain.text('No benefits');
        expect(find('[data-test-tier-card="free"] [data-test-free-price]')).to.exist;

        // open modal
        await click('[data-test-tier-card="free"] [data-test-button="edit-tier"]');

        // initial modal state is as expected
        const modal = '[data-test-modal="edit-tier"]';
        expect(find(modal)).to.exist;
        expect(find(`${modal} [data-test-input="tier-name"]`)).to.not.exist;
        expect(find(`${modal} [data-test-input="tier-description"]`)).to.not.exist;
        expect(find(`${modal} [data-test-input="free-tier-description"]`)).to.exist;
        expect(find(`${modal} [data-test-input="free-tier-description"]`)).to.have.value('');
        expect(find(`${modal} [data-test-formgroup="prices"]`)).to.not.exist;
        expect(find(`${modal} [data-test-benefit-item="new"]`)).to.exist;
        expect(findAll(`${modal} [data-test-benefit-item]`).length).to.equal(1);

        expect(find(`${modal} [data-test-tierpreview-title]`)).to.contain.text('Free Membership Preview');
        expect(find(`${modal} [data-test-tierpreview-description]`)).to.contain.text('Free preview of');
        expect(find(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('Access to all public posts');
        expect(find(`${modal} [data-test-tierpreview-price]`).textContent).to.match(/\$\s+0/);

        // can change description
        await fillIn(`${modal} [data-test-input="free-tier-description"]`, 'Test description');
        expect(find(`${modal} [data-test-tierpreview-description]`)).to.contain.text('Test description');

        // can manage benefits
        const newBenefit = `${modal} [data-test-benefit-item="new"]`;
        await fillIn(`${newBenefit} [data-test-input="benefit-label"]`, 'First benefit');
        await click(`${newBenefit} [data-test-button="add-benefit"]`);

        expect(find(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('First benefit');

        expect(find(`${modal} [data-test-benefit-item="0"]`)).to.exist;
        expect(find(`${modal} [data-test-benefit-item="new"]`)).to.exist;

        await click(`${newBenefit} [data-test-button="add-benefit"]`);
        expect(find(`${newBenefit}`)).to.contain.text('Please enter a benefit');

        await fillIn(`${newBenefit} [data-test-input="benefit-label"]`, 'Second benefit');
        await click(`${newBenefit} [data-test-button="add-benefit"]`);

        expect(find(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('Second benefit');
        expect(findAll(`${modal} [data-test-tierpreview-benefits] div`).length).to.equal(4);

        await click(`${modal} [data-test-benefit-item="0"] [data-test-button="delete-benefit"]`);

        expect(find(`${modal} [data-test-tierpreview-benefits]`)).to.not.contain.text('First benefit');
        expect(findAll(`${modal} [data-test-tierpreview-benefits] div`).length).to.equal(2);

        // Add a new benefit that we will later rename to an empty name
        await fillIn(`${newBenefit} [data-test-input="benefit-label"]`, 'Third benefit');
        await click(`${newBenefit} [data-test-button="add-benefit"]`);

        expect(find(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('Third benefit');
        expect(findAll(`${modal} [data-test-tierpreview-benefits] div`).length).to.equal(4);

        // Clear the second benefit's name (it should get removed after saving)
        const secondBenefitItem = `${modal} [data-test-benefit-item="1"]`;
        await fillIn(`${secondBenefitItem} [data-test-input="benefit-label"]`, '');

        await click('[data-test-button="save-tier"]');

        expect(find(`${modal}`)).to.not.exist;
        expect(find('[data-test-tier-card="free"] [data-test-name]')).to.contain.text('Free');
        expect(find('[data-test-tier-card="free"] [data-test-description]')).to.contain.text('Test description');
        expect(find('[data-test-tier-card="free"] [data-test-benefits]')).to.contain.text('Benefits (1)');
        expect(find('[data-test-tier-card="free"] [data-test-benefits] li:nth-of-type(1)')).to.contain.text('Second benefit');
        expect(findAll(`[data-test-tier-card="free"] [data-test-benefits] li`).length).to.equal(1);

        const freeTier = this.server.db.tiers.findBy({slug: 'free'});
        expect(freeTier.description).to.equal('Test description');
        expect(freeTier.welcomePageUrl).to.equal('/not%20a%20url');
        expect(freeTier.benefits.length).to.equal(1);
        expect(freeTier.benefits[0]).to.equal('Second benefit');
    });
});
