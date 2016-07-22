/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';
import sinon from 'sinon';

describe('Acceptance: Editor', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        server.create('post');

        invalidateSession(application);
        visit('/editor/1');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('does not redirect to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});
        server.create('post');

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/editor/1');
        });
    });

    it('does not redirect to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});
        server.create('post');

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/editor/1');
        });
    });

    it('displays 404 when post does not exist', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentPath()).to.equal('error404');
            expect(currentURL()).to.equal('/editor/1');
        });
    });

    describe('when logged in', function () {

        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('renders the editor correctly, PSM Publish Date and Save Button', function () {
            let posts = server.createList('post', 2);
            let plusTenMinPacific = moment().tz('Pacific/Kwajalein').add(10, 'minutes').format('DD MMM YY @ HH:mm').toString();
            let plusTwoMinPacific = moment().tz('Pacific/Kwajalein').add(2, 'minutes').format('DD MMM YY @ HH:mm').toString();

            // post id 1 is a draft, checking for draft behaviour now
            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
            });

            // should error, if the date input is in a wrong format
            fillIn('input[name="post-setting-date"]', 'testdate');
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                expect(find('.ember-view.response').text().trim(), 'inline error response for invalid date')
                    .to.equal('Published Date must be a valid date with format: DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)');
            });

            // saves the post with the new date
            fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
            triggerEvent('input[name="post-setting-date"]', 'blur');
            // saving
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'date after saving')
                    .to.equal('10 May 16 @ 10:00');
            });

            // should not do anything if the input date is not different
            fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'date didn\'t change')
                    .to.equal('10 May 16 @ 10:00');
            });

            // checking the flow of the saving button for a draft
            andThen(() => {
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected')
                    .to.be.false;
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button')
                    .to.equal('Save Draft');
                expect(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a draft')
                    .to.be.true;
            });

            // click on publish now
            click('.post-save-publish a');

            andThen(() => {
                expect(find('.post-save-publish').hasClass('active'), 'highlights the selected active button state')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button to change from draft to published')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button after click on \'publish now\'')
                    .to.equal('Publish Now');
            });

            // Publish the post
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button after publishing')
                    .to.equal('Update Post');
                expect(find('.post-save-publish').hasClass('active'), 'highlights the default active button state for a published post')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected')
                    .to.be.false;
            });

            // post id 2 is a published post, checking for published post behaviour now
            visit('/editor/2');

            andThen(() => {
                expect(currentURL(), 'currentURL').to.equal('/editor/2');
                expect(find('input[name="post-setting-date"]').val()).to.equal('19 Dec 15 @ 16:25');
            });

            // should reset the date if the input field is blank
            fillIn('input[name="post-setting-date"]', '');
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'empty date input')
                .to.equal('');
            });

            // saving
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'date value restored')
                .to.equal('19 Dec 15 @ 16:25');
            });

            // saves the post with a new date
            fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
            triggerEvent('input[name="post-setting-date"]', 'blur');
            // saving
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'new date after saving')
                    .to.equal('10 May 16 @ 10:00');
            });

            // go to settings to change the timezone
            visit('/settings/general');

            andThen(() => {
                expect(currentURL(), 'currentURL for settings')
                    .to.equal('/settings/general');
                expect(find('#activeTimezone option:selected').text().trim(), 'default timezone')
                    .to.equal('(GMT) UTC');
                // select a new timezone
                find('#activeTimezone option[value="Pacific/Kwajalein"]').prop('selected', true);
            });

            triggerEvent('#activeTimezone select', 'change');
            // save the settings
            click('.view-header .btn.btn-blue');

            andThen(() => {
                expect(find('#activeTimezone option:selected').text().trim(), 'new timezone after saving')
                    .to.equal('(GMT +12:00) International Date Line West');
            });

            // and now go back to the editor
            visit('/editor/2');

            andThen(() => {
                expect(currentURL(), 'currentURL in editor')
                    .to.equal('/editor/2');
                expect(find('input[name="post-setting-date"]').val(), 'date with blog timezone')
                    .to.equal('10 May 16 @ 22:00');
            });

            // should not do anything if the input date is not different
            fillIn('input[name="post-setting-date"]', '10 May 16 @ 22:00');
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'date didn\'t change')
                    .to.equal('10 May 16 @ 22:00');
            });

            // click on unpublish
            click('.post-save-draft a');

            andThen(() => {
                expect(find('.post-save-draft').hasClass('active'), 'highlights the active button state for a draft')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button to change from published to draft')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for post to unpublish')
                    .to.equal('Unpublish');
            });

            // Unpublish the post
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for draft')
                    .to.equal('Save Draft');
                expect(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a draft')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected')
                    .to.be.false;
            });

            // Set the publish date 2 minute to the future to find an error message
            fillIn('input[name="post-setting-date"]', plusTwoMinPacific);
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                andThen(() => {
                    expect(find('.ember-view.response').text().trim(), 'inline error response for invalid date in future')
                        .to.equal('Must be at least 2 minutes from now.');
                });
            });

            // Set the publish date into the future (best to have it 10 minutes from now in the future)
            fillIn('input[name="post-setting-date"]', plusTenMinPacific);
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                expect(find('label[for="post-setting-date"]').text().trim(), 'label changes to \'Scheduled Date\'')
                    .to.equal('Scheduled Date');
            });

            // click on 'Schedule Post'
            click('.post-save-schedule a');

            // button should show 'schedule post'
            andThen(() => {
                expect(find('.post-save-schedule').hasClass('active'), 'highlights the active button state for a draft')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button to change from published to draft')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for post to schedule')
                    .to.equal('Schedule Post');
            });

            // click on schedule post and save
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                // Dropdown menu should be 'Update Post' and 'Unschedule'
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for scheduled post')
                    .to.equal('Update Post');
                expect(find('.post-save-schedule').hasClass('active'), 'highlights the default active button state for a scheduled post')
                    .to.be.true;
                expect(find('.post-save-draft').text().trim(), 'not active option should say \'Unschedule\'')
                    .to.equal('Unschedule');
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected')
                    .to.be.false;
                // expect countdown to show warning, that post will be published in x minutes
                expect(find('.gh-notification.gh-notification-schedule').text().trim(), 'notification countdown')
                    .to.contain('Post will be published in');
            });

            // click on 'Unschedule'
            click('.post-save-draft a');

            andThen(() => {
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button to unscheduled post')
                    .to.equal('Unschedule');
                expect(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a scheduled post')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button expected due to status change')
                    .to.be.true;
            });

            // click on unschedule post and save
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for a draft')
                    .to.equal('Save Draft');
                expect(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a draft post')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button expected due to status change')
                    .to.be.false;
                // expect no countdown notification after unscheduling
                expect(find('.gh-notification.gh-notification-schedule').text().trim(), 'notification countdown')
                    .to.equal('');
            });
        });

        it('handles validation errors when scheduling', function () {
            let saveCount = 0;

            server.put('/posts/:id/', function (db, request) {
                // we have three saves occurring here :-(
                // 1. Auto-save of draft
                // 2. Change of publish time
                // 3. Pressing the Schedule button
                saveCount++;
                if (saveCount === 3) {
                    return new Mirage.Response(422, {}, {
                        errors: [{
                            errorType: 'ValidationError',
                            message: 'Error test'
                        }]
                    });
                } else {
                    let {id} = request.params;
                    let [attrs] = JSON.parse(request.requestBody).posts;
                    delete attrs.id;

                    let post = db.posts.update(id, attrs);

                    return {
                        posts: [post]
                    };
                }
            });

            let post = server.create('post', 1);
            let plusTenMin = moment().add(10, 'minutes').format('DD MMM YY @ HH:mm').toString();

            visit(`/editor/${post.id}`);

            fillIn('input[name="post-setting-date"]', plusTenMin);
            triggerEvent('input[name="post-setting-date"]', 'blur');
            click('.post-save-schedule a');
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(
                    find('.gh-alert').length,
                    'number of alerts after failed schedule'
                ).to.equal(1);

                expect(
                    find('.gh-alert').text(),
                    'alert text after failed schedule'
                ).to.match(/Scheduling failed: Error test/);
            });
        });

        it('handles title validation errors correctly', function () {
            let post = server.createList('post', 1);

            // post id 1 is a draft, checking for draft behaviour now
            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
            });

            // Test title validation
            fillIn('input[id="entry-title"]', Array(160).join('a'));
            triggerEvent('input[id="entry-title"]', 'blur');
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(
                    find('.gh-alert').length,
                    'number of alerts after invalid title'
                ).to.equal(1);

                expect(
                    find('.gh-alert').text(),
                    'alert text after invalid title'
                ).to.match(/Title cannot be longer than 150 characters/);
            });
        });

        it('renders first countdown notification before scheduled time', function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            let clock = sinon.useFakeTimers(moment().valueOf());
            let post = server.create('post', {published_at: moment.utc().add(4, 'minutes'), status: 'scheduled'});
            let compareDate = moment().tz('Etc/UTC').add(4, 'minutes').format('DD MMM YY @ HH:mm').toString();
            let settings = server.create('setting', {activeTimezone: 'Europe/Dublin'});

            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
                expect(find('input[name="post-setting-date"]').val(), 'scheduled date')
                    .to.equal(compareDate);
                // Dropdown menu should be 'Update Post' and 'Unschedule'
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for scheduled post')
                    .to.equal('Update Post');
                expect(find('.post-save-schedule').hasClass('active'), 'highlights the default active button state for a scheduled post')
                    .to.be.true;
                expect(find('.post-save-draft').text().trim(), 'not active option should say \'Unschedule\'')
                    .to.equal('Unschedule');
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected')
                    .to.be.false;
                // expect countdown to show warning, that post will be published in x minutes
                expect(find('.gh-notification.gh-notification-schedule').text().trim(), 'notification countdown')
                    .to.contain('Post will be published in');
            });
            clock.restore();
        });

        it('only shows option to unschedule post 2 minutes before scheduled time', function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            let clock = sinon.useFakeTimers(moment().valueOf());
            let post = server.create('post', {published_at: moment.utc().add(2, 'minutes'), status: 'scheduled'});
            let compareDate = moment().tz('Europe/Dublin').add(2, 'minutes').format('DD MMM YY @ HH:mm').toString();
            let settings = server.create('setting', {activeTimezone: 'Europe/Dublin'});

            visit('/editor/1');

            andThen(() => {
                // Save button should say 'Unschedule'
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for scheduled post in status freeze mode')
                    .to.equal('Unschedule');
                // expect countdown to show warning, that post will be published in x minutes
                expect(find('.gh-notification.gh-notification-schedule').text().trim(), 'notification countdown')
                    .to.contain('Post will be published in');
                // no dropdown menu
                expect(find('.btn.btn-sm.dropdown-toggle').hasClass('active'), 'no dropdown menu')
                    .to.be.false;
            });

            clock.restore();
        });

        it('lets user unschedule the post shortly before scheduled date', function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            let clock = sinon.useFakeTimers(moment().valueOf());
            let post = server.create('post', {published_at: moment.utc().add(1, 'minute'), status: 'scheduled'});
            let compareDate = moment().tz('Europe/Dublin').add(1, 'minute').format('DD MMM YY @ HH:mm').toString();
            let settings = server.create('setting', {activeTimezone: 'Europe/Dublin'});

            visit('/editor/1');

            // change some text
            fillIn('.markdown-editor', 'Let\'s make some markdown changes');

            andThen(() => {
                // Save button should say 'Unschedule'
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for scheduled post in status freeze mode')
                    .to.equal('Unschedule');
                // expect countdown to show warning, that post will be published in x minutes
                expect(find('.gh-notification.gh-notification-schedule').text().trim(), 'notification countdown')
                    .to.contain('Post will be published in');
                // no dropdown menu
                expect(find('.btn.btn-sm.dropdown-toggle').hasClass('active'), 'no dropdown menu')
                    .to.be.false;
            });

            // click on Unschedule
            click('.view-header .btn.btn-sm.js-publish-button');

            andThen(() => {
                expect(find('.markdown-editor').val(), 'changed text in markdown editor')
                    .to.equal('Let\'s make some markdown changes');
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for a draft')
                    .to.equal('Save Draft');
                expect(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a draft post')
                    .to.be.true;
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button expected due to status change')
                    .to.be.false;
                // expect no countdown notification after unscheduling
                expect(find('.gh-notification.gh-notification-schedule').text().trim(), 'notification countdown')
                    .to.equal('');
            });

            clock.restore();
        });

    });
});
