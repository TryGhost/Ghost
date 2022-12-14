import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll, focus, triggerEvent} from '@ember/test-helpers';
import {expect} from 'chai';
import {keyDown} from 'ember-keyboard/test-support/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - General', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('redirects to home page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    it('redirects to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/general');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it renders, handles image uploads', async function () {
            await visit('/settings/general');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - General - Test Blog');

            // highlights nav menu
            expect(find('[data-test-nav="settings"]'), 'highlights nav menu item')
                .to.have.class('active');

            expect(
                find('[data-test-button="save"]').textContent.trim(),
                'save button text'
            ).to.equal('Save');

            await click('[data-test-toggle-pub-info]');
            await fillIn('[data-test-title-input]', 'New Blog Title');
            await click('[data-test-button="save"]');
            expect(document.title, 'page title').to.equal('Settings - General - New Blog Title');

            // CMD-S shortcut works
            // -------------------------------------------------------------- //
            await fillIn('[data-test-title-input]', 'CMD-S Test');
            await keyDown('cmd+s');
            // we've already saved in this test so there's no on-screen indication
            // that we've had another save, check the request was fired instead
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            let params = JSON.parse(lastRequest.requestBody);
            expect(params.settings.findBy('key', 'title').value).to.equal('CMD-S Test');
        });

        it('renders timezone selector correctly', async function () {
            await visit('/settings/general');
            await click('[data-test-toggle-timezone]');

            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            expect(findAll('#timezone option').length, 'available timezones').to.equal(66);
            expect(find('#timezone option:checked').textContent.trim()).to.equal('(GMT) UTC');
            find('#timezone option[value="Africa/Cairo"]').selected = true;

            await triggerEvent('#timezone', 'change');
            await click('[data-test-button="save"]');
            expect(find('#timezone option:checked').textContent.trim()).to.equal('(GMT +2:00) Cairo, Egypt');
        });

        it('handles private blog settings correctly', async function () {
            await visit('/settings/general');

            // handles private blog settings correctly
            expect(find('[data-test-private-checkbox]').checked, 'isPrivate checkbox').to.be.false;

            await click('[data-test-private-checkbox]');

            expect(find('[data-test-private-checkbox]').checked, 'isPrivate checkbox').to.be.true;
            expect(findAll('[data-test-password-input]').length, 'password input').to.equal(1);
            expect(find('[data-test-password-input]').value, 'password default value').to.not.equal('');

            await fillIn('[data-test-password-input]', '');
            await blur('[data-test-password-input]');

            expect(find('[data-test-password-error]').textContent.trim(), 'empty password error')
                .to.equal('Password must be supplied');

            await fillIn('[data-test-password-input]', 'asdfg');
            await blur('[data-test-password-input]');

            expect(find('[data-test-password-error]').textContent.trim(), 'present password error')
                .to.equal('');
        });

        it('handles social blog settings correctly', async function () {
            let testSocialInput = async function (type, input, expectedValue, expectedError = '') {
                await fillIn(`[data-test-${type}-input]`, input);
                await blur(`[data-test-${type}-input]`);

                expect(
                    find(`[data-test-${type}-input]`).value,
                    `${type} value for ${input}`
                ).to.equal(expectedValue);

                expect(
                    find(`[data-test-${type}-error]`).textContent.trim(),
                    `${type} validation response for ${input}`
                ).to.equal(expectedError);

                expect(
                    find(`[data-test-${type}-input]`).closest('.form-group').classList.contains('error'),
                    `${type} input should be in error state with '${input}'`
                ).to.equal(!!expectedError);
            };

            let testFacebookValidation = async (...args) => testSocialInput('facebook', ...args);
            let testTwitterValidation = async (...args) => testSocialInput('twitter', ...args);

            await visit('/settings/general');
            await click('[data-test-toggle-social]');

            // validates a facebook url correctly
            // loads fixtures and performs transform
            expect(find('[data-test-facebook-input]').value, 'initial facebook value')
                .to.equal('https://www.facebook.com/test');

            await focus('[data-test-facebook-input]');
            await blur('[data-test-facebook-input]');

            // regression test: we still have a value after the input is
            // focused and then blurred without any changes
            expect(find('[data-test-facebook-input]').value, 'facebook value after blur with no change')
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
            expect(find('[data-test-twitter-input]').value, 'initial twitter value')
                .to.equal('https://twitter.com/test');

            await focus('[data-test-twitter-input]');
            await blur('[data-test-twitter-input]');

            // regression test: we still have a value after the input is
            // focused and then blurred without any changes
            expect(find('[data-test-twitter-input]').value, 'twitter value after blur with no change')
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
                find('[data-test-private-checkbox]').checked,
                'private blog checkbox'
            ).to.be.false;

            await click('[data-test-toggle-pub-info]');
            await fillIn('[data-test-title-input]', 'New Blog Title');

            await click('[data-test-private-checkbox]');

            expect(
                find('[data-test-private-checkbox]').checked,
                'private blog checkbox'
            ).to.be.true;

            await visit('/settings/staff');

            expect(findAll('[data-test-modal="unsaved-settings"]').length, 'modal exists').to.equal(1);

            // Leave without saving
            await click('[data-test-leave-button]');

            expect(currentURL(), 'currentURL').to.equal('/settings/staff');

            await visit('/settings/general');

            expect(currentURL(), 'currentURL').to.equal('/settings/general');

            // settings were not saved
            expect(
                find('[data-test-private-checkbox]').checked,
                'private blog checkbox'
            ).to.be.false;

            expect(
                find('[data-test-title-input]').textContent.trim(),
                'Blog title'
            ).to.equal('');
        });
    });
});
