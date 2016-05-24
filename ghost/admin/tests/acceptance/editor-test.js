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

describe('Acceptance: Editor', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/editor/1');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('does not redirect to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/editor/1');
        });
    });

    it('does not redirect to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/editor/1');
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
            let posts = server.createList('post', 3);

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

            // should not do anything if the input date is not different
            fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
            triggerEvent('input[name="post-setting-date"]', 'blur');

            andThen(() => {
                expect(find('input[name="post-setting-date"]').val(), 'date didn\'t change')
                    .to.equal('10 May 16 @ 10:00');
            });

            andThen(() => {
                expect(currentURL(), 'currentURL').to.equal('/editor/2');
                expect(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected')
                    .to.be.false;
                expect(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for published post')
                    .to.equal('Update Post');
                expect(find('.post-save-publish').hasClass('active'), 'highlights the default active button state for a published post')
                    .to.be.true;
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

            // go to settings to change the timezone
            visit('/settings/general');

            andThen(() => {
                expect(currentURL(), 'currentURL for settings')
                    .to.equal('/settings/general');
                expect(find('#activeTimezone option:selected').text().trim(), 'default timezone')
                    .to.equal('(GMT) Greenwich Mean Time : Dublin, Edinburgh, London');
                // select a new timezone
                find('#activeTimezone option[value="Pacific/Auckland"]').prop('selected', true);
            });

            triggerEvent('#activeTimezone select', 'change');
            // save the settings
            click('.view-header .btn.btn-blue');

            andThen(() => {
                expect(find('#activeTimezone option:selected').text().trim(), 'new timezone after saving')
                    .to.equal('(GMT +13:00) Auckland, Wellington');
            });

            // and now go back to the editor
            visit('/editor/2');

            andThen(() => {
                expect(currentURL(), 'currentURL in editor')
                    .to.equal('/editor/2');
                expect(find('input[name="post-setting-date"]').val(), 'date with timezone offset')
                    .to.equal('10 May 16 @ 21:00');
            });
        });
    });
});
