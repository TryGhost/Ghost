import loginAsRole from '../../helpers/login-as-role';
import {click, find} from '@ember/test-helpers';
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
        await loginAsRole('Administrator', this.server);
    });

    const openPreviewModal = async function () {
        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-preview"]');
    };

    it('uses correct member status for new tab preview link', async function () {
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
    });
});