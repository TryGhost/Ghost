import hbs from 'htmlbars-inline-precompile';
import {click, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-members-import-table', function () {
    setupRenderingTest();

    it('renders members data with all the properties', async function () {
        this.set('importData', [{
            name: 'Kevin',
            email: 'kevin@example.com'
        }]);
        this.set('setMapping', () => {});

        await render(hbs`
            <GhMembersImportTable @data={{this.importData}} @setMapping={{this.setMapping}}/>
        `);

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Kevin');
        expect(findAll('table tbody tr td')[2].textContent).to.match(/Not imported/);
        expect(findAll('table tbody tr td')[3].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[4].textContent).to.equal('kevin@example.com');
        expect(findAll('table tbody tr td')[5].textContent).to.match(/Not imported/);
    });

    it('navigates through data when next and previous are clicked', async function () {
        this.set('importData', [{
            name: 'Kevin',
            email: 'kevin@example.com'
        }, {
            name: 'Rish',
            email: 'rish@example.com'
        }]);
        this.set('setMapping', () => {});

        await render(hbs`
            <GhMembersImportTable @data={{this.importData}} @setMapping={{this.setMapping}}/>
        `);

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Kevin');
        expect(findAll('table tbody tr td')[2].textContent).to.match(/Not imported/);
        expect(findAll('table tbody tr td')[3].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[4].textContent).to.equal('kevin@example.com');
        expect(findAll('table tbody tr td')[5].textContent).to.match(/Not imported/);

        await click('[data-test-import-next]');

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Rish');
        expect(findAll('table tbody tr td')[2].textContent).to.match(/Not imported/);
        expect(findAll('table tbody tr td')[3].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[4].textContent).to.equal('rish@example.com');
        expect(findAll('table tbody tr td')[5].textContent).to.match(/Not imported/);

        await click('[data-test-import-prev]');

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Kevin');
        expect(findAll('table tbody tr td')[2].textContent).to.match(/Not imported/);
        expect(findAll('table tbody tr td')[3].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[4].textContent).to.equal('kevin@example.com');
        expect(findAll('table tbody tr td')[5].textContent).to.match(/Not imported/);
    });

    it('cannot navigate through data when only one data item is present', async function () {
        it('renders members data with all the properties', async function () {
            this.set('importData', [{
                name: 'Egg',
                email: 'egg@example.com'
            }]);

            await render(hbs`
                <GhMembersImportTable @importData={{this.importData}} />
            `);

            await click('[data-test-import-prev]');

            expect(findAll('table tbody tr').length).to.equal(2);
            expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
            expect(findAll('table tbody tr td')[1].textContent).to.equal('Egg');
            expect(findAll('table tbody tr td')[2].textContent).to.equal('email');
            expect(findAll('table tbody tr td')[3].textContent).to.equal('egg@example.com');

            await click('[data-test-import-next]');

            expect(findAll('table tbody tr').length).to.equal(2);
            expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
            expect(findAll('table tbody tr td')[1].textContent).to.equal('Egg');
            expect(findAll('table tbody tr td')[2].textContent).to.equal('email');
            expect(findAll('table tbody tr td')[3].textContent).to.equal('egg@example.com');
        });
    });
});
