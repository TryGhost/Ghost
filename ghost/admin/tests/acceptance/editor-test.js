/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import {expect} from 'chai';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import {invalidateSession, authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';
import sinon from 'sinon';
import testSelector from 'ember-test-selectors';
import {titleRendered} from '../helpers/editor-helpers';
import moment from 'moment';

describe('Acceptance: Editor', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        server.create('user'); // necesary for post-author association
        server.create('post');

        invalidateSession(application);
        visit('/editor/1');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('does not redirect to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});
        server.create('post');

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/editor/1');
        });
    });

    it('does not redirect to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});
        server.create('post');

        authenticateSession(application);
        visit('/editor/1');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/editor/1');
        });
    });

    it('displays 404 when post does not exist', function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

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
            server.create('user', {roles: [role]});
            server.loadFixtures('settings');

            return authenticateSession(application);
        });

        it('renders the editor correctly, PSM Publish Date and Save Button', function () {
            server.createList('post', 2);
            let futureTime = moment().tz('Etc/UTC').add(10, 'minutes');

            // post id 1 is a draft, checking for draft behaviour now
            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
            });

            // open post settings menu
            click(testSelector('psm-trigger'));

            // should error, if the publish time is in the wrong format
            fillIn(testSelector('date-time-picker-time-input'), 'foo');
            triggerEvent(testSelector('date-time-picker-time-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('date-time-picker-error')).text().trim(), 'inline error response for invalid time')
                    .to.equal('Must be in format: "15:00"');
            });

            // should error, if the publish time is in the future
            fillIn(testSelector('date-time-picker-time-input'), futureTime.format('HH:mm'));
            triggerEvent(testSelector('date-time-picker-time-input'), 'blur');
            datepickerSelect(testSelector('date-time-picker-datepicker'), futureTime);

            andThen(() => {
                expect(find(testSelector('date-time-picker-error')).text().trim(), 'inline error response for future time')
                    .to.equal('Must be in the past');
            });

            // saves the post with the new date
            let validTime = moment('2017-04-09 12:00');
            fillIn(testSelector('date-time-picker-time-input'), validTime.format('HH:mm'));
            triggerEvent(testSelector('date-time-picker-time-input'), 'blur');
            datepickerSelect(testSelector('date-time-picker-datepicker'), validTime);

            // hide psm
            click(testSelector('psm-trigger'));

            // checking the flow of the saving button for a draft
            andThen(() => {
                expect(
                    find(testSelector('publishmenu-trigger')).text().trim(),
                    'draft publish button text'
                ).to.equal('Publish');

                expect(
                    find(testSelector('editor-post-status')).text().trim(),
                    'draft status text'
                ).to.equal('Draft');
            });

            // click on publish now
            click(testSelector('publishmenu-trigger'));

            andThen(() => {
                expect(
                    find(testSelector('publishmenu-draft')),
                    'draft publish menu is shown'
                ).to.exist;
            });

            // Publish the post
            click(testSelector('publishmenu-save'));

            andThen(() => {
                expect(
                    find(testSelector('publishmenu-published')),
                    'publish menu is shown after draft published'
                ).to.exist;

                expect(
                    find(testSelector('editor-post-status')).text().trim(),
                    'post status updated after draft published'
                ).to.equal('Published');
            });

            // post id 2 is a published post, checking for published post behaviour now
            visit('/editor/2');

            andThen(() => {
                expect(currentURL(), 'currentURL').to.equal('/editor/2');
                expect(find(testSelector('date-time-picker-date-input')).val()).to.equal('12/19/2015');
                expect(find(testSelector('date-time-picker-time-input')).val()).to.equal('16:25');
            });

            // saves the post with a new date
            datepickerSelect(testSelector('date-time-picker-datepicker'), moment('2016-05-10 10:00'));
            fillIn(testSelector('date-time-picker-time-input'), '10:00');
            triggerEvent(testSelector('date-time-picker-time-input'), 'blur');
            // saving
            click(testSelector('publishmenu-trigger'));
            click(testSelector('publishmenu-save'));

            // go to settings to change the timezone
            visit('/settings/general');
            click(testSelector('toggle-timezone'));

            andThen(() => {
                expect(currentURL(), 'currentURL for settings')
                    .to.equal('/settings/general');
                expect(find('#activeTimezone option:selected').text().trim(), 'default timezone')
                    .to.equal('(GMT) UTC');
                // select a new timezone
                find('#activeTimezone option[value="Pacific/Kwajalein"]').prop('selected', true);
            });

            triggerEvent('#activeTimezone', 'change');
            // save the settings
            click('.gh-btn.gh-btn-blue');

            andThen(() => {
                expect(find('#activeTimezone option:selected').text().trim(), 'new timezone after saving')
                    .to.equal('(GMT +12:00) International Date Line West');
            });

            // and now go back to the editor
            visit('/editor/2');

            andThen(() => {
                expect(currentURL(), 'currentURL in editor')
                    .to.equal('/editor/2');

                expect(
                    find(testSelector('date-time-picker-date-input')).val(),
                    'date after timezone change'
                ).to.equal('05/10/2016');

                expect(
                    find(testSelector('date-time-picker-time-input')).val(),
                    'time after timezone change'
                ).to.equal('22:00');
            });

            // unpublish
            click(testSelector('publishmenu-trigger'));
            click(testSelector('publishmenu-unpublished-option'));
            click(testSelector('publishmenu-save'));

            andThen(() => {
                expect(
                    find(testSelector('publishmenu-draft')),
                    'draft menu is shown after unpublished'
                ).to.exist;

                expect(
                    find(testSelector('editor-post-status')).text().trim(),
                    'post status updated after unpublished'
                ).to.equal('Draft');
            });

            // schedule post
            click(testSelector('publishmenu-cancel'));
            click(testSelector('publishmenu-trigger'));

            let newFutureTime = moment.tz('Pacific/Kwajalein').add(10, 'minutes');
            click(testSelector('publishmenu-scheduled-option'));
            datepickerSelect(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-datepicker')}`, newFutureTime);
            click(testSelector('publishmenu-save'));
            click(testSelector('publishmenu-cancel'));

            andThen(() => {
                expect(
                    find(testSelector('publishmenu-scheduled')),
                    'publish menu is not shown after closed'
                ).to.not.exist;

                expect(
                    find(testSelector('publishmenu-trigger')).text().trim(),
                    'scheduled publish button text'
                ).to.equal('Scheduled');

                expect(
                    find(testSelector('editor-post-status')).text().trim(),
                    'scheduled status text'
                ).to.equal('Scheduled');
            });

            andThen(() => {
                // expect countdown to show warning, that post will be published in x minutes
                expect(find(testSelector('schedule-countdown')).text().trim(), 'notification countdown')
                    .to.contain('Post will be published in');
            });

            // unschedule
            click(testSelector('publishmenu-trigger'));
            click(testSelector('publishmenu-draft-option'));
            click(testSelector('publishmenu-save'));
            click(testSelector('publishmenu-cancel'));

            andThen(() => {
                expect(
                    find(testSelector('publishmenu-trigger')).text().trim(),
                    'publish button text after unschedule'
                ).to.equal('Publish');

                expect(
                    find(testSelector('editor-post-status')).text().trim(),
                    'status text after unschedule'
                ).to.equal('Draft');

                expect(
                    find(testSelector('schedule-countdown')),
                    'scheduled countdown after unschedule'
                ).to.not.exist;
            });
        });

        it('handles validation errors when scheduling', function () {
            server.put('/posts/:id/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [{
                        errorType: 'ValidationError',
                        message: 'Error test'
                    }]
                });
            });

            let post = server.create('post', 1);
            let plusTenMin = moment().utc().add(10, 'minutes');

            visit(`/editor/${post.id}`);

            click(testSelector('publishmenu-trigger'));
            click(testSelector('publishmenu-scheduled-option'));
            datepickerSelect(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-datepicker')}`, plusTenMin);
            fillIn(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-time-input')}`, plusTenMin.format('HH:mm'));
            triggerEvent(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-time-input')}`, 'blur');
            click(testSelector('publishmenu-save'));

            andThen(() => {
                expect(
                    find('.gh-alert').length,
                    'number of alerts after failed schedule'
                ).to.equal(1);

                expect(
                    find('.gh-alert').text(),
                    'alert text after failed schedule'
                ).to.match(/Saving failed: Error test/);
            });
        });

        it('handles title validation errors correctly', function () {
            server.createList('post', 1);

            // post id 1 is a draft, checking for draft behaviour now
            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
            });

            andThen(() => {
                titleRendered();
            });

            andThen(() => {
                let title = find('#gh-editor-title div');
                title.html(Array(160).join('a'));
            });

            andThen(() => {
                click(testSelector('publishmenu-trigger'));
                click(testSelector('publishmenu-save'));
            });

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

        it('if title is blank it correctly shows the placeholder', function () {
            server.createList('post', 1);

            // post id 1 is a draft, checking for draft behaviour now
            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
            });

            andThen(() => {
                titleRendered();
            });

            andThen(() => {
                let title = find('#gh-editor-title div');
                expect(title.data('placeholder')).to.equal('Your Post Title');
                expect(title.hasClass('no-content')).to.be.false;
                title.html('');
            });

            andThen(() => {
                let title = find('#gh-editor-title div');
                expect(title.hasClass('no-content')).to.be.true;
                title.html('test');
            });

            andThen(() => {
                let title = find('#gh-editor-title div');
                expect(title.hasClass('no-content')).to.be.false;
            });
        });

        it('renders first countdown notification before scheduled time', function () {
            let clock = sinon.useFakeTimers(moment().valueOf());
            let compareDate = moment().tz('Etc/UTC').add(4, 'minutes');
            let compareDateString = compareDate.format('MM/DD/YYYY');
            let compareTimeString = compareDate.format('HH:mm');
            server.create('post', {publishedAt: moment.utc().add(4, 'minutes'), status: 'scheduled'});
            server.create('setting', {activeTimezone: 'Europe/Dublin'});
            clock.restore();

            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
                expect(find(testSelector('date-time-picker-date-input')).val(), 'scheduled date')
                    .to.equal(compareDateString);
                expect(find(testSelector('date-time-picker-time-input')).val(), 'scheduled time')
                    .to.equal(compareTimeString);
                // Dropdown menu should be 'Update Post' and 'Unschedule'
                expect(find(testSelector('publishmenu-trigger')).text().trim(), 'text in save button for scheduled post')
                    .to.equal('Scheduled');
                // expect countdown to show warning, that post will be published in x minutes
                expect(find(testSelector('schedule-countdown')).text().trim(), 'notification countdown')
                    .to.contain('Post will be published in');
            });
        });

        it('shows author list and allows switching of author in PSM', function () {
            server.create('post', {authorId: 1});
            let role = server.create('role', {name: 'Author'});
            let author = server.create('user', {name: 'Waldo', roles: [role]});

            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
            });

            click('button.post-settings');

            andThen(() => {
                expect(find('select[name="post-setting-author"]').val()).to.equal('1');
                expect(find('select[name="post-setting-author"] option[value="2"]')).to.be.ok;
            });

            fillIn('select[name="post-setting-author"]', '2');

            andThen(() => {
                expect(find('select[name="post-setting-author"]').val()).to.equal('2');
                expect(server.db.posts[0].authorId).to.equal(author.id);
            });
        });
    });
});
