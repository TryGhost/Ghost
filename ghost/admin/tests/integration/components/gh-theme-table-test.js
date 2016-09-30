/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import $ from 'jquery';
import sinon from 'sinon';
import run from 'ember-runloop';

describeComponent(
    'gh-theme-table',
    'Integration: Component: gh-theme-table',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            this.set('availableThemes', [
                {name: 'Daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
                {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
                {name: 'oscar-ghost-1.1.0', package: {name: 'Lanyon', version: '1.1.0'}},
                {name: 'foo'}
            ]);
            this.set('actionHandler', sinon.spy());

            this.render(hbs`{{gh-theme-table
                availableThemes=availableThemes
                activateTheme=(action actionHandler)
                downloadTheme=(action actionHandler)
                deleteTheme=(action actionHandler)
            }}`);

            expect(this.$('.theme-list').length, '.theme-list is present').to.equal(1);
            expect(this.$('.theme-list-item').length, 'number of rows').to.equal(4);

            let packageNames = this.$('.theme-list-item-body .name').map((i, name) => {
                return $(name).text().trim();
            }).toArray();

            expect(
                packageNames,
                'themes are ordered by label, casper has "default", package versions are shown'
            ).to.deep.equal([
                'Casper - 1.3.1 (default)',
                'Daring - 0.1.4',
                'foo',
                'Lanyon - 1.1.0'
            ]);

            expect(
                this.$('.theme-list-item:contains("Daring")').hasClass('theme-list-item--active'),
                'active theme is highlighted'
            ).to.be.true;

            expect(
                this.$('.theme-list-item:not(:contains("Daring"))').find('a:contains("Activate")').length === 3,
                'non-active themes have an activate link'
            ).to.be.true;

            expect(
                this.$('.theme-list-item:contains("Daring")').find('a:contains("Activate")').length === 0,
                'active theme doesn\'t have an activate link'
            ).to.be.true;

            expect(
                this.$('a:contains("Download")').length,
                'all themes have a download link'
            ).to.equal(4);

            expect(
                this.$('.theme-list-item:contains("foo")').find('a:contains("Delete")').length === 1,
                'non-active, non-casper theme has delete link'
            ).to.be.true;

            expect(
                this.$('.theme-list-item:contains("Casper")').find('a:contains("Delete")').length === 0,
                'casper doesn\'t have delete link'
            ).to.be.true;

            expect(
                this.$('.theme-list-item--active').find('a:contains("Delete")').length === 0,
                'active theme doesn\'t have delete link'
            ).to.be.true;
        });

        it('delete link triggers passed in action', function () {
            let deleteAction = sinon.spy();
            let actionHandler = sinon.spy();

            this.set('availableThemes', [
                {name: 'Foo', active: true},
                {name: 'Bar'}
            ]);
            this.set('deleteAction', deleteAction);
            this.set('actionHandler', actionHandler);

            this.render(hbs`{{gh-theme-table
                availableThemes=availableThemes
                activateTheme=(action actionHandler)
                downloadTheme=(action actionHandler)
                deleteTheme=(action deleteAction)
            }}`);

            run(() => {
                this.$('.theme-list-item:contains("Bar") a:contains("Delete")').click();
            });

            expect(deleteAction.calledOnce).to.be.true;
            expect(deleteAction.firstCall.args[0].name).to.equal('Bar');
        });

        it('download link triggers passed in action', function () {
            let downloadAction = sinon.spy();
            let actionHandler = sinon.spy();

            this.set('availableThemes', [
                {name: 'Foo', active: true},
                {name: 'Bar'}
            ]);
            this.set('downloadAction', downloadAction);
            this.set('actionHandler', actionHandler);

            this.render(hbs`{{gh-theme-table
                availableThemes=availableThemes
                activateTheme=(action actionHandler)
                downloadTheme=(action downloadAction)
                deleteTheme=(action actionHandler)
            }}`);

            run(() => {
                this.$('.theme-list-item:contains("Foo") a:contains("Download")').click();
            });

            expect(downloadAction.calledOnce).to.be.true;
            expect(downloadAction.firstCall.args[0].name).to.equal('Foo');
        });

        it('activate link triggers passed in action', function () {
            let activateAction = sinon.spy();
            let actionHandler = sinon.spy();

            this.set('availableThemes', [
                {name: 'Foo', active: true},
                {name: 'Bar'}
            ]);
            this.set('activateAction', activateAction);
            this.set('actionHandler', actionHandler);

            this.render(hbs`{{gh-theme-table
                availableThemes=availableThemes
                activateTheme=(action activateAction)
                downloadTheme=(action actionHandler)
                deleteTheme=(action actionHandler)
            }}`);

            run(() => {
                this.$('.theme-list-item:contains("Bar") a:contains("Activate")').click();
            });

            expect(activateAction.calledOnce).to.be.true;
            expect(activateAction.firstCall.args[0].name).to.equal('Bar');
        });

        it('displays folder names if there are duplicate package names', function () {
            this.set('availableThemes', [
                {name: 'daring', package: {name: 'Daring', version: '0.1.4'}, active: true},
                {name: 'daring-0.1.5', package: {name: 'Daring', version: '0.1.4'}},
                {name: 'casper', package: {name: 'Casper', version: '1.3.1'}},
                {name: 'another', package: {name: 'Casper', version: '1.3.1'}},
                {name: 'mine', package: {name: 'Casper', version: '1.3.1'}},
                {name: 'foo'}
            ]);
            this.set('actionHandler', sinon.spy());

            this.render(hbs`{{gh-theme-table
                availableThemes=availableThemes
                activateTheme=(action actionHandler)
                downloadTheme=(action actionHandler)
                deleteTheme=(action actionHandler)
            }}`);

            let packageNames = this.$('.theme-list-item-body .name').map((i, name) => {
                return $(name).text().trim();
            }).toArray();

            expect(
                packageNames,
                'themes are ordered by label, folder names shown for duplicates'
            ).to.deep.equal([
                'Casper - 1.3.1 (another)',
                'Casper - 1.3.1 (default)',
                'Casper - 1.3.1 (mine)',
                'Daring - 0.1.4 (daring)',
                'Daring - 0.1.4 (daring-0.1.5)',
                'foo'
            ]);
        });
    }
);
