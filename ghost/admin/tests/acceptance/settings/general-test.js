import $ from 'jquery';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../../helpers/destroy-app';
import mockUploads from '../../../mirage/config/uploads';
import startApp from '../../helpers/start-app';
import wait from 'ember-test-helpers/wait';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';
import {run} from '@ember/runloop';

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
                find('[data-test-save-button]').text().trim(),
                'save button text'
            ).to.equal('Save settings');

            expect(
                find('[data-test-dated-permalinks-checkbox]').prop('checked'),
                'date permalinks checkbox'
            ).to.be.false;

            await click('[data-test-toggle-pub-info]');
            await fillIn('[data-test-title-input]', 'New Blog Title');
            await click('[data-test-save-button]');
            expect(document.title, 'page title').to.equal('Settings - General - New Blog Title');

            // blog icon upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find('[data-test-icon-img]').attr('src'),
                'initial icon src'
            ).to.equal('/content/images/2014/Feb/favicon.ico');

            // delete removes icon + shows button
            await click('[data-test-delete-image="icon"]');
            expect(
                find('[data-test-icon-img]'),
                'icon img after removal'
            ).to.not.exist;
            expect(
                find('[data-test-image-upload-btn="icon"]'),
                'icon upload button after removal'
            ).to.exist;

            // select file
            fileUpload(
                '[data-test-file-input="icon"]',
                ['test'],
                {name: 'pub-icon.ico', type: 'image/x-icon'}
            );

            // check progress bar exists during upload
            run.later(() => {
                expect(
                    find('[data-test-setting="icon"] [data-test-progress-bar]'),
                    'icon upload progress bar'
                ).to.exist;
            }, 50);

            // wait for upload to finish and check image is shown
            await wait();
            expect(
                find('[data-test-icon-img]').attr('src'),
                'icon img after upload'
            ).to.match(/pub-icon\.ico$/);
            expect(
                find('[data-test-image-upload-btn="icon"]'),
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
            await click('[data-test-delete-image="icon"]');
            await fileUpload(
                '[data-test-file-input="icon"]',
                ['test'],
                {name: 'pub-icon.ico', type: 'image/x-icon'}
            );
            expect(
                find('[data-test-error="icon"]').text().trim(),
                'failed icon upload message'
            ).to.equal('Wrong icon size');

            // reset upload endpoints
            mockUploads(server);

            // blog logo upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find('[data-test-logo-img]').attr('src'),
                'initial logo src'
            ).to.equal('/content/images/2013/Nov/logo.png');

            // delete removes logo + shows button
            await click('[data-test-delete-image="logo"]');
            expect(
                find('[data-test-logo-img]'),
                'logo img after removal'
            ).to.not.exist;
            expect(
                find('[data-test-image-upload-btn="logo"]'),
                'logo upload button after removal'
            ).to.exist;

            // select file
            fileUpload(
                '[data-test-file-input="logo"]',
                ['test'],
                {name: 'pub-logo.png', type: 'image/png'}
            );

            // check progress bar exists during upload
            run.later(() => {
                expect(
                    find('[data-test-setting="logo"] [data-test-progress-bar]'),
                    'logo upload progress bar'
                ).to.exist;
            }, 50);

            // wait for upload to finish and check image is shown
            await wait();
            expect(
                find('[data-test-logo-img]').attr('src'),
                'logo img after upload'
            ).to.match(/pub-logo\.png$/);
            expect(
                find('[data-test-image-upload-btn="logo"]'),
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
            await click('[data-test-delete-image="logo"]');
            await fileUpload(
                '[data-test-file-input="logo"]',
                ['test'],
                {name: 'pub-logo.png', type: 'image/png'}
            );
            expect(
                find('[data-test-error="logo"]').text().trim(),
                'failed logo upload message'
            ).to.equal('Wrong logo size');

            // reset upload endpoints
            mockUploads(server);

            // blog cover upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find('[data-test-cover-img]').attr('src'),
                'initial coverImage src'
            ).to.equal('/content/images/2014/Feb/cover.jpg');

            // delete removes coverImage + shows button
            await click('[data-test-delete-image="coverImage"]');
            expect(
                find('[data-test-coverImage-img]'),
                'coverImage img after removal'
            ).to.not.exist;
            expect(
                find('[data-test-image-upload-btn="coverImage"]'),
                'coverImage upload button after removal'
            ).to.exist;

            // select file
            fileUpload(
                '[data-test-file-input="coverImage"]',
                ['test'],
                {name: 'pub-coverImage.png', type: 'image/png'}
            );

            // check progress bar exists during upload
            run.later(() => {
                expect(
                    find('[data-test-setting="coverImage"] [data-test-progress-bar]'),
                    'coverImage upload progress bar'
                ).to.exist;
            }, 50);

            // wait for upload to finish and check image is shown
            await wait();
            expect(
                find('[data-test-cover-img]').attr('src'),
                'coverImage img after upload'
            ).to.match(/pub-coverImage\.png$/);
            expect(
                find('[data-test-image-upload-btn="coverImage"]'),
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
            await click('[data-test-delete-image="coverImage"]');
            await fileUpload(
                '[data-test-file-input="coverImage"]',
                ['test'],
                {name: 'pub-coverImage.png', type: 'image/png'}
            );
            expect(
                find('[data-test-error="coverImage"]').text().trim(),
                'failed coverImage upload message'
            ).to.equal('Wrong coverImage size');

            // reset upload endpoints
            mockUploads(server);

            // CMD-S shortcut works
            // -------------------------------------------------------------- //
            await fillIn('[data-test-title-input]', 'CMD-S Test');
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
            await click('[data-test-toggle-timezone]');

            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            expect(find('#activeTimezone option').length, 'available timezones').to.equal(66);
            expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT) UTC');
            find('#activeTimezone option[value="Africa/Cairo"]').prop('selected', true);

            await triggerEvent('#activeTimezone', 'change');
            await click('[data-test-save-button]');
            expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT +2:00) Cairo, Egypt');
        });

        it('handles private blog settings correctly', async function () {
            await visit('/settings/general');

            // handles private blog settings correctly
            expect(find('[data-test-private-checkbox]').prop('checked'), 'isPrivate checkbox').to.be.false;

            await click('[data-test-private-checkbox]');

            expect(find('[data-test-private-checkbox]').prop('checked'), 'isPrivate checkbox').to.be.true;
            expect(find('[data-test-password-input]').length, 'password input').to.equal(1);
            expect(find('[data-test-password-input]').val(), 'password default value').to.not.equal('');

            await fillIn('[data-test-password-input]', '');
            await triggerEvent('[data-test-password-input]', 'blur');

            expect(find('[data-test-password-error]').text().trim(), 'empty password error')
                .to.equal('Password must be supplied');

            await fillIn('[data-test-password-input]', 'asdfg');
            await triggerEvent('[data-test-password-input]', 'blur');

            expect(find('[data-test-password-error]').text().trim(), 'present password error')
                .to.equal('');
        });

        it('handles social blog settings correctly', async function () {
            let testSocialInput = async function (type, input, expectedValue, expectedError = '') {
                await fillIn(`[data-test-${type}-input]`, input);
                await triggerEvent(`[data-test-${type}-input]`, 'blur');

                expect(
                    find(`[data-test-${type}-input]`).val(),
                    `${type} value for ${input}`
                ).to.equal(expectedValue);

                expect(
                    find(`[data-test-${type}-error]`).text().trim(),
                    `${type} validation response for ${input}`
                ).to.equal(expectedError);

                expect(
                    find(`[data-test-${type}-input]`).closest('.form-group').hasClass('error'),
                    `${type} input should be in error state with '${input}'`
                ).to.equal(!!expectedError);
            };

            let testFacebookValidation = async (...args) => testSocialInput('facebook', ...args);
            let testTwitterValidation = async (...args) => testSocialInput('twitter', ...args);

            await visit('/settings/general');
            await click('[data-test-toggle-social]');

            // validates a facebook url correctly
            // loads fixtures and performs transform
            expect(find('[data-test-facebook-input]').val(), 'initial facebook value')
                .to.equal('https://www.facebook.com/test');

            await triggerEvent('[data-test-facebook-input]', 'focus');
            await triggerEvent('[data-test-facebook-input]', 'blur');

            // regression test: we still have a value after the input is
            // focused and then blurred without any changes
            expect(find('[data-test-facebook-input]').val(), 'facebook value after blur with no change')
                .to.equal('https://www.facebook.com/test');

            await testFacebookValidation(
                'facebook.com/username',
                'https://www.facebook.com/username');

            await testFacebookValidation(
                'testuser',
                'https://www.facebook.com/testuser');

            await testFacebookValidation(
                'ab99',
                'https://www.facebook.com/ab99');

            await testFacebookValidation(
                'page/ab99',
                'https://www.facebook.com/page/ab99');

            await testFacebookValidation(
                'page/*(&*(%%))',
                'https://www.facebook.com/page/*(&*(%%))');

            await testFacebookValidation(
                'facebook.com/pages/some-facebook-page/857469375913?ref=ts',
                'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');

            await testFacebookValidation(
                'https://www.facebook.com/groups/savethecrowninn',
                'https://www.facebook.com/groups/savethecrowninn');

            await testFacebookValidation(
                'http://github.com/username',
                'http://github.com/username',
                'The URL must be in a format like https://www.facebook.com/yourPage');

            await testFacebookValidation(
                'http://github.com/pages/username',
                'http://github.com/pages/username',
                'The URL must be in a format like https://www.facebook.com/yourPage');

            // validates a twitter url correctly

            // loads fixtures and performs transform
            expect(find('[data-test-twitter-input]').val(), 'initial twitter value')
                .to.equal('https://twitter.com/test');

            await triggerEvent('[data-test-twitter-input]', 'focus');
            await triggerEvent('[data-test-twitter-input]', 'blur');

            // regression test: we still have a value after the input is
            // focused and then blurred without any changes
            expect(find('[data-test-twitter-input]').val(), 'twitter value after blur with no change')
                .to.equal('https://twitter.com/test');

            await testTwitterValidation(
                'twitter.com/username',
                'https://twitter.com/username');

            await testTwitterValidation(
                'testuser',
                'https://twitter.com/testuser');

            await testTwitterValidation(
                'http://github.com/username',
                'https://twitter.com/username');

            await testTwitterValidation(
                '*(&*(%%))',
                '*(&*(%%))',
                'The URL must be in a format like https://twitter.com/yourUsername');

            await testTwitterValidation(
                'thisusernamehasmorethan15characters',
                'thisusernamehasmorethan15characters',
                'Your Username is not a valid Twitter Username');
        });

        it('warns when leaving without saving', async function () {
            await visit('/settings/general');

            expect(
                find('[data-test-dated-permalinks-checkbox]').prop('checked'),
                'date permalinks checkbox'
            ).to.be.false;

            await click('[data-test-toggle-pub-info]');
            await fillIn('[data-test-title-input]', 'New Blog Title');

            await click('[data-test-dated-permalinks-checkbox]');

            expect(
                find('[data-test-dated-permalinks-checkbox]').prop('checked'),
                'dated permalink checkbox'
            ).to.be.true;

            await visit('/settings/team');

            expect(find('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await (click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving');

            expect(currentURL(), 'currentURL').to.equal('/settings/team');

            await visit('/settings/general');

            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            // settings were not saved
            expect(
                find('[data-test-dated-permalinks-checkbox]').prop('checked'),
                'date permalinks checkbox'
            ).to.be.false;

            expect(
                find('[data-test-title-input]').text().trim(),
                'Blog title'
            ).to.equal('');
        });
    });
});
