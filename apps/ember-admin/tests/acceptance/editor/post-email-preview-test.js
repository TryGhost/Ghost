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

const LEXICAL_WITH_PUBLIC_PREVIEW = JSON.stringify({
    root: {
        children: [
            {children: [], type: 'paragraph', version: 1},
            {type: 'paywall', version: 1},
            {children: [], type: 'paragraph', version: 1}
        ],
        type: 'root',
        version: 1
    }
});

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

    it('opens the free-member email preview from the public preview card', async function () {
        this.server.get('/email_previews/posts/:id', function () {
            return {
                email_previews: [{
                    html: '<!DOCTYPE html><html><head><style></style></head><body><div style="height: 2000px;"></div><div class="kg-paywall">Paywall</div></body></html>',
                    subject: 'Public preview'
                }]
            };
        });

        const post = this.server.create('post', {
            lexical: LEXICAL_WITH_PUBLIC_PREVIEW,
            status: 'draft',
            visibility: 'paid'
        });
        await visit(`/editor/post/${post.id}`);
        await waitFor('[data-kg-card="paywall"]');
        await click('[data-kg-card="paywall"]');
        await click('[data-testid="edit-paywall"]');
        await click('[data-testid="paywall-post-access-value"]');
        await click('[data-test-value="public"]');
        expect(find('[data-testid="settings-panel"]')).to.exist;
        await click('[data-testid="paywall-post-access-value"]');
        await click('[data-test-value="paid"]');
        expect(find('[data-testid="settings-panel"]')).to.exist;
        await click('[data-testid="tab-content"]');
        await click('[data-testid="paywall-email-preview-link"]');
        await waitFor('[data-test-modal="preview-email"]');

        expect(find('[data-test-button="email-preview"]')).to.have.attribute('data-test-selected');
        expect(find('[data-test-select="preview-segment"]')).to.contain.text('Free member');

        const iframe = find('.gh-pe-iframe');
        await waitUntil(() => iframe.contentDocument?.querySelector('.kg-paywall'));
        await waitUntil(() => iframe.contentWindow.scrollY > 0);
        expect(iframe.contentWindow.scrollY).to.be.greaterThan(0);
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
