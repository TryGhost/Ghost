/* jshint expr:true */
import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';
import { NavItem } from 'ghost/controllers/settings/navigation';

const {run} = Ember;

describeComponent(
    'gh-navitem',
    'Integration: Component: gh-navitem',
    {
        integration: true
    },
    function () {
        beforeEach(function () {
            this.set('baseUrl', 'http://localhost:2368');
        });

        it('renders', function () {
            this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
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

        it('doesn\'t show drag handle for new items', function () {
            this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
            let $item = this.$('.gh-blognav-item');

            expect($item.find('.gh-blognav-grab').length).to.equal(0);
        });

        it('shows add button for new items', function () {
            this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
            let $item = this.$('.gh-blognav-item');

            expect($item.find('.gh-blognav-add').length).to.equal(1);
            expect($item.find('.gh-blognav-delete').length).to.equal(0);
        });

        it('triggers delete action', function () {
            this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

            let deleteActionCallCount = 0;
            this.on('deleteItem', (navItem) => {
                expect(navItem).to.equal(this.get('navItem'));
                deleteActionCallCount++;
            });

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl deleteItem="deleteItem"}}`);
            this.$('.gh-blognav-delete').trigger('click');

            expect(deleteActionCallCount).to.equal(1);
        });

        it('triggers add action', function () {
            this.set('navItem', NavItem.create({label: 'Test', url: '/url', isNew: true}));

            let addActionCallCount = 0;
            this.on('add', () => {
                addActionCallCount++;
            });

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl addItem="add"}}`);
            this.$('.gh-blognav-add').trigger('click');

            expect(addActionCallCount).to.equal(1);
        });

        it('triggers update action', function () {
            this.set('navItem', NavItem.create({label: 'Test', url: '/url'}));

            let updateActionCallCount = 0;
            this.on('update', () => {
                updateActionCallCount++;
            });

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl updateUrl="update"}}`);
            this.$('.gh-blognav-url input').trigger('blur');

            expect(updateActionCallCount).to.equal(1);
        });

        it('displays inline errors', function () {
            this.set('navItem', NavItem.create({label: '', url: ''}));
            this.get('navItem').validate();

            this.render(hbs`{{gh-navitem navItem=navItem baseUrl=baseUrl}}`);
            let $item = this.$('.gh-blognav-item');

            expect($item.hasClass('gh-blognav-item--error')).to.be.true;
            expect($item.find('.gh-blognav-label').hasClass('error')).to.be.true;
            expect($item.find('.gh-blognav-label .response').text().trim()).to.equal('You must specify a label');
            expect($item.find('.gh-blognav-url').hasClass('error')).to.be.true;
            expect($item.find('.gh-blognav-url .response').text().trim()).to.equal('You must specify a URL or relative path');
        });
    }
);
