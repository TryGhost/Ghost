import NavItem from 'ghost-admin/models/navigation-item';
import hbs from 'htmlbars-inline-precompile';
import {click, find, render, triggerEvent} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-navitem', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.set('baseUrl', 'http://localhost:2368');
    });

    it('renders', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let item = find('.gh-blognav-item');

        expect(item.querySelector('.gh-blognav-grab')).to.exist;
        expect(item.querySelector('.gh-blognav-label')).to.exist;
        expect(item.querySelector('.gh-blognav-url')).to.exist;
        expect(item.querySelector('.gh-blognav-delete')).to.exist;

        // doesn't show any errors
        expect(find('.gh-blognav-item--error')).to.not.exist;
        expect(find('.error')).to.not.exist;
        expect(find('.response')).to.not.be.displayed;
    });

    it('doesn\'t show drag handle for new items', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let item = find('.gh-blognav-item');

        expect(item.querySelector('.gh-blognav-grab')).to.not.exist;
    });

    it('shows add button for new items', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let item = find('.gh-blognav-item');

        expect(item.querySelector('.gh-blognav-add')).to.exist;
        expect(item.querySelector('.gh-blognav-delete')).to.not.exist;
    });

    it('triggers delete action', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

        let deleteActionCallCount = 0;
        this.set('deleteItem', (navItem) => {
            expect(navItem).to.equal(this.navItem);
            deleteActionCallCount += 1;
        });

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl deleteItem=(action deleteItem)}}`);
        await click('.gh-blognav-delete');

        expect(deleteActionCallCount).to.equal(1);
    });

    it('triggers add action', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

        let addActionCallCount = 0;
        this.set('add', () => {
            addActionCallCount += 1;
        });

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl addItem=(action add)}}`);
        await click('.gh-blognav-add');

        expect(addActionCallCount).to.equal(1);
    });

    it('triggers update url action', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

        let updateActionCallCount = 0;
        this.set('update', (value) => {
            updateActionCallCount += 1;
            return value;
        });

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl updateUrl=(action update)}}`);
        await triggerEvent('.gh-blognav-url input', 'blur');

        expect(updateActionCallCount).to.equal(1);
    });

    it('triggers update label action', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

        let updateActionCallCount = 0;
        this.set('update', (value) => {
            updateActionCallCount += 1;
            return value;
        });

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl updateLabel=(action update)}}`);
        await triggerEvent('.gh-blognav-label input', 'blur');

        expect(updateActionCallCount).to.equal(2);
    });

    it('displays inline errors', async function () {
        this.set('navItem', NavItem.create({label: '', url: ''}));
        this.navItem.validate();

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let item = find('.gh-blognav-item');

        expect(item).to.have.class('gh-blognav-item--error');
        expect(item.querySelector('.gh-blognav-label')).to.have.class('error');
        expect(item.querySelector('.gh-blognav-label .response')).to.have.trimmed.text('You must specify a label');
        expect(item.querySelector('.gh-blognav-url')).to.have.class('error');
        expect(item.querySelector('.gh-blognav-url .response')).to.have.trimmed.text('You must specify a URL or relative path');
    });
});
