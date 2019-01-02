import NavItem from 'ghost-admin/models/navigation-item';
import hbs from 'htmlbars-inline-precompile';
import {click, render, triggerEvent} from '@ember/test-helpers';
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
        let $item = this.$('.gh-blognav-item');

        expect($item.find('.gh-blognav-grab').length).to.equal(1);
        expect($item.find('.gh-blognav-label').length).to.equal(1);
        expect($item.find('.gh-blognav-url').length).to.equal(1);
        expect($item.find('.gh-blognav-delete').length).to.equal(1);

        // doesn't show any errors
        expect($item.hasClass('gh-blognav-item--error')).to.be.false;
        expect($item.find('.error').length).to.equal(0);
        expect($item.find('.response:visible').length).to.equal(0);
    });

    it('doesn\'t show drag handle for new items', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let $item = this.$('.gh-blognav-item');

        expect($item.find('.gh-blognav-grab').length).to.equal(0);
    });

    it('shows add button for new items', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let $item = this.$('.gh-blognav-item');

        expect($item.find('.gh-blognav-add').length).to.equal(1);
        expect($item.find('.gh-blognav-delete').length).to.equal(0);
    });

    it('triggers delete action', async function () {
        this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

        let deleteActionCallCount = 0;
        this.set('deleteItem', (navItem) => {
            expect(navItem).to.equal(this.get('navItem'));
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

        expect(updateActionCallCount).to.equal(1);
    });

    it('displays inline errors', async function () {
        this.set('navItem', NavItem.create({label: '', url: ''}));
        this.get('navItem').validate();

        await render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
        let $item = this.$('.gh-blognav-item');

        expect($item.hasClass('gh-blognav-item--error')).to.be.true;
        expect($item.find('.gh-blognav-label').hasClass('error')).to.be.true;
        expect($item.find('.gh-blognav-label .response').text().trim()).to.equal('You must specify a label');
        expect($item.find('.gh-blognav-url').hasClass('error')).to.be.true;
        expect($item.find('.gh-blognav-url .response').text().trim()).to.equal('You must specify a URL or relative path');
    });
});
