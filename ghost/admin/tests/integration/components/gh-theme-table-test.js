import $ from 'jquery';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-theme-table', function () {
    setupComponentTest('gh-theme-table', {
        integration: true
    });

    it('renders', function () {
        this.set('themes', [
            {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
            {name: 'foo'}
        ]);
        this.set('actionHandler', sinon.spy());

        this.render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action actionHandler)
            deleteTheme=(action actionHandler)
        }}`);

        expect(this.$('[data-test-themes-list]').length, 'themes list is present').to.equal(1);
        expect(this.$('[data-test-theme-id]').length, 'number of rows').to.equal(4);

        let packageNames = this.$('[data-test-theme-title]').map((i, name) => $(name).text().trim()).toArray();

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
            this.$('[data-test-theme-active="true"]').find('[data-test-theme-title]').text().trim(),
            'active theme is highlighted'
        ).to.equal('Daring');

        expect(
            this.$('[data-test-theme-activate-button]').length === 3,
            'non-active themes have an activate link'
        ).to.be.true;

        expect(
            this.$('[data-test-theme-active="true"]').find('[data-test-theme-activate-button]').length === 0,
            'active theme doesn\'t have an activate link'
        ).to.be.true;

        expect(
            this.$('[data-test-theme-download-button]').length,
            'all themes have a download link'
        ).to.equal(4);

        expect(
            this.$('[data-test-theme-id="foo"]').find('[data-test-theme-delete-button]').length === 1,
            'non-active, non-casper theme has delete link'
        ).to.be.true;

        expect(
            this.$('[data-test-theme-id="casper"]').find('[data-test-theme-delete-button]').length === 0,
            'casper doesn\'t have delete link'
        ).to.be.true;

        expect(
            this.$('[data-test-theme-active="true"]').find('[data-test-theme-delete-button]').length === 0,
            'active theme doesn\'t have delete link'
        ).to.be.true;
    });

    it('delete link triggers passed in action', function () {
        let deleteAction = sinon.spy();
        let actionHandler = sinon.spy();

        this.set('themes', [
            {name: 'Foo', active: true},
            {name: 'Bar'}
        ]);
        this.set('deleteAction', deleteAction);
        this.set('actionHandler', actionHandler);

        this.render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action actionHandler)
            deleteTheme=(action deleteAction)
        }}`);

        run(() => {
            this.$('[data-test-theme-id="Bar"] [data-test-theme-delete-button]').click();
        });

        expect(deleteAction.calledOnce).to.be.true;
        expect(deleteAction.firstCall.args[0].name).to.equal('Bar');
    });

    it('download link triggers passed in action', function () {
        let downloadAction = sinon.spy();
        let actionHandler = sinon.spy();

        this.set('themes', [
            {name: 'Foo', active: true},
            {name: 'Bar'}
        ]);
        this.set('downloadAction', downloadAction);
        this.set('actionHandler', actionHandler);

        this.render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action downloadAction)
            deleteTheme=(action actionHandler)
        }}`);

        run(() => {
            this.$('[data-test-theme-id="Foo"] [data-test-theme-download-button]').click();
        });

        expect(downloadAction.calledOnce).to.be.true;
        expect(downloadAction.firstCall.args[0].name).to.equal('Foo');
    });

    it('activate link triggers passed in action', function () {
        let activateAction = sinon.spy();
        let actionHandler = sinon.spy();

        this.set('themes', [
            {name: 'Foo', active: true},
            {name: 'Bar'}
        ]);
        this.set('activateAction', activateAction);
        this.set('actionHandler', actionHandler);

        this.render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action activateAction)
            downloadTheme=(action actionHandler)
            deleteTheme=(action actionHandler)
        }}`);

        run(() => {
            this.$('[data-test-theme-id="Bar"] [data-test-theme-activate-button]').click();
        });

        expect(activateAction.calledOnce).to.be.true;
        expect(activateAction.firstCall.args[0].name).to.equal('Bar');
    });

    it('displays folder names if there are duplicate package names', function () {
        this.set('themes', [
            {name: 'daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'daring-0.1.5', package: {name: 'Daring', version: '0.1.4'}},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'another', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'mine', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'foo'}
        ]);
        this.set('actionHandler', sinon.spy());

        this.render(hbs`{{gh-theme-table
            themes=themes
            activateTheme=(action actionHandler)
            downloadTheme=(action actionHandler)
            deleteTheme=(action actionHandler)
        }}`);

        let packageNames = this.$('[data-test-theme-title]').map((i, name) => $(name).text().trim()).toArray();

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
