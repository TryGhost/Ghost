/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import $ from 'jquery';
import run from 'ember-runloop';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';

describe('Acceptance: Settings - General', function () {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/general');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/general');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/general');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('it renders, shows image uploader modals', function () {
            visit('/settings/general');

            andThen(() => {
                // has correct url
                expect(currentURL(), 'currentURL').to.equal('/settings/general');

                // has correct page title
                expect(document.title, 'page title').to.equal('Settings - General - Test Blog');

                // highlights nav menu
                expect($('.gh-nav-settings-general').hasClass('active'), 'highlights nav menu item')
                    .to.be.true;

                expect(find('.view-header .view-actions .btn-blue').text().trim(), 'save button text').to.equal('Save');

                // initial postsPerPage should be 5
                expect(find('input#postsPerPage').val(), 'post per page value').to.equal('5');

                expect(find('input#permalinks').prop('checked'), 'date permalinks checkbox').to.be.false;
            });

            fillIn('#settings-general input[name="general[title]"]', 'New Blog Title');
            click('.view-header .btn.btn-blue');

            andThen(() => {
                expect(document.title, 'page title').to.equal('Settings - General - New Blog Title');
            });

            click('.blog-logo');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
            });

            click('.fullscreen-modal .modal-content .gh-image-uploader .image-cancel');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader .description').text()).to.equal('Upload an image');
            });

            // click cancel button
            click('.fullscreen-modal .modal-footer .btn.btn-minor');

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });

            click('.blog-cover');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
            });

            click('.fullscreen-modal .modal-footer .js-button-accept');

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });

            // renders theme selector correctly
            andThen(() => {
                expect(find('#activeTheme select option').length, 'available themes').to.equal(1);
                expect(find('#activeTheme select option').text().trim()).to.equal('Blog - 1.0');
            });
        });

        it('renders timezone selector correctly', function () {
            visit('/settings/general');

            andThen(() => {
                expect(currentURL(), 'currentURL').to.equal('/settings/general');

                expect(find('#activeTimezone select option').length, 'available timezones').to.equal(66);
                expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT) UTC');
                find('#activeTimezone option[value="Africa/Cairo"]').prop('selected', true);
            });

            triggerEvent('#activeTimezone select', 'change');
            click('.view-header .btn.btn-blue');

            andThen(() => {
                expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT +2:00) Cairo, Egypt');
            });
        });

        it('handles private blog settings correctly', function () {
            visit('/settings/general');

            // handles private blog settings correctly
            andThen(() => {
                expect(find('input#isPrivate').prop('checked'), 'isPrivate checkbox').to.be.false;
            });

            click('input#isPrivate');

            andThen(() => {
                expect(find('input#isPrivate').prop('checked'), 'isPrivate checkbox').to.be.true;
                expect(find('#settings-general input[name="general[password]"]').length, 'password input').to.equal(1);
                expect(find('#settings-general input[name="general[password]"]').val(), 'password default value').to.not.equal('');
            });

            fillIn('#settings-general input[name="general[password]"]', '');
            triggerEvent('#settings-general input[name="general[password]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('Password must be supplied');
            });

            fillIn('#settings-general input[name="general[password]"]', 'asdfg');
            triggerEvent('#settings-general input[name="general[password]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            // validates a facebook url correctly

            andThen(() => {
                // loads fixtures and performs transform
                expect(find('input[name="general[facebook]"]').val(), 'initial facebook value')
                    .to.equal('https://www.facebook.com/test');
            });

            triggerEvent('#settings-general input[name="general[facebook]"]', 'focus');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find('input[name="general[facebook]"]').val(), 'facebook value after blur with no change')
                    .to.equal('https://www.facebook.com/test');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'facebook.com/username');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'facebook.com/pages/some-facebook-page/857469375913?ref=ts');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', '*(&*(%%))');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://www.facebook.com/yourPage');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'http://github.com/username');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'http://github.com/pages/username');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/pages/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'testuser');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/testuser');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'ab99');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('Your Page name is not a valid Facebook Page name');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'page/ab99');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/page/ab99');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'page/*(&*(%%))');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/page/*(&*(%%))');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            // validates a twitter url correctly

            andThen(() => {
                // loads fixtures and performs transform
                expect(find('input[name="general[twitter]"]').val(), 'initial twitter value')
                    .to.equal('https://twitter.com/test');
            });

            triggerEvent('#settings-general input[name="general[twitter]"]', 'focus');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find('input[name="general[twitter]"]').val(), 'twitter value after blur with no change')
                    .to.equal('https://twitter.com/test');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'twitter.com/username');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[twitter]"]', '*(&*(%%))');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://twitter.com/yourUsername');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'http://github.com/username');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'thisusernamehasmorethan15characters');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('Your Username is not a valid Twitter Username');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'testuser');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/testuser');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });
        });

    });
});
