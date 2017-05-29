/* jshint expr:true */
import $ from 'jquery';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../../helpers/destroy-app';
import mockUploads from '../../../mirage/config/uploads';
import run from 'ember-runloop';
import startApp from '../../helpers/start-app';
import testSelector from 'ember-test-selectors';
import wait from 'ember-test-helpers/wait';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

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

        it('it renders, handles image uploads', async function () {
            await visit('/settings/general');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - General - Test Blog');

            // highlights nav menu
            expect($('.gh-nav-settings-general').hasClass('active'), 'highlights nav menu item')
                .to.be.true;

            expect(
                find(testSelector('save-button')).text().trim(),
                'save button text'
            ).to.equal('Save settings');

            expect(
                find(testSelector('dated-permalinks-checkbox')).prop('checked'),
                'date permalinks checkbox'
            ).to.be.false;

            await click(testSelector('toggle-pub-info'));
            await fillIn(testSelector('title-input'), 'New Blog Title');
            await click(testSelector('save-button'));
            expect(document.title, 'page title').to.equal('Settings - General - New Blog Title');

            // blog icon upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find(testSelector('icon-img')).attr('src'),
                'initial icon src'
            ).to.equal('/content/images/2014/Feb/favicon.ico');

            // delete removes icon + shows button
            await click(testSelector('delete-image', 'icon'));
            expect(
                find(testSelector('icon-img')),
                'icon img after removal'
            ).to.not.exist;
            expect(
                find(testSelector('image-upload-btn', 'icon')),
                'icon upload button after removal'
            ).to.exist;

            // select file
            fileUpload(
                testSelector('file-input', 'icon'),
                ['test'],
                {name: 'pub-icon.ico', type: 'image/x-icon'}
            );

            // check progress bar exists during upload
            run.later(() => {
                expect(
                    find(`${testSelector('setting', 'icon')} ${testSelector('progress-bar')}`),
                    'icon upload progress bar'
                ).to.exist;
            }, 50);

            // wait for upload to finish and check image is shown
            await wait();
            expect(
                find(testSelector('icon-img')).attr('src'),
                'icon img after upload'
            ).to.match(/pub-icon\.ico$/);
            expect(
                find(testSelector('image-upload-btn', 'icon')),
                'icon upload button after upload'
            ).to.not.exist;

            // failed upload shows error
            server.post('/uploads/icon/', function () {
                return {
                    errors: [{
                        errorType: 'ValidationError',
                        message: 'Wrong icon size'
                    }]
                };
            }, 422);
            await click(testSelector('delete-image', 'icon'));
            await fileUpload(
                testSelector('file-input', 'icon'),
                ['test'],
                {name: 'pub-icon.ico', type: 'image/x-icon'}
            );
            expect(
                find(testSelector('error', 'icon')).text().trim(),
                'failed icon upload message'
            ).to.equal('Wrong icon size');

            // reset upload endpoints
            mockUploads(server);

            // blog logo upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find(testSelector('logo-img')).attr('src'),
                'initial logo src'
            ).to.equal('/content/images/2013/Nov/logo.png');

            // delete removes logo + shows button
            await click(testSelector('delete-image', 'logo'));
            expect(
                find(testSelector('logo-img')),
                'logo img after removal'
            ).to.not.exist;
            expect(
                find(testSelector('image-upload-btn', 'logo')),
                'logo upload button after removal'
            ).to.exist;

            // select file
            fileUpload(
                testSelector('file-input', 'logo'),
                ['test'],
                {name: 'pub-logo.png', type: 'image/png'}
            );

            // check progress bar exists during upload
            run.later(() => {
                expect(
                    find(`${testSelector('setting', 'logo')} ${testSelector('progress-bar')}`),
                    'logo upload progress bar'
                ).to.exist;
            }, 50);

            // wait for upload to finish and check image is shown
            await wait();
            expect(
                find(testSelector('logo-img')).attr('src'),
                'logo img after upload'
            ).to.match(/pub-logo\.png$/);
            expect(
                find(testSelector('image-upload-btn', 'logo')),
                'logo upload button after upload'
            ).to.not.exist;

            // failed upload shows error
            server.post('/uploads/', function () {
                return {
                    errors: [{
                        errorType: 'ValidationError',
                        message: 'Wrong logo size'
                    }]
                };
            }, 422);
            await click(testSelector('delete-image', 'logo'));
            await fileUpload(
                testSelector('file-input', 'logo'),
                ['test'],
                {name: 'pub-logo.png', type: 'image/png'}
            );
            expect(
                find(testSelector('error', 'logo')).text().trim(),
                'failed logo upload message'
            ).to.equal('Wrong logo size');

            // reset upload endpoints
            mockUploads(server);

            // blog cover upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find(testSelector('cover-img')).attr('src'),
                'initial coverImage src'
            ).to.equal('/content/images/2014/Feb/cover.jpg');

            // delete removes coverImage + shows button
            await click(testSelector('delete-image', 'coverImage'));
            expect(
                find(testSelector('coverImage-img')),
                'coverImage img after removal'
            ).to.not.exist;
            expect(
                find(testSelector('image-upload-btn', 'coverImage')),
                'coverImage upload button after removal'
            ).to.exist;

            // select file
            fileUpload(
                testSelector('file-input', 'coverImage'),
                ['test'],
                {name: 'pub-coverImage.png', type: 'image/png'}
            );

            // check progress bar exists during upload
            run.later(() => {
                expect(
                    find(`${testSelector('setting', 'coverImage')} ${testSelector('progress-bar')}`),
                    'coverImage upload progress bar'
                ).to.exist;
            }, 50);

            // wait for upload to finish and check image is shown
            await wait();
            expect(
                find(testSelector('cover-img')).attr('src'),
                'coverImage img after upload'
            ).to.match(/pub-coverImage\.png$/);
            expect(
                find(testSelector('image-upload-btn', 'coverImage')),
                'coverImage upload button after upload'
            ).to.not.exist;

            // failed upload shows error
            server.post('/uploads/', function () {
                return {
                    errors: [{
                        errorType: 'ValidationError',
                        message: 'Wrong coverImage size'
                    }]
                };
            }, 422);
            await click(testSelector('delete-image', 'coverImage'));
            await fileUpload(
                testSelector('file-input', 'coverImage'),
                ['test'],
                {name: 'pub-coverImage.png', type: 'image/png'}
            );
            expect(
                find(testSelector('error', 'coverImage')).text().trim(),
                'failed coverImage upload message'
            ).to.equal('Wrong coverImage size');

            // reset upload endpoints
            mockUploads(server);

            // CMD-S shortcut works
            // -------------------------------------------------------------- //
            await fillIn(testSelector('title-input'), 'CMD-S Test');
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });
            // we've already saved in this test so there's no on-screen indication
            // that we've had another save, check the request was fired instead
            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(lastRequest.requestBody);
            expect(params.settings.findBy('key', 'title').value).to.equal('CMD-S Test');
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

            expect(find(testSelector('facebook-input')).val()).to.be.equal('https://www.facebook.com/ab99');
            expect(find(testSelector('facebook-error')).text().trim(), 'inline validation response')
                .to.equal('');

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
