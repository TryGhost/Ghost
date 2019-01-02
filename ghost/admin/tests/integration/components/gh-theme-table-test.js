import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-theme-table', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('themes', [
            {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
            {name: 'foo'}
        ]);
        this.set('actionHandler', sinon.spy());

        await render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action actionHandler)
            deleteTheme=(action actionHandler)
        }}`);

        expect(findAll('[data-test-themes-list]').length, 'themes list is present').to.equal(1);
        expect(findAll('[data-test-theme-id]').length, 'number of rows').to.equal(4);

        let packageNames = findAll('[data-test-theme-title]').map(name => name.textContent.trim());

        expect(
            packageNames,
            'themes are ordered by label, casper has "default"'
        ).to.deep.equal([
            'Casper (default)',
            'Daring',
            'foo',
            'Lanyon'
        ]);

        expect(
            find('[data-test-theme-active="true"]').querySelector('[data-test-theme-title]'),
            'active theme is highlighted'
        ).to.have.trimmed.text('Daring');

        expect(
            findAll('[data-test-theme-activate-button]').length,
            'non-active themes have an activate link'
        ).to.equal(3);

        expect(
            find('[data-test-theme-active="true"]').querySelector('[data-test-theme-activate-button]'),
            'active theme doesn\'t have an activate link'
        ).to.not.exist;

        expect(
            findAll('[data-test-theme-download-button]').length,
            'all themes have a download link'
        ).to.equal(4);

        expect(
            find('[data-test-theme-id="foo"]').querySelector('[data-test-theme-delete-button]'),
            'non-active, non-casper theme has delete link'
        ).to.exist;

        expect(
            find('[data-test-theme-id="casper"]').querySelector('[data-test-theme-delete-button]'),
            'casper doesn\'t have delete link'
        ).to.not.exist;

        expect(
            find('[data-test-theme-active="true"]').querySelector('[data-test-theme-delete-button]'),
            'active theme doesn\'t have delete link'
        ).to.not.exist;
    });

    it('delete link triggers passed in action', async function () {
        let deleteAction = sinon.spy();
        let actionHandler = sinon.spy();

        this.set('themes', [
            {name: 'Foo', active: true},
            {name: 'Bar'}
        ]);
        this.set('deleteAction', deleteAction);
        this.set('actionHandler', actionHandler);

        await render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action actionHandler)
            deleteTheme=(action deleteAction)
        }}`);

        await click('[data-test-theme-id="Bar"] [data-test-theme-delete-button]');

        expect(deleteAction.calledOnce).to.be.true;
        expect(deleteAction.firstCall.args[0].name).to.equal('Bar');
    });

    it('download link triggers passed in action', async function () {
        let downloadAction = sinon.spy();
        let actionHandler = sinon.spy();

        this.set('themes', [
            {name: 'Foo', active: true},
            {name: 'Bar'}
        ]);
        this.set('downloadAction', downloadAction);
        this.set('actionHandler', actionHandler);

        await render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action downloadAction)
            deleteTheme=(action actionHandler)
        }}`);

        await click('[data-test-theme-id="Foo"] [data-test-theme-download-button]');

        expect(downloadAction.calledOnce).to.be.true;
        expect(downloadAction.firstCall.args[0].name).to.equal('Foo');
    });

    it('activate link triggers passed in action', async function () {
        let activateAction = sinon.spy();
        let actionHandler = sinon.spy();

        this.set('themes', [
            {name: 'Foo', active: true},
            {name: 'Bar'}
        ]);
        this.set('activateAction', activateAction);
        this.set('actionHandler', actionHandler);

        await render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action activateAction)
            downloadTheme=(action actionHandler)
            deleteTheme=(action actionHandler)
        }}`);

        await click('[data-test-theme-id="Bar"] [data-test-theme-activate-button]');

        expect(activateAction.calledOnce).to.be.true;
        expect(activateAction.firstCall.args[0].name).to.equal('Bar');
    });

    it('displays folder names if there are duplicate package names', async function () {
        this.set('themes', [
            {name: 'daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'daring-0.1.5', package: {name: 'Daring', version: '0.1.4'}},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'another', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'mine', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'foo'}
        ]);
        this.set('actionHandler', sinon.spy());

        await render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action actionHandler)
            deleteTheme=(action actionHandler)
        }}`);

        let packageNames = findAll('[data-test-theme-title]').map(name => name.textContent.trim());

        expect(
            packageNames,
            'themes are ordered by label, folder names shown for duplicates'
        ).to.deep.equal([
            'Casper (another)',
            'Casper (default)',
            'Casper (mine)',
            'Daring (daring)',
            'Daring (daring-0.1.5)',
            'foo'
        ]);
    });
});
