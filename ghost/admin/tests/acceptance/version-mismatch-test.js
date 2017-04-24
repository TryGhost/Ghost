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
import {authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {versionMismatchResponse} from 'ghost-admin/mirage/utils';
import testSelector from 'ember-test-selectors';

describe('Acceptance: Version Mismatch', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    describe('logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('displays an alert and disables navigation when saving', async function () {
            server.createList('post', 3);

            // mock the post save endpoint to return version mismatch
            server.put('/posts/:id', versionMismatchResponse);

            await visit('/');
            await click('.posts-list li:nth-of-type(2) a'); // select second post
            await click(testSelector('publishmenu-trigger'));
            await click(testSelector('publishmenu-save')); // "Save post"

            // has the refresh to update alert
            expect(find('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').text()).to.match(/refresh/);

            // try navigating back to the content list
            await click('.gh-nav-main-content');

            expect(currentPath()).to.equal('editor.edit');
        });

        it('displays alert and aborts the transition when navigating', async function () {
            await visit('/');

            // mock the tags endpoint to return version mismatch
            server.get('/tags/', versionMismatchResponse);

            await click('.gh-nav-settings-tags');

            // navigation is blocked on loading screen
            expect(currentPath()).to.equal('settings.tags_loading');

            // has the refresh to update alert
            expect(find('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').text()).to.match(/refresh/);
        });

        it('displays alert and aborts the transition when an ember-ajax error is thrown whilst navigating', async function () {
            server.get('/configuration/timezones/', versionMismatchResponse);

            await visit('/settings/tags');
            await click('.gh-nav-settings-general');

            // navigation is blocked
            expect(currentPath()).to.equal('settings.general_loading');

            // has the refresh to update alert
            expect(find('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').text()).to.match(/refresh/);
        });

        it('can be triggered when passed in to a component', async function () {
            server.post('/subscribers/csv/', versionMismatchResponse);

            await visit('/subscribers');
            await click('.gh-btn:contains("Import CSV")');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'test.csv'});

            // alert is shown
            expect(find('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').text()).to.match(/refresh/);
        });
    });

    describe('logged out', function () {
        it('displays alert', async function () {
            server.post('/authentication/token', versionMismatchResponse);

            await visit('/signin');
            await fillIn('[name="identification"]', 'test@example.com');
            await fillIn('[name="password"]', 'password');
            await click('.gh-btn-blue');

            // has the refresh to update alert
            expect(find('.gh-alert').length).to.equal(1);
            expect(find('.gh-alert').text()).to.match(/refresh/);
        });
    });
});
