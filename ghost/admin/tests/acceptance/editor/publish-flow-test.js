import loginAsRole from '../../helpers/login-as-role';
import moment from 'moment-timezone';
import {blur, click, fillIn, find, findAll, waitFor} from '@ember/test-helpers';
import {clickTrigger, removeMultipleOption, selectChoose} from 'ember-power-select/test-support/helpers';
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

    it('populates search index when opening', async function () {
        await loginAsRole('Administrator', this.server);

        const search = this.owner.lookup('service:search');
        expect(search.isContentStale).to.be.true;

        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);

        expect(search.isContentStale).to.be.false;
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
            .to.have.rendered.trimmed.text('Your post will be published on your site.');

        expect(find('[data-test-button="confirm-publish"]'), 'publish button text')
            .to.have.rendered.trimmed.text('Publish post, right now');

        await click('[data-test-button="confirm-publish"]');

        expect(post.status, 'post status after publish').to.equal('published');

        expect(find('[data-test-publish-flow="complete"]'), 'complete step').to.exist;
        expect(find('[data-test-complete-title]'), 'complete title').to.have.rendered.trimmed.text('Boom! It\'s out there.\nThat\'s 1 post published.');
        expect(find('[data-test-complete-bookmark]'), 'bookmark card').to.exist;

        await visit(`/editor/post/${post.id}`);

        // "revert to draft" only shown for scheduled posts
        expect(find('[data-test-button="revert-to-draft"]'), 'revert-to-draft button').to.not.exist;

        // publish/preview buttons are hidden on complete step
        expect(find('[data-test-button="publish-flow-preview"]'), 'preview button on complete step').to.not.exist;
        expect(find('[data-test-button="publish-flow-publish"]'), 'publish button on complete step').to.not.exist;

        await click('[data-test-button="close-publish-flow"]');

        expect(find('[data-test-button="publish-flow"]'), 'publish button after publishing').to.not.exist;
        expect(find('[data-test-button="update-flow"]'), 'update button after publishing').to.exist;

        await click('[data-test-button="update-flow"]');

        expect(find('[data-test-modal="update-flow"]'), 'update flow modal').to.exist;
        expect(find('[data-test-update-flow-title]')).to.have.rendered.trimmed.text('This post has been published');
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
            const label = this.server.create('label');
            this.server.createList('member', 3, {status: 'free', email_disabled: 0, labels: [label]});
            this.server.createList('member', 4, {status: 'paid', email_disabled: 0});
        });

        it('can publish+send with single newsletter', async function () {
            await loginAsRole('Administrator', this.server);
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

            // check that the Free + Paid members toggle works properly
            const freeCheckbox = find('[data-test-checkbox="free-members"]');
            const paidCheckbox = find('[data-test-checkbox="paid-members"]');

            // toggles exist
            expect(freeCheckbox, 'free members checkbox').to.exist;
            expect(paidCheckbox, 'paid members checkbox').to.exist;

            // both toggles are checked by default
            expect(freeCheckbox.checked, 'free members checkbox checked').to.be.true;
            expect(paidCheckbox.checked, 'paid members checkbox checked').to.be.true;

            // uncheck both and check that the title updates
            await click(freeCheckbox);
            await click(paidCheckbox);
            expect(freeCheckbox.checked, 'free members checkbox checked').to.be.false;
            expect(paidCheckbox.checked, 'paid members checkbox checked').to.be.false;

            expect(
                find('[data-test-setting="email-recipients"] [data-test-setting-title]')
            ).to.have.trimmed.rendered.text('Not sent as newsletter');

            // check them both again
            await click(freeCheckbox);
            await click(paidCheckbox);

            // check that specific filters work
            // refs https://github.com/TryGhost/Team/issues/2859

            // select the Specific people checkbox
            const specificCheckbox = find('[data-test-checkbox="specific-members"]');
            await click(specificCheckbox);
            expect(specificCheckbox.checked, 'specific people checkbox checked').to.be.true;

            // check that the select box is displayed
            const specificSelect = find('.select-members-recipient');
            expect(specificSelect, 'specific members select').to.exist;

            // select a specific label to send the newsletter to
            await clickTrigger('[data-test-select="specific-members"]');
            await selectChoose('[data-test-select="specific-members"]', 'Label 0');

            // uncheck everything, then recheck specific members
            await click(freeCheckbox);
            await click(paidCheckbox);
            await click(specificCheckbox);
            await click(specificCheckbox);

            // Remove selected option and check that the select box is still visible
            await removeMultipleOption('[data-test-select="specific-members"]', 'Label 0');
            expect(specificCheckbox.checked, 'specific people checkbox checked').to.be.true;

            // Uncheck specific and recheck free + paid
            await click(freeCheckbox);
            await click(paidCheckbox);
            await click(specificCheckbox);

            expect(freeCheckbox.checked, 'free members checkbox checked').to.be.true;
            expect(paidCheckbox.checked, 'paid members checkbox checked').to.be.true;

            await click('[data-test-button="continue"]');

            // confirm text is correct
            expect(find('[data-test-text="confirm-details"]')).to.contain.rendered
                .text('will be published on your site, and delivered to all 7 subscribers.');

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered.trimmed
                .text('Publish & send, right now');

            await click('[data-test-button="confirm-publish"]');

            // complete text has right count
            expect(find('[data-test-complete-title]')).to.contain.rendered
                .text('Boom! It\'s out there.\nThat\'s 1 post published.');
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

            this.server.create('member', {newsletters: [newsletter], status: 'free', email_disabled: 0});

            await loginAsRole('Administrator', this.server);
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

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered.trimmed
                .text('Publish & send, right now');

            await click('[data-test-button="confirm-publish"]');

            // saved with correct newsletter id
            expect(post.newsletterId).to.equal(newsletter.id);
        });

        it('can schedule publish+send', async function () {
            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(find('[data-test-setting="publish-at"] [data-test-setting-title]')).to.have.rendered.trimmed
                .text('Right now');

            const siteTz = this.server.db.settings.findBy({key: 'timezone'}).value;
            const plus10 = moment().tz(siteTz).add(10, 'minutes').startOf('minute');

            await click('[data-test-setting="publish-at"] [data-test-setting-title]');
            await click('[data-test-radio="schedule"]');

            // date + time inputs are shown, defaults to now+5 mins
            await waitFor('[data-test-setting="publish-at"] [data-test-date-time-picker-datepicker]');
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-datepicker]'), 'datepicker').to.exist;
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]'), 'initial datepicker value')
                .to.have.value(plus10.format('YYYY-MM-DD'));

            await waitFor('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]');
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]'), 'time input').to.exist;
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]'), 'initial time input value')
                .to.have.value(plus10.format('HH:mm'));

            // can set a new date and time
            const newDate = moment().tz(siteTz).add(4, 'days').add(5, 'hours').startOf('minute');
            await fillIn('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]', newDate.format('YYYY-MM-DD'));
            await blur('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]');
            await fillIn('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]', newDate.format('HH:mm'));
            await blur('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]');
            expect(find('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]')).to.have.value(newDate.format('HH:mm'));

            expect(find('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish-at title after change').to.have.rendered.trimmed
                .text('In 4 days');

            await click('[data-test-button="continue"]');

            // has correct confirm text
            expect(find('[data-test-text="confirm-details"]')).to.have.rendered.trimmed
                .text(`On ${newDate.format('D MMM YYYY')} at ${newDate.format('HH:mm')} your post will be published on your site, and delivered to all 7 subscribers.`);

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered.trimmed
                .text(`Publish & send, on ${newDate.format('MMMM Do')}`);

            await click('[data-test-button="confirm-publish"]');

            // saved with correct details
            expect(post.status).to.equal('scheduled');
            expect(moment.utc(post.publishedAt).format('YYYY-MM-DD HH:mm')).to.equal(moment(newDate).utc().format('YYYY-MM-DD HH:mm'));
            expect(post.newsletterId).to.equal('1');
        });

        it('can send', async function () {
            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');
            await click('[data-test-publish-type="send"]');

            expect(find('[data-test-setting="publish-type"] [data-test-setting-title]')).to.have.rendered.trimmed
                .text('Email');

            await click('[data-test-button="continue"]');

            // has correct confirm text
            expect(find('[data-test-text="confirm-details"]')).to.have.rendered.trimmed
                .text(`Your post will be delivered to all 7 subscribers, and will not be published on your site.`);

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered.trimmed
                .text(`Send email, right now`);

            await click('[data-test-button="confirm-publish"]');

            expect(post.attrs.emailOnly).to.be.true;
        });

        it('can schedule send', async function () {
            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');
            await click('[data-test-publish-type="send"]');

            expect(find('[data-test-setting="publish-type"] [data-test-setting-title]')).to.have.rendered.trimmed
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

            expect(find('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish-at title after change').to.have.rendered.trimmed
                .text('In 4 days');

            await click('[data-test-button="continue"]');

            // has correct confirm text
            expect(find('[data-test-text="confirm-details"]')).to.have.rendered.trimmed
                .text(`On ${newDate.format('D MMM YYYY')} at ${newDate.format('HH:mm')} your post will be delivered to all 7 subscribers, and will not be published on your site.`);

            expect(find('[data-test-button="confirm-publish"]')).to.have.rendered.trimmed
                .text(`Send email, on ${newDate.format('MMMM Do')}`);

            await click('[data-test-button="confirm-publish"]');

            expect(post.attrs.emailOnly).to.be.true;
        });

        it('can publish');
        it('can schedule publish');

        it('handles Mailgun not being set up', async function () {
            disableMailgun(this.server);

            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});

            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('Publish');

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

            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});

            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title'
            ).to.have.trimmed.rendered.text('Publish');

            await click('[data-test-setting="publish-type"] [data-test-setting-title]');

            // no-members notice is shown
            expect(find('[data-test-publish-type-error]'), 'publish type error').to.exist;
            expect(find('[data-test-publish-type-error="no-members"]'), 'publish type error text').to.exist;

            // email-related options are disabled
            expect(find('[data-test-publish-type="publish+send"]')).to.have.attribute('disabled');
            expect(find('[data-test-publish-type="send"]')).to.have.attribute('disabled');
        });

        it('handles over-member limit before publish', async function () {
            // set members limit
            const config = this.server.db.configs.find(1);
            config.hostSettings = {
                limits: {
                    members: {
                        max: 9,
                        error: 'Your plan supports up to {{max}} members. Please upgrade to reenable publishing.'
                    }
                }
            };
            this.server.db.configs.update(1, config);

            // go over limit (7 created by default in beforeEach)
            this.server.createList('member', 3);

            // simulate /members/stats/count/ endpoint that's used to get total member count
            // TODO: can the default endpoint mock handle this?
            this.server.get('/members/stats/count', function () {
                return {
                    total: 10,
                    resource: 'members',
                    data: []
                };
            });

            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});

            // try to publish post
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');

            expect(find('[data-test-publish-type-error]'), 'publish disabled error').to.exist;
            expect(find('[data-test-publish-type-error="publish-disabled"]'), 'publish disabled error')
                .to.have.trimmed.text('Your plan supports up to 9 members. Please upgrade to reenable publishing.');

            expect(find('[data-test-button="continue"]'), 'continue button').to.not.exist;
        });

        it('handles over-member limit when confirming', async function () {
            await loginAsRole('Administrator', this.server);
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');
            await click('[data-test-button="continue"]');

            this.server.put('/posts/:id/', function () {
                return {
                    errors: [
                        {
                            message: 'Host Limit error, cannot edit post.',
                            context: 'Your plan supports up to 1,000 members. Please upgrade to reenable publishing.',
                            type: 'HostLimitError',
                            details: {
                                name: 'members',
                                limit: 1000,
                                total: 37406
                            },
                            property: null,
                            help: 'https://ghost.org/help/',
                            code: null,
                            id: '212d9110-3db6-11ed-9651-e9a82ad49a7a',
                            ghostErrorCode: null
                        }
                    ]
                };
            });

            await click('[data-test-button="confirm-publish"]');

            expect(find('[data-test-confirm-error]'), 'confirm error').to.exist;
            expect(find('[data-test-confirm-error]'), 'confirm error')
                .to.have.trimmed.text('Your plan supports up to 1,000 members. Please upgrade to reenable publishing.');
        });

        it('(as editor) handles over-member limits', async function () {
            // set members limit
            const config = this.server.db.configs.find(1);
            config.hostSettings = {
                limits: {
                    members: {
                        max: 9,
                        error: 'Your plan supports up to {{max}} members. Please upgrade to reenable publishing.'
                    }
                }
            };
            this.server.db.configs.update(1, config);

            // go over limit (7 created by default in beforeEach)
            this.server.createList('member', 3);

            await loginAsRole('Editor', this.server);
            const post = this.server.create('post', {status: 'draft'});

            // try to publish post
            await visit(`/editor/post/${post.id}`);
            await click('[data-test-button="publish-flow"]');
            await click('[data-test-button="continue"]');

            this.server.put('/posts/:id/', function () {
                return {
                    errors: [
                        {
                            message: 'Host Limit error, cannot edit post.',
                            context: 'Your plan supports up to 1,000 members. Please upgrade to reenable publishing.',
                            type: 'HostLimitError',
                            details: {
                                name: 'members',
                                limit: 1000,
                                total: 37406
                            },
                            property: null,
                            help: 'https://ghost.org/help/',
                            code: null,
                            id: '212d9110-3db6-11ed-9651-e9a82ad49a7a',
                            ghostErrorCode: null
                        }
                    ]
                };
            });

            await click('[data-test-button="confirm-publish"]');

            expect(find('[data-test-confirm-error]'), 'confirm error').to.exist;
            expect(find('[data-test-confirm-error]'), 'confirm error')
                .to.have.trimmed.text('Your plan supports up to 1,000 members. Please upgrade to reenable publishing.');
        });

        it('handles server error when confirming');
        it('handles email sending error');
    });
});
