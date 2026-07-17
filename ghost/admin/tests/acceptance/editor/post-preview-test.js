import loginAsRole from '../../helpers/login-as-role';
import {click, find, findAll} from '@ember/test-helpers';
import {disableLabsFlag, enableLabsFlag} from '../../helpers/labs-flag';
import {enableMailgun} from '../../helpers/mailgun';
import {enableMembers, enablePaidMembers} from '../../helpers/members';
import {expect} from 'chai';
import {selectChoose} from 'ember-power-select/test-support/helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Post preview', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures();
        enableMailgun(this.server);
        enableMembers(this.server);
        enablePaidMembers(this.server);
        enableLabsFlag(this.server, 'previewByTier');
        await loginAsRole('Administrator', this.server);
    });

    const openPreviewModal = async function () {
        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-preview"]');
    };

    it('uses correct member status for new tab preview link', async function () {
        const archivedTierName = 'Archived tier';
        this.server.create('tier', {name: archivedTierName, slug: 'archive', type: 'paid', active: false});
        await openPreviewModal.call(this);

        // ensure we're on the browser tab and "free" segment is selected
        expect(find('[data-test-button="browser-preview"]')).to.have.attribute('data-test-selected');
        expect(find('[data-test-select="preview-segment"]')).to.contain.text('Free member');

        // open the share dropdown
        await click('[data-test-button="share-preview"]');

        // check the preview link has the expected query param added
        let url = new URL(find('[data-test-link="open-draft"]').href);
        expect(url.searchParams.get('member_status')).to.equal('free');

        // changing segment should update the link
        await selectChoose('[data-test-select="preview-segment"]', 'Paid member');
        url = new URL(find('[data-test-link="open-draft"]').href);
        expect(url.searchParams.get('member_status')).to.equal('paid');

        // tier previews add a grouped tier selector and identify the selected tier
        await selectChoose('[data-test-select="preview-segment"]', 'Specific tier');
        expect(find('[data-test-select="preview-tier"]')).to.exist;

        await click('[data-test-select="preview-tier"] .ember-power-select-trigger');
        expect(findAll('.ember-power-select-group-name').map(element => element.textContent.trim())).to.deep.equal([
            'Active tiers',
            'Archived tiers'
        ]);
        await selectChoose('[data-test-select="preview-tier"]', archivedTierName);
        expect(find('[data-test-select="preview-tier"]')).to.contain.text(archivedTierName);

        url = new URL(find('[data-test-link="open-draft"]').href);
        expect(url.searchParams.get('member_status')).to.equal('paid');
        expect(url.searchParams.get('member_tier')).to.equal('archive');
    });

    it('hides the tier option without the previewByTier flag', async function () {
        disableLabsFlag(this.server, 'previewByTier');
        this.server.create('tier', {name: 'Archived tier', slug: 'archive', type: 'paid', active: false});
        await openPreviewModal.call(this);

        await click('[data-test-select="preview-segment"] .ember-power-select-trigger');
        const options = findAll('.ember-power-select-option').map(element => element.textContent.trim());
        expect(options).to.deep.equal(['Public visitor', 'Free member', 'Paid member']);
    });

    it('remembers the selected tier when the preview is reopened', async function () {
        const archivedTierName = 'Archived tier';
        this.server.create('tier', {name: archivedTierName, slug: 'archive', type: 'paid', active: false});
        await openPreviewModal.call(this);

        await selectChoose('[data-test-select="preview-segment"]', 'Specific tier');
        await selectChoose('[data-test-select="preview-tier"]', archivedTierName);

        await click('.gh-post-preview-close');
        await click('[data-test-button="publish-preview"]');

        // selections persist and the preview link is tier-aware immediately on reopen
        expect(find('[data-test-select="preview-segment"]')).to.contain.text('Specific tier');
        expect(find('[data-test-select="preview-tier"]')).to.contain.text(archivedTierName);

        await click('[data-test-button="share-preview"]');
        const url = new URL(find('[data-test-link="open-draft"]').href);
        expect(url.searchParams.get('member_status')).to.equal('paid');
        expect(url.searchParams.get('member_tier')).to.equal('archive');
    });
});
