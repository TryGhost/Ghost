/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import {expect} from 'chai';
import testSelector from 'ember-test-selectors';
import $ from 'jquery';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import {invalidateSession, authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';

describe('Acceptance: Settings - General', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/general');

        andThen(function () {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/general');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/general');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

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

                expect(find(testSelector('save-button')).text().trim(), 'save button text').to.equal('Save settings');

                expect(find(testSelector('dated-permalinks-checkbox')).prop('checked'), 'date permalinks checkbox').to.be.false;
            });

            click(testSelector('toggle-pub-info'));
            fillIn(testSelector('title-input'), 'New Blog Title');
            click(testSelector('save-button'));

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
            click('.fullscreen-modal .modal-footer .gh-btn');

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });

            click('.blog-icon');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
            });

            click('.fullscreen-modal .modal-content .gh-image-uploader .image-cancel');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader .description').text()).to.equal('Upload an image');
            });

            // click cancel button
            click('.fullscreen-modal .modal-footer .gh-btn');

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });

            click('.blog-cover');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
            });

            click(testSelector('modal-accept-button'));

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });
        });

        it('renders timezone selector correctly', function () {
            visit('/settings/general');
            click(testSelector('toggle-timezone'));

            andThen(() => {
                expect(currentURL(), 'currentURL').to.equal('/settings/general');

                expect(find('#activeTimezone option').length, 'available timezones').to.equal(66);
                expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT) UTC');
                find('#activeTimezone option[value="Africa/Cairo"]').prop('selected', true);
            });

            triggerEvent('#activeTimezone', 'change');
            click(testSelector('save-button'));

            andThen(() => {
                expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT +2:00) Cairo, Egypt');
            });
        });

        it('handles private blog settings correctly', function () {
            visit('/settings/general');

            // handles private blog settings correctly
            andThen(() => {
                expect(find(testSelector('private-checkbox')).prop('checked'), 'isPrivate checkbox').to.be.false;
            });

            click(testSelector('private-checkbox'));

            andThen(() => {
                expect(find(testSelector('private-checkbox')).prop('checked'), 'isPrivate checkbox').to.be.true;
                expect(find(testSelector('password-input')).length, 'password input').to.equal(1);
                expect(find(testSelector('password-input')).val(), 'password default value').to.not.equal('');
            });

            fillIn(testSelector('password-input'), '');
            triggerEvent(testSelector('password-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('password-error')).text().trim(), 'empty password error')
                    .to.equal('Password must be supplied');
            });

            fillIn(testSelector('password-input'), 'asdfg');
            triggerEvent(testSelector('password-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('password-error')).text().trim(), 'present password error')
                    .to.equal('');
            });
        });

        it('handles social blog settings correctly', function () {
            visit('/settings/general');
            click(testSelector('toggle-social'));

            // validates a facebook url correctly
            andThen(() => {
                // loads fixtures and performs transform
                expect(find(testSelector('facebook-input')).val(), 'initial facebook value')
                    .to.equal('https://www.facebook.com/test');
            });

            triggerEvent(testSelector('facebook-input'), 'focus');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find(testSelector('facebook-input')).val(), 'facebook value after blur with no change')
                    .to.equal('https://www.facebook.com/test');
            });

            fillIn(testSelector('facebook-input'), 'facebook.com/username');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/username');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('facebook-input'), 'facebook.com/pages/some-facebook-page/857469375913?ref=ts');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('facebook-input'), '*(&*(%%))');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://www.facebook.com/yourPage');
            });

            fillIn(testSelector('facebook-input'), 'http://github.com/username');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/username');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('facebook-input'), 'http://github.com/pages/username');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/pages/username');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('facebook-input'), 'testuser');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/testuser');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('facebook-input'), 'ab99');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('Your Page name is not a valid Facebook Page name');
            });

            fillIn(testSelector('facebook-input'), 'page/ab99');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/page/ab99');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('facebook-input'), 'page/*(&*(%%))');
            triggerEvent(testSelector('facebook-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/page/*(&*(%%))');
                expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            // validates a twitter url correctly

            andThen(() => {
                // loads fixtures and performs transform
                expect(find(testSelector('twitter-input')).val(), 'initial twitter value')
                    .to.equal('https://twitter.com/test');
            });

            triggerEvent(testSelector('twitter-input'), 'focus');
            triggerEvent(testSelector('twitter-input'), 'blur');

            andThen(() => {
                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find(testSelector('twitter-input')).val(), 'twitter value after blur with no change')
                    .to.equal('https://twitter.com/test');
            });

            fillIn(testSelector('twitter-input'), 'twitter.com/username');
            triggerEvent(testSelector('twitter-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('twitter-input')).val()).to.be.equal('https://twitter.com/username');
                expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('twitter-input'), '*(&*(%%))');
            triggerEvent(testSelector('twitter-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://twitter.com/yourUsername');
            });

            fillIn(testSelector('twitter-input'), 'http://github.com/username');
            triggerEvent(testSelector('twitter-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('twitter-input')).val()).to.be.equal('https://twitter.com/username');
                expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn(testSelector('twitter-input'), 'thisusernamehasmorethan15characters');
            triggerEvent(testSelector('twitter-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                    .to.equal('Your Username is not a valid Twitter Username');
            });

            fillIn(testSelector('twitter-input'), 'testuser');
            triggerEvent(testSelector('twitter-input'), 'blur');

            andThen(() => {
                expect(find(testSelector('twitter-input')).val()).to.be.equal('https://twitter.com/testuser');
                expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                    .to.equal('');
            });
        });
    });
});
