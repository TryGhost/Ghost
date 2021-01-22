import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import mockUploads from '../../../mirage/config/uploads';
import wait from 'ember-test-helpers/wait';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentRouteName, currentURL, fillIn, find, findAll, triggerEvent, typeIn} from '@ember/test-helpers';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {run} from '@ember/runloop';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

// simulate jQuery's `:visible` pseudo-selector
function withText(elements) {
    return Array.from(elements).filter(elem => elem.textContent.trim() !== '');
}

describe('Acceptance: Settings - Design', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/staff/test-user');
    });

    it('redirects to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/staff/test-user');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('can visit /settings/design', async function () {
            await visit('/settings/design');

            expect(currentRouteName()).to.equal('settings.design.index');
            expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');

            // fixtures contain two nav items, check for four rows as we
            // should have one extra that's blank for each navigation section
            expect(
                findAll('[data-test-navitem]').length,
                'navigation items count'
            ).to.equal(4);
        });

        it('it renders, handles image uploads', async function () {
            await visit('/settings/design');

            // blog icon upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find('[data-test-icon-img]').getAttribute('src'),
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
                '[data-test-file-input="icon"] input',
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
                find('[data-test-icon-img]').getAttribute('src'),
                'icon img after upload'
            ).to.match(/pub-icon\.ico$/);
            expect(
                find('[data-test-image-upload-btn="icon"]'),
                'icon upload button after upload'
            ).to.not.exist;

            // failed upload shows error
            this.server.post('/images/upload/', function () {
                return {
                    errors: [{
                        type: 'ValidationError',
                        message: 'Wrong icon size'
                    }]
                };
            }, 422);
            await click('[data-test-delete-image="icon"]');
            await fileUpload(
                '[data-test-file-input="icon"] input',
                ['test'],
                {name: 'pub-icon.ico', type: 'image/x-icon'}
            );
            expect(
                find('[data-test-error="icon"]').textContent.trim(),
                'failed icon upload message'
            ).to.equal('Wrong icon size');

            // reset upload endpoints
            mockUploads(this.server);

            // blog logo upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find('[data-test-logo-img]').getAttribute('src'),
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
                '[data-test-file-input="logo"] input',
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
                find('[data-test-logo-img]').getAttribute('src'),
                'logo img after upload'
            ).to.match(/pub-logo\.png$/);
            expect(
                find('[data-test-image-upload-btn="logo"]'),
                'logo upload button after upload'
            ).to.not.exist;

            // failed upload shows error
            this.server.post('/images/upload/', function () {
                return {
                    errors: [{
                        type: 'ValidationError',
                        message: 'Wrong logo size'
                    }]
                };
            }, 422);
            await click('[data-test-delete-image="logo"]');
            await fileUpload(
                '[data-test-file-input="logo"] input',
                ['test'],
                {name: 'pub-logo.png', type: 'image/png'}
            );
            expect(
                find('[data-test-error="logo"]').textContent.trim(),
                'failed logo upload message'
            ).to.equal('Wrong logo size');

            // reset upload endpoints
            mockUploads(this.server);

            // blog cover upload
            // -------------------------------------------------------------- //

            // has fixture icon
            expect(
                find('[data-test-cover-img]').getAttribute('src'),
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
                '[data-test-file-input="coverImage"] input',
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
                find('[data-test-cover-img]').getAttribute('src'),
                'coverImage img after upload'
            ).to.match(/pub-coverImage\.png$/);
            expect(
                find('[data-test-image-upload-btn="coverImage"]'),
                'coverImage upload button after upload'
            ).to.not.exist;

            // failed upload shows error
            this.server.post('/images/upload/', function () {
                return {
                    errors: [{
                        type: 'ValidationError',
                        message: 'Wrong coverImage size'
                    }]
                };
            }, 422);
            await click('[data-test-delete-image="coverImage"]');
            await fileUpload(
                '[data-test-file-input="coverImage"] input',
                ['test'],
                {name: 'pub-coverImage.png', type: 'image/png'}
            );
            expect(
                find('[data-test-error="coverImage"]').textContent.trim(),
                'failed coverImage upload message'
            ).to.equal('Wrong coverImage size');

            // reset upload endpoints
            mockUploads(this.server);
        });

        it('saves navigation settings', async function () {
            await visit('/settings/design');
            await fillIn('#settings-navigation [data-test-navitem="0"] [data-test-input="label"]', 'Test');
            await typeIn('#settings-navigation [data-test-navitem="0"] [data-test-input="url"]', '/test');
            await click('[data-test-save-button]');

            let [navSetting] = this.server.db.settings.where({key: 'navigation'});

            expect(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]');

            // don't test against .error directly as it will pick up failed
            // tests "pre.error" elements
            expect(findAll('span.error').length, 'error messages count').to.equal(0);
            expect(findAll('.gh-alert').length, 'alerts count').to.equal(0);
            expect(withText(findAll('[data-test-error]')).length, 'validation errors count')
                .to.equal(0);
        });

        it('validates new item correctly on save', async function () {
            await visit('/settings/design');
            await click('[data-test-save-button]');

            expect(
                findAll('#settings-navigation [data-test-navitem]').length,
                'number of nav items after saving with blank new item'
            ).to.equal(3);

            await fillIn('#settings-navigation [data-test-navitem="new"] [data-test-input="label"]', 'Test');
            await fillIn('#settings-navigation [data-test-navitem="new"] [data-test-input="url"]', '');
            await typeIn('#settings-navigation [data-test-navitem="new"] [data-test-input="url"]', 'http://invalid domain/');

            await click('[data-test-save-button]');

            expect(
                findAll('#settings-navigation [data-test-navitem]').length,
                'number of nav items after saving with invalid new item'
            ).to.equal(3);

            expect(
                withText(findAll('#settings-navigation [data-test-navitem="new"] [data-test-error]')).length,
                'number of invalid fields in new item'
            ).to.equal(1);
        });

        it('clears unsaved settings when navigating away but warns with a confirmation dialog', async function () {
            await visit('/settings/design');
            await fillIn('[data-test-navitem="0"] [data-test-input="label"]', 'Test');
            await blur('[data-test-navitem="0"] [data-test-input="label"]');

            expect(find('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Test');

            await visit('/settings/code-injection');

            expect(findAll('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving';

            expect(currentURL(), 'currentURL').to.equal('/settings/code-injection');

            await visit('/settings/design');

            expect(find('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Home');
        });

        it('can add and remove items', async function () {
            await visit('/settings/design');
            await click('#settings-navigation .gh-blognav-add');

            expect(
                find('[data-test-navitem="new"] [data-test-error="label"]').textContent.trim(),
                'blank label has validation error'
            ).to.not.be.empty;

            await fillIn('[data-test-navitem="new"] [data-test-input="label"]', '');
            await typeIn('[data-test-navitem="new"] [data-test-input="label"]', 'New');

            expect(
                find('[data-test-navitem="new"] [data-test-error="label"]').textContent.trim(),
                'label validation is visible after typing'
            ).to.be.empty;

            await fillIn('[data-test-navitem="new"] [data-test-input="url"]', '');
            await typeIn('[data-test-navitem="new"] [data-test-input="url"]', '/new');
            await blur('[data-test-navitem="new"] [data-test-input="url"]');

            expect(
                find('[data-test-navitem="new"] [data-test-error="url"]').textContent.trim(),
                'url validation is visible after typing'
            ).to.be.empty;

            expect(
                find('[data-test-navitem="new"] [data-test-input="url"]').value
            ).to.equal(`${window.location.origin}/new/`);

            await click('.gh-blognav-add');

            expect(
                findAll('#settings-navigation [data-test-navitem]').length,
                'number of nav items after successful add'
            ).to.equal(4);

            expect(
                find('#settings-navigation [data-test-navitem="new"] [data-test-input="label"]').value,
                'new item label value after successful add'
            ).to.be.empty;

            expect(
                find('#settings-navigation [data-test-navitem="new"] [data-test-input="url"]').value,
                'new item url value after successful add'
            ).to.equal(`${window.location.origin}/`);

            expect(
                withText(findAll('[data-test-navitem] [data-test-error]')).length,
                'number or validation errors shown after successful add'
            ).to.equal(0);

            await click('#settings-navigation [data-test-navitem="0"] .gh-blognav-delete');

            expect(
                findAll('#settings-navigation [data-test-navitem]').length,
                'number of nav items after successful remove'
            ).to.equal(3);

            // CMD-S shortcut works
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [navSetting] = this.server.db.settings.where({key: 'navigation'});

            expect(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');
        });

        it('can also add and remove items from seconday nav', async function () {
            await visit('/settings/design');
            await click('#secondary-navigation .gh-blognav-add');

            expect(
                find('#secondary-navigation [data-test-navitem="new"] [data-test-error="label"]').textContent.trim(),
                'blank label has validation error'
            ).to.not.be.empty;

            await fillIn('#secondary-navigation [data-test-navitem="new"] [data-test-input="label"]', '');
            await typeIn('#secondary-navigation [data-test-navitem="new"] [data-test-input="label"]', 'Foo');

            expect(
                find('#secondary-navigation [data-test-navitem="new"] [data-test-error="label"]').textContent.trim(),
                'label validation is visible after typing'
            ).to.be.empty;

            await fillIn('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]', '');
            await typeIn('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]', '/bar');
            await blur('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]');

            expect(
                find('#secondary-navigation [data-test-navitem="new"] [data-test-error="url"]').textContent.trim(),
                'url validation is visible after typing'
            ).to.be.empty;

            expect(
                find('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]').value
            ).to.equal(`${window.location.origin}/bar/`);

            await click('[data-test-save-button]');

            expect(
                findAll('#secondary-navigation [data-test-navitem]').length,
                'number of nav items after successful add'
            ).to.equal(2);

            expect(
                find('#secondary-navigation [data-test-navitem="new"] [data-test-input="label"]').value,
                'new item label value after successful add'
            ).to.be.empty;

            expect(
                find('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]').value,
                'new item url value after successful add'
            ).to.equal(`${window.location.origin}/`);

            expect(
                withText(findAll('#secondary-navigation [data-test-navitem] [data-test-error]')).length,
                'number or validation errors shown after successful add'
            ).to.equal(0);

            let [navSetting] = this.server.db.settings.where({key: 'secondary_navigation'});

            expect(navSetting.value).to.equal('[{"label":"Foo","url":"/bar/"}]');

            await click('#secondary-navigation [data-test-navitem="0"] .gh-blognav-delete');

            expect(
                findAll('#secondary-navigation [data-test-navitem]').length,
                'number of nav items after successful remove'
            ).to.equal(1);

            // CMD-S shortcut works
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            [navSetting] = this.server.db.settings.where({key: 'secondary_navigation'});

            expect(navSetting.value).to.equal('[]');
        });
    });
});
