import loginAsRole from '../../helpers/login-as-role';
import moment from 'moment';
import {blur, click, fillIn, find, findAll} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {disableMailgun, enableMailgun} from '../../helpers/mailgun';
import {disableMembers, enableMembers} from '../../helpers/members';
import {disableNewsletters, enableNewsletters} from '../../helpers/newsletters';
import {enableStripe} from '../../helpers/stripe';
import {expect} from 'chai';
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

        expect(find('[data-test-setting="publish-at"]'), 'publish time setting').to.exist;
        expect(
            find('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish time title'
        ).to.contain.trimmed.text('Right now');
        expect(find('[data-test-setting="publish-at"] [data-test-setting-title]')).to.match('button');

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
            enableStripe(this.server);

            // at least one member is required for publish+send to be available
            this.server.createList('member', 3, {status: 'free'});
            this.server.createList('member', 4, {status: 'paid'});

            await loginAsRole('Administrator', this.server);
        });

        it('can publish+send with single newsletter', async function () {
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('Publish and email');

            // newsletter is not mentioned in the recipients title
            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('All 7 subscribers');

            // newsletter select shouldn't exist
            await click('[data-test-setting="email-recipients"] [data-test-setting-title]');
            expect(find('[data-test-select="newsletter"]'), 'newsletter select').to.not.exist;

            await click('[data-test-button="continue"]');

            // confirm text is correct
            expect(find('[data-test-text="confirm-details"]')).to.contain.rendered
                .text('will be published on your site, and delivered to all 7 subscribers.');

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered
                .text('Publish & send, right now');

            await click('[data-test-button="confirm-publish"]');

            // complete text has right count
            expect(find('[data-test-complete-title]')).to.contain.rendered
                .text('That’s 1 post published');
        });

        it('can publish+send with multiple newsletters', async function () {
            const newsletter = this.server.create('newsletter', {
                name: 'Second newsletter',
                slug: 'second-newsletter',
                status: 'active',
                subscribeOnSignup: true
            });

            this.server.create('newsletter', {
                name: 'Archived newsletter',
                slug: 'archived-newsletter',
                status: 'archived',
                subscribeOnSignup: true
            });

            this.server.create('member', {newsletters: [newsletter], status: 'free'});

            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            // newsletter is mentioned in the recipients title
            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('All 8 subscribers of Default newsletter');

            // newsletter select should exist with all active newsletters listed
            await click('[data-test-setting="email-recipients"] [data-test-setting-title]');
            expect(find('[data-test-select="newsletter"]'), 'newsletter select').to.exist;
            await clickTrigger('[data-test-select="newsletter"]');
            expect(findAll('.ember-power-select-dropdown [data-test-select-option]').length).to.equal(2);

            // selecting a different newsletter updates recipient count
            await selectChoose('[data-test-select="newsletter"]', 'Second newsletter');
            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('1 subscriber of Second newsletter');

            await click('[data-test-button="continue"]');

            // confirm text is correct
            expect(find('[data-test-text="confirm-details"]')).to.contain.rendered
                .text('will be published on your site, and delivered to all 1 subscriber of Second newsletter.');

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered
                .text('Publish & send, right now');

            await click('[data-test-button="confirm-publish"]');

            // saved with correct newsletter id
            expect(post.newsletterId).to.equal(newsletter.id);
        });

        it('can schedule publish+send', async function () {
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(find('[data-test-setting="publish-at"] [data-test-setting-title]')).to.have.rendered
                .text('Right now');

            const siteTz = this.server.db.settings.findBy({key: 'timezone'}).value;
            const plus5 = moment().tz(siteTz).add(5, 'minutes').set({});

            await click('[data-test-setting="publish-at"] [data-test-setting-title]');
            await click('[data-test-radio="schedule"]');

            // date + time inputs are shown, defaults to now+5 mins
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-datepicker]'), 'datepicker').to.exist;
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]'), 'initial datepicker value')
                .to.have.value(plus5.format('YYYY-MM-DD'));

            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]'), 'time input').to.exist;
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]'), 'initial time input value')
                .to.have.value(plus5.format('HH:mm'));

            // can set a new date and time
            const newDate = moment().tz(siteTz).add(4, 'days').add(5, 'hours').set('second', 0);
            await fillIn('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]', newDate.format('YYYY-MM-DD'));
            await blur('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]');
            await fillIn('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]', newDate.format('HH:mm'));
            await blur('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]');
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]')).to.have.value(newDate.format('HH:mm'));

            expect(find('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish-at title after change').to.have.rendered
                .text('In 4 days');

            await click('[data-test-button="continue"]');

            // has correct confirm text
            expect(find('[data-test-text="confirm-details"]')).to.have.rendered
                .text(`On ${newDate.format('D MMM YYYY')} at ${newDate.format('HH:mm')} your post will be published on your site, and delivered to all 7 subscribers.`);

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered
                .text(`Publish & send, on ${newDate.format('MMMM Do')}`);

            await click('[data-test-button="confirm-publish"]');

            // saved with correct details
            expect(post.status).to.equal('scheduled');
            expect(moment.utc(post.publishedAt).format('YYYY-MM-DD HH:mm')).to.equal(moment(newDate).utc().format('YYYY-MM-DD HH:mm'));
            expect(post.newsletterId).to.equal('1');
        });

        it('can send', async function () {
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');
            await click('[data-test-publish-type="send"]');

            expect(find('[data-test-setting="publish-type"] [data-test-setting-title]')).to.have.rendered
                .text('Email');

            await click('[data-test-button="continue"]');

            // has correct confirm text
            expect(find('[data-test-text="confirm-details"]')).to.have.rendered
                .text(`Your post will be delivered to all 7 subscribers, and will not be published on your site.`);

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered
                .text(`Send email, right now`);

            await click('[data-test-button="confirm-publish"]');

            expect(post.attrs.emailOnly).to.be.true;
        });

        it('can schedule send', async function () {
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');
            await click('[data-test-publish-type="send"]');

            expect(find('[data-test-setting="publish-type"] [data-test-setting-title]')).to.have.rendered
                .text('Email');

            await click('[data-test-setting="publish-at"] [data-test-setting-title]');
            await click('[data-test-setting="publish-at"] [data-test-radio="schedule"]');

            const siteTz = this.server.db.settings.findBy({key: 'timezone'}).value;
            const newDate = moment().tz(siteTz).add(4, 'days').add(5, 'hours').set('second', 0);
            await fillIn('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]', newDate.format('YYYY-MM-DD'));
            await blur('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]');
            await fillIn('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]', newDate.format('HH:mm'));
            await blur('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]');
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]')).to.have.value(newDate.format('HH:mm'));

            expect(find('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish-at title after change').to.have.rendered
                .text('In 4 days');

            await click('[data-test-button="continue"]');

            // has correct confirm text
            expect(find('[data-test-text="confirm-details"]')).to.have.rendered
                .text(`On ${newDate.format('D MMM YYYY')} at ${newDate.format('HH:mm')} your post will be delivered to all 7 subscribers, and will not be published on your site.`);

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered
                .text(`Send email, on ${newDate.format('MMMM Do')}`);

            await click('[data-test-button="confirm-publish"]');

            expect(post.attrs.emailOnly).to.be.true;
        });

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
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'recipients title'
            ).to.have.trimmed.text('Not sent as newsletter');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');

            // email-related options are enabled
            expect(find('[data-test-publish-type="publish+send"]')).to.not.have.attribute('disabled');
            expect(find('[data-test-publish-type="send"]')).to.not.have.attribute('disabled');

            await click('[data-test-publish-type="publish+send"]');

            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'recipients title'
            ).to.have.trimmed.rendered.text('All 7 subscribers');
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
