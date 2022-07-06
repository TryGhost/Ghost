import hbs from 'htmlbars-inline-precompile';
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

        await render(hbs`<GhThemeTable @themes={{themes}} />`);

        expect(findAll('[data-test-themes-list]').length, 'themes list is present').to.equal(1);
        expect(findAll('[data-test-theme-id]').length, 'number of rows').to.equal(4);

        let packageNames = findAll('[data-test-theme-title]').map(name => name.textContent.trim());

        expect(packageNames[0]).to.match(/Casper \(default\)/);
        expect(packageNames[1]).to.match(/Daring\s+Active/);
        expect(packageNames[2]).to.match(/foo/);
        expect(packageNames[3]).to.match(/Lanyon/);

        expect(
            find('[data-test-theme-active="true"]').querySelector('[data-test-theme-title]'),
            'active theme is highlighted'
        ).to.contain.text('Daring');

        expect(
            findAll('[data-test-button="activate"]').length,
            'non-active themes have an activate link'
        ).to.equal(3);

        expect(
            find('[data-test-theme-active="true"]').querySelector('[data-test-button="activate"]'),
            'active theme doesn\'t have an activate link'
        ).to.not.exist;
    });

    it('has download button in actions dropdown for all themes', async function () {
        const themes = [
            {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
            {name: 'foo'}
        ];
        this.set('themes', themes);

        await render(hbs`<GhThemeTable @themes={{themes}} />`);

        for (const theme of themes) {
            await click(`[data-test-theme-id="${theme.name}"] [data-test-button="actions"]`);
            expect(
                find(`[data-test-actions-for="${theme.name}"] [data-test-button="download"]`)
            ).to.exist;
        }
    });

    it('has delete button for non-active, non-default, themes', async function () {
        const themes = [
            {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}},
            {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
            {name: 'foo'}
        ];
        this.set('themes', themes);

        await render(hbs`<GhThemeTable @themes={{themes}} />`);

        for (const theme of themes) {
            await click(`[data-test-theme-id="${theme.name}"] [data-test-button="actions"]`);
            expect(
                find(`[data-test-actions-for="${theme.name}"] [data-test-button="delete"]`)
            ).to.exist;
        }
    });

    it('does not show delete action for casper', async function () {
        const themes = [
            {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
            {name: 'foo'}
        ];
        this.set('themes', themes);

        await render(hbs`<GhThemeTable @themes={{themes}} />`);

        await click(`[data-test-theme-id="casper"] [data-test-button="actions"]`);
        expect(find('[data-test-actions-for="casper"]')).to.exist;
        expect(
            find(`[data-test-actions-for="casper"] [data-test-button="delete"]`)
        ).to.not.exist;
    });

    it('does not show delete action for active theme', async function () {
        const themes = [
            {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
            {name: 'foo'}
        ];
        this.set('themes', themes);

        await render(hbs`<GhThemeTable @themes={{themes}} />`);

        await click(`[data-test-theme-id="Daring"] [data-test-button="actions"]`);
        expect(find('[data-test-actions-for="Daring"]')).to.exist;
        expect(
            find(`[data-test-actions-for="Daring"] [data-test-button="delete"]`)
        ).to.not.exist;
    });

    it('displays folder names if there are duplicate package names', async function () {
        this.set('themes', [
            {name: 'daring', package: {name: 'Daring', version: '0.1.4'}},
            {name: 'daring-0.1.5', package: {name: 'Daring', version: '0.1.4'}},
            {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'another', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'mine', package: {name: 'Casper', version: '1.3.1'}},
            {name: 'foo'}
        ]);

        await render(hbs`<GhThemeTable @themes={{themes}} />`);

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
