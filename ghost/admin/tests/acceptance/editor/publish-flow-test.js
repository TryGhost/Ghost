import loginAsRole from '../../helpers/login-as-role';
import moment from 'moment';
import {blur, click, fillIn, find} from '@ember/test-helpers';
import {disableMailgun, enableMailgun} from '../../helpers/mailgun';
import {disableMembers, enableMembers} from '../../helpers/members';
import {disableNewsletters, enableNewsletters} from '../../helpers/newsletters';
import {expect} from 'chai';
import {selectChoose} from 'ember-power-select/test-support/helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Publish flow', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        this.server.loadFixtures();
    });

    it('has minimal features for contributors', async function () {
        await loginAsRole('Contributor', this.server);

        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        expect(find('[data-test-button="publish-flow"]'), 'publish button').to.not.exist;

        expect(find('[data-test-button="contributor-preview"]'), 'contributor preview button').to.exist;
        expect(find('[data-test-button="contributor-save"]'), 'contributor save button').to.exist;

        await fillIn('[data-test-editor-title-input]', 'Contributor save test');
        await click('[data-test-button="contributor-save"]');

        expect(post.title, 'post title after save').to.equal('Contributor save test');
    });

    it('triggers post validation before opening', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        await fillIn('[data-test-editor-title-input]', Array(260).join('a'));
        await blur('[data-test-editor-title-input]');

        await click('[data-test-button="publish-flow"]');

        expect(find('.gh-alert'), 'validation shown in alert').to.exist;
        expect(find('[data-test-modal="publish-flow"]'), 'publish flow modal').to.not.exist;
    });

    it('handles timezones correctly when scheduling');

    // email unavailable state occurs when
    // 1. members signup access is set to "none"
    // 2. default newsletter recipients is set to "disabled"
    async function testEmailUnavailableFlow() {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        await fillIn('[data-test-editor-title-input]', 'Members disabled publish test');
        await blur('[data-test-editor-title-input]');

        await click('[data-test-button="publish-flow"]');

        expect(find('[data-test-modal="publish-flow"]'), 'publish flow modal').to.exist;
        expect(find('[data-test-publish-flow="options"]'), 'options step').to.exist;

        // members/newsletters disabled =
        // - fixed "Publish on site" publish type
        // - no email options shown
        // - standard publish time options
        expect(find('[data-test-setting="publish-type"]'), 'publish type setting').to.exist;
        expect(
            find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
        ).to.contain.trimmed.text('Publish on site');
        expect(find('[data-test-setting="publish-type"] [data-test-setting-title]')).to.not.match('button');

        expect(find('[data-test-setting="email-recipients"]')).to.not.exist;

        expect(find('[data-test-setting="publish-time"]'), 'publish time setting').to.exist;
        expect(
            find('[data-test-setting="publish-time"] [data-test-setting-title]'), 'publish time title'
        ).to.contain.trimmed.text('Right now');
        expect(find('[data-test-setting="publish-time"] [data-test-setting-title]')).to.match('button');

        await click('[data-test-button="continue"]');

        expect(find('[data-test-publish-flow="confirm"]'), 'confirm step').to.exist;

        expect(find('[data-test-text="confirm-details"]'), 'confirmation text')
            .to.have.rendered.text('Your post will be published on your site.');

        expect(find('[data-test-button="confirm-publish"]'), 'publish button text')
            .to.have.rendered.text('Publish post, right now');

        await click('[data-test-button="confirm-publish"]');

        expect(post.status, 'post status after publish').to.equal('published');

        expect(find('[data-test-publish-flow="complete"]'), 'complete step').to.exist;
        expect(find('[data-test-complete-title]'), 'complete title').to.have.rendered.text('Boom. It’s out there. That’s 1 post published, keep going!');
        expect(find('[data-test-complete-bookmark]'), 'bookmark card').to.exist;

        // "revert to draft" only shown for scheduled posts
        expect(find('[data-test-button="revert-to-draft"]'), 'revert-to-draft button').to.not.exist;

        // publish/preview buttons are hidden on complete step
        expect(find('[data-test-button="publish-flow-preview"]'), 'preview button on complete step').to.not.exist;
        expect(find('[data-test-button="publish-flow-publish"]'), 'publish button on complete step').to.not.exist;

        await click('[data-test-button="back-to-editor"]');

        expect(find('[data-test-button="publish-flow"]'), 'publish button after publishing').to.not.exist;
        expect(find('[data-test-button="update-flow"]'), 'update button after publishing').to.exist;

        await click('[data-test-button="update-flow"]');

        expect(find('[data-test-modal="update-flow"]'), 'update flow modal').to.exist;
        expect(find('[data-test-update-flow-title]')).to.have.rendered.text('This post has been published');
        expect(find('[data-test-update-flow-confirmation]')).to.contain.rendered.text('Your post was published on your site');
        const savedPublishAt = moment(post.publishedAt).utc();
        expect(find('[data-test-update-flow-confirmation]')).to.contain.rendered.text(`on ${savedPublishAt.format('D MMM YYYY')} at ${savedPublishAt.format('HH:mm')}`);
        expect(find('[data-test-button="revert-to-draft"]')).to.exist;
        expect(find('[data-test-button="revert-to-draft"]')).to.contain.rendered.text('Unpublish and revert to private draft');

        await click('[data-test-button="revert-to-draft"]');

        expect(post.status).to.equal('draft');

        expect(find('[data-test-modal="update-flow"]')).to.not.exist;
        expect(find('[data-test-button="publish-flow"]')).to.exist;
    }

    it('can publish with members disabled', async function () {
        await disableMembers(this.server);
        await testEmailUnavailableFlow.apply(this);
    });

    it('can publish with newsletters disabled', async function () {
        await enableMembers(this.server);
        await disableNewsletters(this.server);
        await testEmailUnavailableFlow.apply(this);
    });

    describe('members enabled', function () {
        beforeEach(async function () {
            enableMembers(this.server);
            enableMailgun(this.server);
            enableNewsletters(this.server);

            // at least one member is required for publish+send to be available
            this.server.create('member');

            await loginAsRole('Administrator', this.server);
        });

        it('can publish+send with single newsletter');

        it('can publish+send with multiple newsletters');

        it('can schedule publish+send');
        it('can send');
        it('can schedule send');
        it('can publish');
        it('can schedule publish');

        it('respects default recipient settings - usually nobody', async function () {
            // switch to "usually nobody" setting
            // - doing it this way so we're not testing potentially stale mocked setting keys/values
            await visit('/settings/newsletters');
            await click('[data-test-toggle-membersemail]');
            await selectChoose('[data-test-select="default-recipients"]', 'Usually nobody');
            await click('[data-test-button="save-members-settings"]');

            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.text('Publish');

            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.text('Not sent as newsletter');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');

            // email-related options are enabled
            expect(find('[data-test-publish-type="publish+send"]')).to.not.have.attribute('disabled');
            expect(find('[data-test-publish-type="send"]')).to.not.have.attribute('disabled');

            await click('[data-test-publish-type="publish+send"]');

            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('1 subscriber');
        });

        it('handles Mailgun not being set up', async function () {
            disableMailgun(this.server);

            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.text('Publish');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');

            // mailgun not set up notice is shown
            expect(find('[data-test-publish-type-error]'), 'publish type error').to.exist;
            expect(find('[data-test-publish-type-error="no-mailgun"]'), 'publish type error text').to.exist;

            // email-related options are disabled
            expect(find('[data-test-publish-type="publish+send"]')).to.have.attribute('disabled');
            expect(find('[data-test-publish-type="send"]')).to.have.attribute('disabled');
        });

        it('handles no members present', async function () {
            this.server.db.members.remove();
            this.server.db.newsletters.update({memberIds: []});

            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.text('Publish');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');

            // no-members notice is shown
            expect(find('[data-test-publish-type-error]'), 'publish type error').to.exist;
            expect(find('[data-test-publish-type-error="no-members"]'), 'publish type error text').to.exist;

            // email-related options are disabled
            expect(find('[data-test-publish-type="publish+send"]')).to.have.attribute('disabled');
            expect(find('[data-test-publish-type="send"]')).to.have.attribute('disabled');
        });

        it('handles member limits');
        it('handles server error when confirming');
        it('handles email sending error');
    });
});
