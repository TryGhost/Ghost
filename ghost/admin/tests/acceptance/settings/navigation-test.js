import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentRouteName, currentURL, fillIn, find, findAll, triggerEvent, typeIn} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

// simulate jQuery's `:visible` pseudo-selector
function withText(elements) {
    return Array.from(elements).filter(elem => elem.textContent.trim() !== '');
}

describe('Acceptance: Settings - Navigation', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('can visit /settings/navigation', async function () {
            await visit('/settings/navigation');

            expect(currentRouteName()).to.equal('settings.navigation');
            expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');

            // fixtures contain two nav items, check for four rows as we
            // should have one extra that's blank for each navigation section
            expect(
                findAll('[data-test-navitem]').length,
                'navigation items count'
            ).to.equal(4);
        });

        it('saves navigation settings', async function () {
            await visit('/settings/navigation');
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
            await visit('/settings/navigation');
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
            await visit('/settings/navigation');
            await fillIn('[data-test-navitem="0"] [data-test-input="label"]', 'Test');
            await blur('[data-test-navitem="0"] [data-test-input="label"]');

            expect(find('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Test');

            await visit('/settings/code-injection');

            expect(findAll('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving';

            expect(currentURL(), 'currentURL').to.equal('/settings/code-injection');

            await visit('/settings/navigation');

            expect(find('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Home');
        });

        it('can add and remove items', async function () {
            await visit('/settings/navigation');
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
            await visit('/settings/navigation');
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
