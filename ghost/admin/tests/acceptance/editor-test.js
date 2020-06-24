import Mirage from 'ember-cli-mirage';
import moment from 'moment';
import sinon from 'sinon';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentRouteName, currentURL, fillIn, find, findAll, triggerEvent} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {expect} from 'chai';
import {selectChoose} from 'ember-power-select/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

// TODO: update ember-power-datepicker to expose modern test helpers
// https://github.com/cibernox/ember-power-datepicker/issues/30

describe('Acceptance: Editor', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        let author = this.server.create('user'); // necesary for post-author association
        this.server.create('post', {authors: [author]});

        await invalidateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('does not redirect to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });

    it('does not redirect to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });

    it('does not redirect to staff page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });

    it('displays 404 when post does not exist', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentRouteName()).to.equal('error404');
        expect(currentURL()).to.equal('/editor/post/1');
    });

    it('when logged in as a contributor, renders a save button instead of a publish menu & hides tags input', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        let author = this.server.create('user', {roles: [role]});
        this.server.createList('post', 2, {authors: [author]});
        this.server.loadFixtures('settings');
        await authenticateSession();

        // post id 1 is a draft, checking for draft behaviour now
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');

        // Expect publish menu to not exist
        expect(
            find('[data-test-publishmenu-trigger]'),
            'publish menu trigger'
        ).to.not.exist;

        // Open post settings menu
        await click('[data-test-psm-trigger]');

        // Check to make sure that tags input doesn't exist
        expect(
            find('[data-test-token-input]'),
            'tags input'
        ).to.not.exist;

        // post id 2 is published, we should be redirected to index
        await visit('/editor/post/2');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    describe('when logged in', function () {
        let author;

        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            author = this.server.create('user', {roles: [role]});
            this.server.loadFixtures('settings');

            return await authenticateSession();
        });

        it('renders the editor correctly, PSM Publish Date and Save Button', async function () {
            let [post1] = this.server.createList('post', 2, {authors: [author]});
            let futureTime = moment().tz('Etc/UTC').add(10, 'minutes');

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');

            // open post settings menu
            await click('[data-test-psm-trigger]');

            // should error, if the publish time is in the wrong format
            await fillIn('[data-test-date-time-picker-time-input]', 'foo');
            await blur('[data-test-date-time-picker-time-input]');

            expect(find('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for invalid time')
                .to.equal('Must be in format: "15:00"');

            // should error, if the publish time is in the future
            // NOTE: date must be selected first, changing the time first will save
            // with the new time
            await datepickerSelect('[data-test-date-time-picker-datepicker]', moment.tz('Etc/UTC').toDate());
            await fillIn('[data-test-date-time-picker-time-input]', futureTime.format('HH:mm'));
            await blur('[data-test-date-time-picker-time-input]');

            expect(find('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for future time')
                .to.equal('Must be in the past');

            // closing the PSM will reset the invalid date/time
            await click('[data-test-close-settings-menu]');
            await click('[data-test-psm-trigger]');

            expect(
                find('[data-test-date-time-picker-error]'),
                'date picker error after closing PSM'
            ).to.not.exist;

            expect(
                find('[data-test-date-time-picker-date-input]').value,
                'PSM date value after closing with invalid date'
            ).to.equal(moment(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD'));

            expect(
                find('[data-test-date-time-picker-time-input]').value,
                'PSM time value after closing with invalid date'
            ).to.equal(moment(post1.publishedAt).tz('Etc/UTC').format('HH:mm'));

            // saves the post with the new date
            let validTime = moment('2017-04-09 12:00').tz('Etc/UTC');
            await fillIn('[data-test-date-time-picker-time-input]', validTime.format('HH:mm'));
            await blur('[data-test-date-time-picker-time-input]');
            await datepickerSelect('[data-test-date-time-picker-datepicker]', validTime.toDate());

            // hide psm
            await click('[data-test-close-settings-menu]');

            // checking the flow of the saving button for a draft
            expect(
                find('[data-test-publishmenu-trigger]').textContent.trim(),
                'draft publish button text'
            ).to.equal('Publish');

            expect(
                find('[data-test-editor-post-status]').textContent.trim(),
                'draft status text'
            ).to.equal('Draft');

            // click on publish now
            await click('[data-test-publishmenu-trigger]');

            expect(
                find('[data-test-publishmenu-draft]'),
                'draft publish menu is shown'
            ).to.exist;

            await click('[data-test-publishmenu-scheduled-option]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'draft post schedule button text'
            ).to.equal('Schedule');

            await click('[data-test-publishmenu-published-option]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'draft post publish button text'
            ).to.equal('Publish');

            // Publish the post
            await click('[data-test-publishmenu-save]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button updated after draft is published'
            ).to.equal('Update');

            expect(
                find('[data-test-publishmenu-published]'),
                'publish menu is shown after draft published'
            ).to.exist;

            expect(
                find('[data-test-editor-post-status]').textContent.trim(),
                'post status updated after draft published'
            ).to.equal('Published');

            await click('[data-test-publishmenu-cancel]');
            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-unpublished-option]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'published post unpublish button text'
            ).to.equal('Unpublish');

            // post id 2 is a published post, checking for published post behaviour now
            await visit('/editor/post/2');

            expect(currentURL(), 'currentURL').to.equal('/editor/post/2');
            expect(find('[data-test-date-time-picker-date-input]').value).to.equal('2015-12-19');
            expect(find('[data-test-date-time-picker-time-input]').value).to.equal('16:25');

            // saves the post with a new date
            await datepickerSelect('[data-test-date-time-picker-datepicker]', moment('2016-05-10 10:00').toDate());
            await fillIn('[data-test-date-time-picker-time-input]', '10:00');
            await blur('[data-test-date-time-picker-time-input]');
            // saving
            await click('[data-test-publishmenu-trigger]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'published button text'
            ).to.equal('Update');

            await click('[data-test-publishmenu-save]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button updated after published post is updated'
            ).to.equal('Update');

            // go to settings to change the timezone
            await visit('/settings/general');
            await click('[data-test-toggle-timezone]');

            expect(currentURL(), 'currentURL for settings')
                .to.equal('/settings/general');
            expect(find('#timezone option:checked').textContent.trim(), 'default timezone')
                .to.equal('(GMT) UTC');

            // select a new timezone
            find('#timezone option[value="Pacific/Kwajalein"]').selected = true;

            await triggerEvent('#timezone', 'change');
            // save the settings
            await click('.gh-btn.gh-btn-blue');

            expect(find('#timezone option:checked').textContent.trim(), 'new timezone after saving')
                .to.equal('(GMT +12:00) International Date Line West');

            // and now go back to the editor
            await visit('/editor/post/2');

            expect(currentURL(), 'currentURL in editor')
                .to.equal('/editor/post/2');

            expect(
                find('[data-test-date-time-picker-date-input]').value,
                'date after timezone change'
            ).to.equal('2016-05-10');

            expect(
                find('[data-test-date-time-picker-time-input]').value,
                'time after timezone change'
            ).to.equal('22:00');

            // unpublish
            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-unpublished-option]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'published post unpublish button text'
            ).to.equal('Unpublish');

            await click('[data-test-publishmenu-save]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button updated after published post is unpublished'
            ).to.equal('Publish');

            expect(
                find('[data-test-publishmenu-draft]'),
                'draft menu is shown after unpublished'
            ).to.exist;

            expect(
                find('[data-test-editor-post-status]').textContent.trim(),
                'post status updated after unpublished'
            ).to.equal('Draft');

            // schedule post
            await click('[data-test-publishmenu-cancel]');
            await click('[data-test-publishmenu-trigger]');

            let newFutureTime = moment.tz('Pacific/Kwajalein').add(10, 'minutes');
            await click('[data-test-publishmenu-scheduled-option]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'draft post, schedule button text'
            ).to.equal('Schedule');

            await datepickerSelect('[data-test-publishmenu-draft] [data-test-date-time-picker-datepicker]', new Date(newFutureTime.format().replace(/\+.*$/, '')));
            await click('[data-test-publishmenu-save]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button updated after draft is scheduled'
            ).to.equal('Reschedule');

            await click('[data-test-publishmenu-cancel]');

            expect(
                find('[data-test-publishmenu-scheduled]'),
                'publish menu is not shown after closed'
            ).to.not.exist;

            // expect countdown to show warning that post is scheduled to be published
            expect(find('[data-test-schedule-countdown]').textContent.trim(), 'notification countdown')
                .to.match(/Scheduled to be published {2}in (4|5) minutes/);

            expect(
                find('[data-test-publishmenu-trigger]').textContent.trim(),
                'scheduled publish button text'
            ).to.equal('Scheduled');

            expect(
                find('[data-test-editor-post-status]').textContent.trim(),
                'scheduled post status'
            ).to.match(/Scheduled to be published {2}in (4|5) minutes./);

            // Re-schedule
            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-scheduled-option]');
            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'scheduled post button reschedule text'
            ).to.equal('Reschedule');

            await click('[data-test-publishmenu-save]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button text for a rescheduled post'
            ).to.equal('Reschedule');

            await click('[data-test-publishmenu-cancel]');

            expect(
                find('[data-test-publishmenu-scheduled]'),
                'publish menu is not shown after closed'
            ).to.not.exist;

            expect(
                find('[data-test-editor-post-status]').textContent.trim(),
                'scheduled status text'
            ).to.match(/Scheduled to be published {2}in (4|5) minutes\./);

            // unschedule
            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-draft-option]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button updated after scheduled post is unscheduled'
            ).to.equal('Unschedule');

            await click('[data-test-publishmenu-save]');

            expect(
                find('[data-test-publishmenu-save]').textContent.trim(),
                'publish menu save button updated after scheduled post is unscheduled'
            ).to.equal('Publish');

            await click('[data-test-publishmenu-cancel]');

            expect(
                find('[data-test-publishmenu-trigger]').textContent.trim(),
                'publish button text after unschedule'
            ).to.equal('Publish');

            expect(
                find('[data-test-editor-post-status]').textContent.trim(),
                'status text after unschedule'
            ).to.equal('Draft');

            expect(
                find('[data-test-schedule-countdown]'),
                'scheduled countdown after unschedule'
            ).to.not.exist;
        });

        it('handles validation errors when scheduling', async function () {
            this.server.put('/posts/:id/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [{
                        type: 'ValidationError',
                        message: 'Error test'
                    }]
                });
            });

            let post = this.server.create('post', 1, {authors: [author], status: 'draft'});
            let plusTenMin = moment().utc().add(10, 'minutes');

            await visit(`/editor/post/${post.id}`);

            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-scheduled-option]');
            await datepickerSelect('[data-test-publishmenu-draft] [data-test-date-time-picker-datepicker]', plusTenMin.toDate());
            await fillIn('[data-test-publishmenu-draft] [data-test-date-time-picker-time-input]', plusTenMin.format('HH:mm'));
            await blur('[data-test-publishmenu-draft] [data-test-date-time-picker-time-input]');

            await click('[data-test-publishmenu-save]');

            expect(
                findAll('.gh-alert').length,
                'number of alerts after failed schedule'
            ).to.equal(1);

            expect(
                find('.gh-alert').textContent,
                'alert text after failed schedule'
            ).to.match(/Error test/);
        });

        it('handles title validation errors correctly', async function () {
            this.server.create('post', {authors: [author]});

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');

            await fillIn('[data-test-editor-title-input]', Array(260).join('a'));
            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-save]');

            expect(
                findAll('.gh-alert').length,
                'number of alerts after invalid title'
            ).to.equal(1);

            expect(
                find('.gh-alert').textContent,
                'alert text after invalid title'
            ).to.match(/Title cannot be longer than 255 characters/);
        });

        // NOTE: these tests are specific to the mobiledoc editor
        // it('inserts a placeholder if the title is blank', async function () {
        //     this.server.createList('post', 1);
        //
        //     // post id 1 is a draft, checking for draft behaviour now
        //     await visit('/editor/post/1');
        //
        //     expect(currentURL(), 'currentURL')
        //         .to.equal('/editor/post/1');
        //
        //     await titleRendered();
        //
        //     let title = find('#koenig-title-input div');
        //     expect(title.data('placeholder')).to.equal('Your Post Title');
        //     expect(title.hasClass('no-content')).to.be.false;
        //
        //     await replaceTitleHTML('');
        //     expect(title.hasClass('no-content')).to.be.true;
        //
        //     await replaceTitleHTML('test');
        //     expect(title.hasClass('no-content')).to.be.false;
        // });
        //
        // it('removes HTML from the title.', async function () {
        //     this.server.createList('post', 1);
        //
        //     // post id 1 is a draft, checking for draft behaviour now
        //     await visit('/editor/post/1');
        //
        //     expect(currentURL(), 'currentURL')
        //         .to.equal('/editor/post/1');
        //
        //     await titleRendered();
        //
        //     let title = find('#koenig-title-input div');
        //     await replaceTitleHTML('<div>TITLE&nbsp;&#09;&nbsp;&thinsp;&ensp;&emsp;TEST</div>&nbsp;');
        //     expect(title.html()).to.equal('TITLE      TEST ');
        // });

        it('renders first countdown notification before scheduled time', async function () {
            let clock = sinon.useFakeTimers(moment().valueOf());
            let compareDate = moment().tz('Etc/UTC').add(4, 'minutes');
            let compareDateString = compareDate.format('YYYY-MM-DD');
            let compareTimeString = compareDate.format('HH:mm');
            this.server.create('post', {publishedAt: moment.utc().add(4, 'minutes'), status: 'scheduled', authors: [author]});
            this.server.create('setting', {timezone: 'Europe/Dublin'});
            clock.restore();

            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');
            expect(find('[data-test-date-time-picker-date-input]').value, 'scheduled date')
                .to.equal(compareDateString);
            expect(find('[data-test-date-time-picker-time-input]').value, 'scheduled time')
                .to.equal(compareTimeString);
            // Dropdown menu should be 'Update Post' and 'Unschedule'
            expect(find('[data-test-publishmenu-trigger]').textContent.trim(), 'text in save button for scheduled post')
                .to.equal('Scheduled');
            // expect countdown to show warning, that post is scheduled to be published
            expect(find('[data-test-schedule-countdown]').textContent.trim(), 'notification countdown')
                .to.match(/Scheduled to be published {2}in (4|5) minutes/);
        });

        it('shows author token input and allows changing of authors in PSM', async function () {
            let adminRole = this.server.create('role', {name: 'Adminstrator'});
            let authorRole = this.server.create('role', {name: 'Author'});
            let user1 = this.server.create('user', {name: 'Primary', roles: [adminRole]});
            this.server.create('user', {name: 'Waldo', roles: [authorRole]});
            this.server.create('post', {authors: [user1]});

            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');

            await click('button.post-settings');

            let tokens = findAll('[data-test-input="authors"] .ember-power-select-multiple-option');

            expect(tokens.length).to.equal(1);
            expect(tokens[0].textContent.trim()).to.have.string('Primary');

            await selectChoose('[data-test-input="authors"]', 'Waldo');

            let savedAuthors = this.server.schema.posts.find('1').authors.models;

            expect(savedAuthors.length).to.equal(2);
            expect(savedAuthors[0].name).to.equal('Primary');
            expect(savedAuthors[1].name).to.equal('Waldo');
        });

        it('autosaves when title loses focus', async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {name: 'Admin', roles: [role]});

            await visit('/editor');

            // NOTE: there were checks here for the title element having focus
            // but they were very temperamental whilst running tests in the
            // browser so they've been left out for now

            expect(
                currentURL(),
                'url on initial visit'
            ).to.equal('/editor/post');

            await click('[data-test-editor-title-input]');
            await blur('[data-test-editor-title-input]');

            expect(
                find('[data-test-editor-title-input]').value,
                'title value after autosave'
            ).to.equal('(Untitled)');

            expect(
                currentURL(),
                'url after autosave'
            ).to.equal('/editor/post/1');
        });

        it('saves post settings fields', async function () {
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);

            // TODO: implement tests for other fields

            await click('[data-test-psm-trigger]');

            // excerpt has validation
            await fillIn('[data-test-field="custom-excerpt"]', Array(302).join('a'));
            await blur('[data-test-field="custom-excerpt"]');

            expect(
                find('[data-test-error="custom-excerpt"]').textContent.trim(),
                'excerpt too long error'
            ).to.match(/cannot be longer than 300/);

            expect(
                this.server.db.posts.find(post.id).customExcerpt,
                'saved excerpt after validation error'
            ).to.be.null;

            // changing custom excerpt auto-saves
            await fillIn('[data-test-field="custom-excerpt"]', 'Testing excerpt');
            await blur('[data-test-field="custom-excerpt"]');

            expect(
                this.server.db.posts.find(post.id).customExcerpt,
                'saved excerpt'
            ).to.equal('Testing excerpt');

            // -------

            // open code injection subview
            await click('[data-test-button="codeinjection"]');

            // header injection has validation
            let headerCM = find('[data-test-field="codeinjection-head"] .CodeMirror').CodeMirror;
            await headerCM.setValue(Array(65540).join('a'));
            await click(headerCM.getInputField());
            await blur(headerCM.getInputField());

            expect(
                find('[data-test-error="codeinjection-head"]').textContent.trim(),
                'header injection too long error'
            ).to.match(/cannot be longer than 65535/);

            expect(
                this.server.db.posts.find(post.id).codeinjectionHead,
                'saved header injection after validation error'
            ).to.be.null;

            // changing header injection auto-saves
            await headerCM.setValue('<script src="http://example.com/inject-head.js"></script>');
            await click(headerCM.getInputField());
            await blur(headerCM.getInputField());

            expect(
                this.server.db.posts.find(post.id).codeinjectionHead,
                'saved header injection'
            ).to.equal('<script src="http://example.com/inject-head.js"></script>');

            // footer injection has validation
            let footerCM = find('[data-test-field="codeinjection-foot"] .CodeMirror').CodeMirror;
            await footerCM.setValue(Array(65540).join('a'));
            await click(footerCM.getInputField());
            await blur(footerCM.getInputField());

            expect(
                find('[data-test-error="codeinjection-foot"]').textContent.trim(),
                'footer injection too long error'
            ).to.match(/cannot be longer than 65535/);

            expect(
                this.server.db.posts.find(post.id).codeinjectionFoot,
                'saved footer injection after validation error'
            ).to.be.null;

            // changing footer injection auto-saves
            await footerCM.setValue('<script src="http://example.com/inject-foot.js"></script>');
            await click(footerCM.getInputField());
            await blur(footerCM.getInputField());

            expect(
                this.server.db.posts.find(post.id).codeinjectionFoot,
                'saved footer injection'
            ).to.equal('<script src="http://example.com/inject-foot.js"></script>');

            // closing subview switches back to main PSM view
            await click('[data-test-button="close-psm-subview"]');

            expect(
                findAll('[data-test-field="codeinjection-head"]').length,
                'header injection not present after closing subview'
            ).to.equal(0);

            // -------

            // open twitter data subview
            await click('[data-test-button="twitter-data"]');

            // twitter title has validation
            await click('[data-test-field="twitter-title"]');
            await fillIn('[data-test-field="twitter-title"]', Array(302).join('a'));
            await blur('[data-test-field="twitter-title"]');

            expect(
                find('[data-test-error="twitter-title"]').textContent.trim(),
                'twitter title too long error'
            ).to.match(/cannot be longer than 300/);

            expect(
                this.server.db.posts.find(post.id).twitterTitle,
                'saved twitter title after validation error'
            ).to.be.null;

            // changing twitter title auto-saves
            // twitter title has validation
            await click('[data-test-field="twitter-title"]');
            await fillIn('[data-test-field="twitter-title"]', 'Test Twitter Title');
            await blur('[data-test-field="twitter-title"]');

            expect(
                this.server.db.posts.find(post.id).twitterTitle,
                'saved twitter title'
            ).to.equal('Test Twitter Title');

            // twitter description has validation
            await click('[data-test-field="twitter-description"]');
            await fillIn('[data-test-field="twitter-description"]', Array(505).join('a'));
            await blur('[data-test-field="twitter-description"]');

            expect(
                find('[data-test-error="twitter-description"]').textContent.trim(),
                'twitter description too long error'
            ).to.match(/cannot be longer than 500/);

            expect(
                this.server.db.posts.find(post.id).twitterDescription,
                'saved twitter description after validation error'
            ).to.be.null;

            // changing twitter description auto-saves
            // twitter description has validation
            await click('[data-test-field="twitter-description"]');
            await fillIn('[data-test-field="twitter-description"]', 'Test Twitter Description');
            await blur('[data-test-field="twitter-description"]');

            expect(
                this.server.db.posts.find(post.id).twitterDescription,
                'saved twitter description'
            ).to.equal('Test Twitter Description');

            // closing subview switches back to main PSM view
            await click('[data-test-button="close-psm-subview"]');

            expect(
                findAll('[data-test-field="twitter-title"]').length,
                'twitter title not present after closing subview'
            ).to.equal(0);

            // -------

            // open facebook data subview
            await click('[data-test-button="facebook-data"]');

            // facebook title has validation
            await click('[data-test-field="og-title"]');
            await fillIn('[data-test-field="og-title"]', Array(302).join('a'));
            await blur('[data-test-field="og-title"]');

            expect(
                find('[data-test-error="og-title"]').textContent.trim(),
                'facebook title too long error'
            ).to.match(/cannot be longer than 300/);

            expect(
                this.server.db.posts.find(post.id).ogTitle,
                'saved facebook title after validation error'
            ).to.be.null;

            // changing facebook title auto-saves
            // facebook title has validation
            await click('[data-test-field="og-title"]');
            await fillIn('[data-test-field="og-title"]', 'Test Facebook Title');
            await blur('[data-test-field="og-title"]');

            expect(
                this.server.db.posts.find(post.id).ogTitle,
                'saved facebook title'
            ).to.equal('Test Facebook Title');

            // facebook description has validation
            await click('[data-test-field="og-description"]');
            await fillIn('[data-test-field="og-description"]', Array(505).join('a'));
            await blur('[data-test-field="og-description"]');

            expect(
                find('[data-test-error="og-description"]').textContent.trim(),
                'facebook description too long error'
            ).to.match(/cannot be longer than 500/);

            expect(
                this.server.db.posts.find(post.id).ogDescription,
                'saved facebook description after validation error'
            ).to.be.null;

            // changing facebook description auto-saves
            // facebook description has validation
            await click('[data-test-field="og-description"]');
            await fillIn('[data-test-field="og-description"]', 'Test Facebook Description');
            await blur('[data-test-field="og-description"]');

            expect(
                this.server.db.posts.find(post.id).ogDescription,
                'saved facebook description'
            ).to.equal('Test Facebook Description');

            // closing subview switches back to main PSM view
            await click('[data-test-button="close-psm-subview"]');

            expect(
                findAll('[data-test-field="og-title"]').length,
                'facebook title not present after closing subview'
            ).to.equal(0);
        });
    });
});
