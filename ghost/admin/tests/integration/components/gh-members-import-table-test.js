import hbs from 'htmlbars-inline-precompile';
import {click, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-members-import-table', function () {
    setupRenderingTest();

    it('renders empty without data', async function () {
        await render(hbs`
            <GhMembersImportTable />
        `);

        expect(find('table')).to.exist;
        expect(findAll('table thead th').length).to.equal(2);
        expect(findAll('table tbody tr').length).to.equal(1);
        expect(find('table tbody tr').textContent).to.match(/No data/);
    });

    it('renders members data with all the properties', async function () {
        this.set('importData', [{
            name: 'Kevin',
            email: 'kevin@example.com'
        }]);

        await render(hbs`
            <GhMembersImportTable @importData={{this.importData}} />
        `);

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Kevin');
        expect(findAll('table tbody tr td')[2].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[3].textContent).to.equal('kevin@example.com');
    });

    it('navigates through data when next and previous are clicked', async function () {
        this.set('importData', [{
            name: 'Kevin',
            email: 'kevin@example.com'
        }, {
            name: 'Rish',
            email: 'rish@example.com'
        }]);

        await render(hbs`
            <GhMembersImportTable @importData={{this.importData}} />
        `);

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Kevin');
        expect(findAll('table tbody tr td')[2].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[3].textContent).to.equal('kevin@example.com');

        await click('[data-test-import-next]');

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Rish');
        expect(findAll('table tbody tr td')[2].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[3].textContent).to.equal('rish@example.com');

        await click('[data-test-import-prev]');

        expect(findAll('table tbody tr').length).to.equal(2);
        expect(findAll('table tbody tr td')[0].textContent).to.equal('name');
        expect(findAll('table tbody tr td')[1].textContent).to.equal('Kevin');
        expect(findAll('table tbody tr td')[2].textContent).to.equal('email');
        expect(findAll('table tbody tr td')[3].textContent).to.equal('kevin@example.com');
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
