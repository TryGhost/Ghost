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

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('it renders, shows image uploader modals', async function () {
            await visit('/settings/general');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - General - Test Blog');

            // highlights nav menu
            expect($('.gh-nav-settings-general').hasClass('active'), 'highlights nav menu item')
                .to.be.true;

            expect(find(testSelector('save-button')).text().trim(), 'save button text').to.equal('Save settings');

            expect(find(testSelector('dated-permalinks-checkbox')).prop('checked'), 'date permalinks checkbox').to.be.false;

            await click(testSelector('toggle-pub-info'));
            await fillIn(testSelector('title-input'), 'New Blog Title');
            await click(testSelector('save-button'));
            expect(document.title, 'page title').to.equal('Settings - General - New Blog Title');

            await click('.blog-logo');
            expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);

            await click('.fullscreen-modal .modal-content .gh-image-uploader .image-cancel');
            expect(find(testSelector('file-input-description')).text()).to.equal('Upload an image');

            // click cancel button
            await click('.fullscreen-modal .modal-footer .gh-btn');
            expect(find('.fullscreen-modal').length).to.equal(0);

            await click('.blog-icon');
            expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);

            await click('.fullscreen-modal .modal-content .gh-image-uploader .image-cancel');
            expect(find(testSelector('file-input-description')).text()).to.equal('Upload an image');

            // click cancel button
            await click('.fullscreen-modal .modal-footer .gh-btn');
            expect(find('.fullscreen-modal').length).to.equal(0);

            await click('.blog-cover');
            expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);

            await click(testSelector('modal-accept-button'));
            expect(find('.fullscreen-modal').length).to.equal(0);
        });

        it('renders timezone selector correctly', async function () {
            await visit('/settings/general');
            await click(testSelector('toggle-timezone'));

            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            expect(find('#activeTimezone option').length, 'available timezones').to.equal(66);
            expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT) UTC');
            find('#activeTimezone option[value="Africa/Cairo"]').prop('selected', true);

            await triggerEvent('#activeTimezone', 'change');
            await click(testSelector('save-button'));
            expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT +2:00) Cairo, Egypt');
        });

        it('handles private blog settings correctly', async function () {
            await visit('/settings/general');

            // handles private blog settings correctly
            expect(find(testSelector('private-checkbox')).prop('checked'), 'isPrivate checkbox').to.be.false;

            await click(testSelector('private-checkbox'));

            expect(find(testSelector('private-checkbox')).prop('checked'), 'isPrivate checkbox').to.be.true;
            expect(find(testSelector('password-input')).length, 'password input').to.equal(1);
            expect(find(testSelector('password-input')).val(), 'password default value').to.not.equal('');

            await fillIn(testSelector('password-input'), '');
            await triggerEvent(testSelector('password-input'), 'blur');

            expect(find(testSelector('password-error')).text().trim(), 'empty password error')
                .to.equal('Password must be supplied');

            await fillIn(testSelector('password-input'), 'asdfg');
            await triggerEvent(testSelector('password-input'), 'blur');

            expect(find(testSelector('password-error')).text().trim(), 'present password error')
                .to.equal('');
        });

        it('handles social blog settings correctly', async function () {
            await visit('/settings/general');
            await click(testSelector('toggle-social'));

            // validates a facebook url correctly
            // loads fixtures and performs transform
            expect(find(testSelector('facebook-input')).val(), 'initial facebook value')
                .to.equal('https://www.facebook.com/test');

            await triggerEvent(testSelector('facebook-input'), 'focus');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            // regression test: we still have a value after the input is
            // focused and then blurred without any changes
            expect(find(testSelector('facebook-input')).val(), 'facebook value after blur with no change')
                .to.equal('https://www.facebook.com/test');

            await fillIn(testSelector('facebook-input'), 'facebook.com/username');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/username');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('facebook-input'), 'facebook.com/pages/some-facebook-page/857469375913?ref=ts');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('facebook-input'), '*(&*(%%))');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('The URL must be in a format like https://www.facebook.com/yourPage');

            await fillIn(testSelector('facebook-input'), 'http://github.com/username');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/username');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('facebook-input'), 'http://github.com/pages/username');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/pages/username');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('facebook-input'), 'testuser');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/testuser');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('facebook-input'), 'ab99');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('Your Page name is not a valid Facebook Page name');

            await fillIn(testSelector('facebook-input'), 'page/ab99');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/page/ab99');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('facebook-input'), 'page/*(&*(%%))');
            await triggerEvent(testSelector('facebook-input'), 'blur');

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/page/*(&*(%%))');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

            // validates a twitter url correctly

            // loads fixtures and performs transform
            expect(find(testSelector('twitter-input')).val(), 'initial twitter value')
                .to.equal('https://twitter.com/test');

            await triggerEvent(testSelector('twitter-input'), 'focus');
            await triggerEvent(testSelector('twitter-input'), 'blur');

            // regression test: we still have a value after the input is
            // focused and then blurred without any changes
            expect(find(testSelector('twitter-input')).val(), 'twitter value after blur with no change')
                .to.equal('https://twitter.com/test');

            await fillIn(testSelector('twitter-input'), 'twitter.com/username');
            await triggerEvent(testSelector('twitter-input'), 'blur');

            expect(find(testSelector('twitter-input')).val()).to.be.equal('https://twitter.com/username');
            expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('twitter-input'), '*(&*(%%))');
            await triggerEvent(testSelector('twitter-input'), 'blur');

            expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                .to.equal('The URL must be in a format like https://twitter.com/yourUsername');

            await fillIn(testSelector('twitter-input'), 'http://github.com/username');
            await triggerEvent(testSelector('twitter-input'), 'blur');

            expect(find(testSelector('twitter-input')).val()).to.be.equal('https://twitter.com/username');
            expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                .to.equal('');

            await fillIn(testSelector('twitter-input'), 'thisusernamehasmorethan15characters');
            await triggerEvent(testSelector('twitter-input'), 'blur');

            expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                .to.equal('Your Username is not a valid Twitter Username');

            await fillIn(testSelector('twitter-input'), 'testuser');
            await triggerEvent(testSelector('twitter-input'), 'blur');

            expect(find(testSelector('twitter-input')).val()).to.be.equal('https://twitter.com/testuser');
            expect(find(testSelector('twitter-error')).text().trim(), 'inline validation response')
                .to.equal('');
        });
    });
});
