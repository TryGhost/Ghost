import loginAsRole from '../../helpers/login-as-role';
import {click, find, findAll} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
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
    });

    it('should hide newsletters list and paid/free select by default', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        // go to email preview modal
        expect(find('[data-test-button="publish-preview"]'), 'Preview').to.exist;
        await click('[data-test-button="publish-preview"]');

        expect(find('[data-test-button="email-preview"]')).to.exist;
        await click('[data-test-button="email-preview"]');

        expect(find('[data-test-email-preview-newsletter-select]')).not.to.exist;
        expect(find('[data-test-email-preview-segment-select]')).not.to.exist;
    });

    it('can select newsletter and paid/free member for preview', async function () {
        enableMailgun(this.server);
        await loginAsRole('Administrator', this.server);
        const post = this.server.create('post', {status: 'draft'});
        this.server.create('newsletter', {
            name: 'Awesome newsletter',
            slug: 'awesome-newsletter'
        });

        await visit(`/editor/post/${post.id}`);

        // go to email preview modal
        expect(find('[data-test-button="publish-preview"]'), 'Preview').to.exist;
        await click('[data-test-button="publish-preview"]');

        expect(find('[data-test-button="email-preview"]')).to.exist;
        await click('[data-test-button="email-preview"]');

        expect(find('[data-test-email-preview-newsletter-select]')).to.exist;
        expect(find('[data-test-email-preview-segment-select]')).not.to.exist;

        // check newsletters options
        await clickTrigger('[data-test-email-preview-newsletter-select-section]');

        const options = findAll('.ember-power-select-option');

        expect(options.length).to.equal(2);
        expect(options[0].textContent.trim()).to.equal('Default newsletter');
        expect(options[1].textContent.trim()).to.equal('Awesome newsletter');

        await selectChoose('[data-test-email-preview-newsletter-select]', 'Awesome newsletter');

        // send chosen newsletter type on backend
        await click(find('[data-test-button="post-preview-test-email"]'));
        await click(find('[data-test-button="send-test-email"]'));
        const [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        const requestBody = JSON.parse(lastRequest.requestBody);
        expect(requestBody.newsletter).to.equal('awesome-newsletter');
        expect(requestBody.memberSegment).to.equal('status:free');
    });

    it('can select paid/free member for preview', async function () {
        enableMailgun(this.server);
        await loginAsRole('Administrator', this.server);
        const post = this.server.create('post', {status: 'draft'});
        this.server.create('setting', {
            group: 'site',
            key: 'paid_members_enabled',
            value: true
        });

        await visit(`/editor/post/${post.id}`);

        // go to email preview modal
        await click('[data-test-button="publish-preview"]');
        await click('[data-test-button="email-preview"]');

        expect(find('[data-test-email-preview-newsletter-select]')).not.to.exist;
        expect(find('[data-test-email-preview-segment-select]')).to.exist;

        // check segments options
        await clickTrigger('[data-test-email-preview-segment-select-section]');

        const options = findAll('.ember-power-select-option');

        expect(options.length).to.equal(2);
        expect(options[0].textContent.trim()).to.equal('Free member');
        expect(options[1].textContent.trim()).to.equal('Paid member');

        // can switch free/paid member in preview
        await selectChoose('[data-test-email-preview-segment-select]', 'Paid member');

        // send chosen segment on backend
        await click(find('[data-test-button="post-preview-test-email"]'));
        await click(find('[data-test-button="send-test-email"]'));
        const [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        const requestBody = JSON.parse(lastRequest.requestBody);
        expect(requestBody.memberSegment).to.equal('status:-free');
    });
});
