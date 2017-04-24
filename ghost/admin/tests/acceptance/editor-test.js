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
import {titleRendered, replaceTitleHTML} from '../helpers/editor-helpers';
import moment from 'moment';

describe('Acceptance: Editor', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        server.create('user'); // necesary for post-author association
        server.create('post');

        invalidateSession(application);
        await visit('/editor/1');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('does not redirect to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});
        server.create('post');

        authenticateSession(application);
        await visit('/editor/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/1');
    });

    it('does not redirect to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});
        server.create('post');

        authenticateSession(application);
        await visit('/editor/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/1');
    });

    it('displays 404 when post does not exist', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/editor/1');

        expect(currentPath()).to.equal('error404');
        expect(currentURL()).to.equal('/editor/1');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});
            server.loadFixtures('settings');

            return authenticateSession(application);
        });

        it('renders the editor correctly, PSM Publish Date and Save Button', async function () {
            let [post1] = server.createList('post', 2);
            let futureTime = moment().tz('Etc/UTC').add(10, 'minutes');

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/1');

            // open post settings menu
            await click(testSelector('psm-trigger'));

            // should error, if the publish time is in the wrong format
            await fillIn(testSelector('date-time-picker-time-input'), 'foo');
            await triggerEvent(testSelector('date-time-picker-time-input'), 'blur');

            expect(find(testSelector('date-time-picker-error')).text().trim(), 'inline error response for invalid time')
                .to.equal('Must be in format: "15:00"');

            // should error, if the publish time is in the future
            // NOTE: date must be selected first, changing the time first will save
            // with the new time
            await datepickerSelect(testSelector('date-time-picker-datepicker'), moment.tz('Etc/UTC'));
            await fillIn(testSelector('date-time-picker-time-input'), futureTime.format('HH:mm'));
            await triggerEvent(testSelector('date-time-picker-time-input'), 'blur');

            expect(find(testSelector('date-time-picker-error')).text().trim(), 'inline error response for future time')
                .to.equal('Must be in the past');

            // closing the PSM will reset the invalid date/time
            await click(testSelector('close-settings-menu'));
            await click(testSelector('psm-trigger'));

            expect(
                find(testSelector('date-time-picker-error')).text().trim(),
                'date picker error after closing PSM'
            ).to.equal('');

            expect(
                find(testSelector('date-time-picker-date-input')).val(),
                'PSM date value after closing with invalid date'
            ).to.equal(moment(post1.publishedAt).format('MM/DD/YYYY'));

            expect(
                find(testSelector('date-time-picker-time-input')).val(),
                'PSM time value after closing with invalid date'
            ).to.equal(moment(post1.publishedAt).format('HH:mm'));

            // saves the post with the new date
            let validTime = moment('2017-04-09 12:00');
            await fillIn(testSelector('date-time-picker-time-input'), validTime.format('HH:mm'));
            await triggerEvent(testSelector('date-time-picker-time-input'), 'blur');
            await datepickerSelect(testSelector('date-time-picker-datepicker'), validTime);

            // hide psm
            await click(testSelector('psm-trigger'));

            // checking the flow of the saving button for a draft
            expect(
                find(testSelector('publishmenu-trigger')).text().trim(),
                'draft publish button text'
            ).to.equal('Publish');

            expect(
                find(testSelector('editor-post-status')).text().trim(),
                'draft status text'
            ).to.equal('Draft');

            // click on publish now
            await click(testSelector('publishmenu-trigger'));

            expect(
                find(testSelector('publishmenu-draft')),
                'draft publish menu is shown'
            ).to.exist;

            // Publish the post
            await click(testSelector('publishmenu-save'));

            expect(
                find(testSelector('publishmenu-published')),
                'publish menu is shown after draft published'
            ).to.exist;

            expect(
                find(testSelector('editor-post-status')).text().trim(),
                'post status updated after draft published'
            ).to.equal('Published');

            // post id 2 is a published post, checking for published post behaviour now
            await visit('/editor/2');

            expect(currentURL(), 'currentURL').to.equal('/editor/2');
            expect(find(testSelector('date-time-picker-date-input')).val()).to.equal('12/19/2015');
            expect(find(testSelector('date-time-picker-time-input')).val()).to.equal('16:25');

            // saves the post with a new date
            await datepickerSelect(testSelector('date-time-picker-datepicker'), moment('2016-05-10 10:00'));
            await fillIn(testSelector('date-time-picker-time-input'), '10:00');
            await triggerEvent(testSelector('date-time-picker-time-input'), 'blur');
            // saving
            await click(testSelector('publishmenu-trigger'));
            await click(testSelector('publishmenu-save'));

            // go to settings to change the timezone
            await visit('/settings/general');
            await click(testSelector('toggle-timezone'));

            expect(currentURL(), 'currentURL for settings')
                .to.equal('/settings/general');
            expect(find('#activeTimezone option:selected').text().trim(), 'default timezone')
                .to.equal('(GMT) UTC');

            // select a new timezone
            find('#activeTimezone option[value="Pacific/Kwajalein"]').prop('selected', true);

            await triggerEvent('#activeTimezone', 'change');
            // save the settings
            await click('.gh-btn.gh-btn-blue');

            expect(find('#activeTimezone option:selected').text().trim(), 'new timezone after saving')
                .to.equal('(GMT +12:00) International Date Line West');

            // and now go back to the editor
            await visit('/editor/2');

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

            // unpublish
            await click(testSelector('publishmenu-trigger'));
            await click(testSelector('publishmenu-unpublished-option'));
            await click(testSelector('publishmenu-save'));

            expect(
                find(testSelector('publishmenu-draft')),
                'draft menu is shown after unpublished'
            ).to.exist;

            expect(
                find(testSelector('editor-post-status')).text().trim(),
                'post status updated after unpublished'
            ).to.equal('Draft');

            // schedule post
            await click(testSelector('publishmenu-cancel'));
            await click(testSelector('publishmenu-trigger'));

            let newFutureTime = moment.tz('Pacific/Kwajalein').add(10, 'minutes');
            await click(testSelector('publishmenu-scheduled-option'));
            await datepickerSelect(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-datepicker')}`, newFutureTime);
            await click(testSelector('publishmenu-save'));
            await click(testSelector('publishmenu-cancel'));

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

            // expect countdown to show warning, that post will be published in x minutes
            expect(find(testSelector('schedule-countdown')).text().trim(), 'notification countdown')
                .to.contain('Post will be published in');

            // unschedule
            await click(testSelector('publishmenu-trigger'));
            await click(testSelector('publishmenu-draft-option'));
            await click(testSelector('publishmenu-save'));
            await click(testSelector('publishmenu-cancel'));

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

        it('handles validation errors when scheduling', async function () {
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

            await visit(`/editor/${post.id}`);

            await click(testSelector('publishmenu-trigger'));
            await click(testSelector('publishmenu-scheduled-option'));
            await datepickerSelect(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-datepicker')}`, plusTenMin);
            await fillIn(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-time-input')}`, plusTenMin.format('HH:mm'));
            await triggerEvent(`${testSelector('publishmenu-draft')} ${testSelector('date-time-picker-time-input')}`, 'blur');
            await click(testSelector('publishmenu-save'));

            expect(
                find('.gh-alert').length,
                'number of alerts after failed schedule'
            ).to.equal(1);

            expect(
                find('.gh-alert').text(),
                'alert text after failed schedule'
            ).to.match(/Saving failed: Error test/);
        });

        it('handles title validation errors correctly', async function () {
            server.createList('post', 1);

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/1');

            titleRendered();

            let title = find('#gh-editor-title div');
            title.html(Array(160).join('a'));

            await click(testSelector('publishmenu-trigger'));
            await click(testSelector('publishmenu-save'));

            expect(
                find('.gh-alert').length,
                'number of alerts after invalid title'
            ).to.equal(1);

            expect(
                find('.gh-alert').text(),
                'alert text after invalid title'
            ).to.match(/Title cannot be longer than 150 characters/);
        });

        it('inserts a placeholder if the title is blank', async function () {
            server.createList('post', 1);

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/1');

            titleRendered();

            let title = find('#gh-editor-title div');
            expect(title.data('placeholder')).to.equal('Your Post Title');
            expect(title.hasClass('no-content')).to.be.false;
            await title.html('');

            expect(title.hasClass('no-content')).to.be.true;
            await title.html('test');

            expect(title.hasClass('no-content')).to.be.false;
        });

        it('removes HTML from the title.', async function () {
            server.createList('post', 1);

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/1');

            titleRendered();

            let title = find('#gh-editor-title div');
            await replaceTitleHTML('<div>TITLE&nbsp;&#09;&nbsp;&thinsp;&ensp;&emsp;TEST</div>&nbsp;');
            expect(title.html()).to.equal('TITLE      TEST ');
        });

        it('renders first countdown notification before scheduled time', async function () {
            let clock = sinon.useFakeTimers(moment().valueOf());
            let compareDate = moment().tz('Etc/UTC').add(4, 'minutes');
            let compareDateString = compareDate.format('MM/DD/YYYY');
            let compareTimeString = compareDate.format('HH:mm');
            server.create('post', {publishedAt: moment.utc().add(4, 'minutes'), status: 'scheduled'});
            server.create('setting', {activeTimezone: 'Europe/Dublin'});
            clock.restore();

            await visit('/editor/1');

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

        it('shows author list and allows switching of author in PSM', async function () {
            server.create('post', {authorId: 1});
            let role = server.create('role', {name: 'Author'});
            let author = server.create('user', {name: 'Waldo', roles: [role]});

            await visit('/editor/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/1');

            await click('button.post-settings');

            expect(find('select[name="post-setting-author"]').val()).to.equal('1');
            expect(find('select[name="post-setting-author"] option[value="2"]')).to.be.ok;

            await fillIn('select[name="post-setting-author"]', '2');

            expect(find('select[name="post-setting-author"]').val()).to.equal('2');
            expect(server.db.posts[0].authorId).to.equal(author.id);
        });
    });
});
