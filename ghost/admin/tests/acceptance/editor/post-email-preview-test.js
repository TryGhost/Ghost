import loginAsRole from '../../helpers/login-as-role';
import {click, find, findAll, focus, waitFor, waitUntil} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {disableLabsFlag, enableLabsFlag} from '../../helpers/labs-flag';
import {disableMembers, disablePaidMembers, enableMembers, enablePaidMembers} from '../../helpers/members';
import {enableMailgun} from '../../helpers/mailgun';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Post email preview', function () {
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

    const openEmailPreviewModal = async function () {
        await openPreviewModal.call(this);
        await click('[data-test-button="email-preview"]');
    };

    it('hides email preview option when members is disabled', async function () {
        disableMembers(this.server);
        await openPreviewModal.call(this);

        expect(find('[data-test-button="email-preview"]')).not.to.exist;
    });

    it('can select newsletter for preview', async function () {
        this.server.create('newsletter', {
            name: 'Awesome newsletter',
            slug: 'awesome-newsletter',
            sender_email: 'awesome@example.com'
        });

        await openEmailPreviewModal.call(this);

        expect(find('[data-test-email-preview-newsletter-select]'), 'newsletter dropdown').to.exist;

        // check newsletters options
        await clickTrigger('[data-test-email-preview-newsletter-select-section]');

        const options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(2);
        expect(options[0]).to.have.rendered.text('Default newsletter <noreply@example.com>');
        expect(options[1]).to.have.rendered.text('Awesome newsletter <awesome@example.com>');

        await selectChoose('[data-test-email-preview-newsletter-select]', 'Awesome newsletter');

        // send chosen newsletter type on backend
        await click(find('[data-test-button="post-preview-test-email"]'));
        await click(find('[data-test-button="send-test-email"]'));
        const [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        const requestBody = JSON.parse(lastRequest.requestBody);
        expect(requestBody.newsletter).to.equal('awesome-newsletter');
        expect(requestBody.member_status).to.equal('free');
    });

    it('should hide newsletters list when only 1 newsletter exists', async function () {
        await openEmailPreviewModal.call(this);

        // newsletter select should not be present
        expect(find('[data-test-email-preview-newsletter-select]')).not.to.exist;

        // single newsletter name and from address should be present
        expect(find('[data-test-text="newsletter-from"]')).to.contain.rendered.text('Default newsletter');
        expect(find('[data-test-text="newsletter-from"]')).to.contain.rendered.text('noreply@example.com');
    });

    it('can select free, paid, or tier member for preview', async function () {
        this.server.create('tier', {name: 'Archive', slug: 'archive', type: 'paid', active: false});
        await openEmailPreviewModal.call(this);

        expect(find('[data-test-email-preview-newsletter-select]'), 'newsletter select').not.to.exist;
        expect(find('[data-test-select="preview-segment"]'), 'segment select').to.exist;

        // check segments options
        await clickTrigger('[data-test-select="preview-segment"]');

        const options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(3);
        expect(options[0].textContent.trim()).to.equal('Free member');
        expect(options[1].textContent.trim()).to.equal('Paid member');
        expect(options[2].textContent.trim()).to.equal('Specific tier');

        // can switch free/paid member in preview
        await selectChoose('[data-test-select="preview-segment"]', 'Paid member');

        // send chosen segment on backend
        await click(find('[data-test-button="post-preview-test-email"]'));
        await click(find('[data-test-button="send-test-email"]'));
        const [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        const requestBody = JSON.parse(lastRequest.requestBody);
        expect(requestBody.member_status).to.equal('paid');
        expect(requestBody.member_tier).to.be.undefined;

        // selecting a specific tier sends the paid audience narrowed to that tier
        await selectChoose('[data-test-select="preview-segment"]', 'Specific tier');
        await selectChoose('[data-test-select="preview-tier"]', 'Archive');
        await click(find('[data-test-button="post-preview-test-email"]'));
        await click(find('[data-test-button="send-test-email"]'));
        const [tierRequest] = this.server.pretender.handledRequests.slice(-1);
        const tierRequestBody = JSON.parse(tierRequest.requestBody);
        expect(tierRequestBody.member_status).to.equal('paid');
        expect(tierRequestBody.member_tier).to.equal('archive');
    });

    it('sends the legacy memberSegment param and hides tiers without the previewByTier flag', async function () {
        disableLabsFlag(this.server, 'previewByTier');
        this.server.create('tier', {name: 'Archive', slug: 'archive', type: 'paid', active: false});

        await openEmailPreviewModal.call(this);

        // no Tier option without the flag
        await clickTrigger('[data-test-select="preview-segment"]');
        const options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(2);
        expect(options[0].textContent.trim()).to.equal('Free member');
        expect(options[1].textContent.trim()).to.equal('Paid member');

        // older backends only understand memberSegment
        await selectChoose('[data-test-select="preview-segment"]', 'Paid member');
        await click(find('[data-test-button="post-preview-test-email"]'));
        await click(find('[data-test-button="send-test-email"]'));
        const [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        const requestBody = JSON.parse(lastRequest.requestBody);
        expect(requestBody.memberSegment).to.equal('status:-free');
        expect(requestBody.member_status).to.be.undefined;
        expect(requestBody.member_tier).to.be.undefined;
    });

    it('hides segment dropdown when only one option is available', async function () {
        disablePaidMembers(this.server);

        await openEmailPreviewModal.call(this);

        // segment dropdown should be hidden when there's only one option
        expect(find('[data-test-select="preview-segment"]'), 'segment select').not.to.exist;
    });

    it('allows keyboard users to focus the email preview for keyboard navigation', async function () {
        await openEmailPreviewModal.call(this);
        await waitFor('.gh-pe-iframe');

        const iframe = find('.gh-pe-iframe');
        expect(iframe, 'email preview iframe exists').to.exist;
        expect(iframe.getAttribute('tabindex')).to.equal('0');

        await focus(iframe);
        await waitUntil(() => {
            return iframe.contentDocument && iframe.contentDocument.activeElement === iframe.contentDocument.body;
        });

        const iframeDocument = iframe.contentDocument;
        expect(iframeDocument, 'iframe document is available').to.exist;
        expect(iframeDocument.activeElement, 'iframe body receives focus').to.equal(iframeDocument.body);
        expect(iframeDocument.body.getAttribute('tabindex')).to.equal('-1');
    });
});
