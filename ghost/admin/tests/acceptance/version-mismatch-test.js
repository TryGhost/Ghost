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

let versionMismatchResponse = function () {
    return new Mirage.Response(400, {}, {
        errors: [{
            errorType: 'VersionMismatchError',
            statusCode: 400
        }]
    });
};

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
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('displays an alert and disables navigation when saving', function () {
            server.createList('post', 3);

            // mock the post save endpoint to return version mismatch
            server.put('/posts/:id', versionMismatchResponse);

            visit('/');
            click('.posts-list li:nth-of-type(2) a'); // select second post
            click('.post-edit'); // preview edit button
            click('.js-publish-button'); // "Save post"

            andThen(() => {
                // has the refresh to update alert
                expect(find('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').text()).to.match(/refresh/);
            });

            // try navigating back to the content list
            click('.gh-nav-main-content');

            andThen(() => {
                expect(currentPath()).to.equal('editor.edit');
            });
        });

        it('displays alert and aborts the transition when navigating', function () {
            // mock the tags endpoint to return version mismatch
            server.get('/tags/', versionMismatchResponse);

            visit('/');
            click('.gh-nav-settings-tags');

            andThen(() => {
                // navigation is blocked
                expect(currentPath()).to.equal('posts.index');

                // has the refresh to update alert
                expect(find('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').text()).to.match(/refresh/);
            });
        });

        it('displays alert and aborts the transition when an ember-ajax error is thrown whilst navigating', function () {
            server.get('/configuration/timezones/', versionMismatchResponse);

            visit('/settings/tags');
            click('.gh-nav-settings-general');

            andThen(() => {
                // navigation is blocked
                expect(currentPath()).to.equal('settings.tags.index');

                // has the refresh to update alert
                expect(find('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').text()).to.match(/refresh/);
            });
        });

        it('can be triggered when passed in to a component', function () {
            server.post('/subscribers/csv/', versionMismatchResponse);

            visit('/subscribers');
            click('.btn:contains("Import CSV")');
            fileUpload('.fullscreen-modal input[type="file"]');

            andThen(() => {
                // alert is shown
                expect(find('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').text()).to.match(/refresh/);
            });
        });
    });

    describe('logged out', function () {
        it('displays alert', function () {
            server.post('/authentication/token', versionMismatchResponse);

            visit('/signin');
            fillIn('[name="identification"]', 'test@example.com');
            fillIn('[name="password"]', 'password');
            click('.btn-blue');

            andThen(() => {
                // has the refresh to update alert
                expect(find('.gh-alert').length).to.equal(1);
                expect(find('.gh-alert').text()).to.match(/refresh/);
            });
        });
    });
});
