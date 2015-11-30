/* jshint expr:true */
import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';
import { NavItem } from 'ghost/controllers/settings/navigation';

const {run} = Ember;

describeComponent(
    'gh-navigation',
    'Integration: Component: gh-navigation',
    {
        integration: true
    },
    function () {
        it('renders', function () {
            this.render(hbs`{{#gh-navigation}}<div class="js-gh-blognav"><div class="gh-blognav-item"></div></div>{{/gh-navigation}}`);
            expect(this.$('section.gh-view')).to.have.length(1);
            expect(this.$('.ui-sortable')).to.have.length(1);
        });

        it('triggers reorder action', function () {
            let navItems = [];
            let expectedOldIndex = -1;
            let expectedNewIndex = -1;

            navItems.pushObject(NavItem.create({label: 'First', url: '/first'}));
            navItems.pushObject(NavItem.create({label: 'Second', url: '/second'}));
            navItems.pushObject(NavItem.create({label: 'Third', url: '/third'}));
            navItems.pushObject(NavItem.create({label: '', url: '', last: true}));
            this.set('navigationItems', navItems);
            this.set('blogUrl', 'http://localhost:2368');

            this.on('moveItem', (oldIndex, newIndex) => {
                expect(oldIndex).to.equal(expectedOldIndex);
                expect(newIndex).to.equal(expectedNewIndex);
            });

            run(() => {
                this.render(hbs `
                {{#gh-navigation moveItem="moveItem"}}
                    <form id="settings-navigation" class="gh-blognav js-gh-blognav" novalidate="novalidate">
                        {{#each navigationItems as |navItem|}}
                            {{gh-navitem navItem=navItem baseUrl=blogUrl addItem="addItem" deleteItem="deleteItem" updateUrl="updateUrl"}}
                        {{/each}}
                    </form>
                {{/gh-navigation}}`);
            });

            // check it renders the nav item rows
            expect(this.$('.gh-blognav-item')).to.have.length(4);

            // move second item up one
            expectedOldIndex = 1;
            expectedNewIndex = 0;
            run(() => {
                Ember.$(this.$('.gh-blognav-item')[1]).simulateDragSortable({
                    move: -1,
                    handle: '.gh-blognav-grab'
                });
            });

            // move second item down one
            expectedOldIndex = 1;
            expectedNewIndex = 2;
            run(() => {
                Ember.$(this.$('.gh-blognav-item')[1]).simulateDragSortable({
                    move: 1,
                    handle: '.gh-blognav-grab'
                });
            });
        });
    }
);
