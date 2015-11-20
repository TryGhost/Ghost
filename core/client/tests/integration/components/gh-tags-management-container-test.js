/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

describeComponent(
    'gh-tags-management-container',
    'Integration: Component: gh-tags-management-container',
    {
        integration: true
    },
    function () {
        it('renders', function () {
            this.set('tags', []);
            this.set('selectedTag', null);
            this.on('enteredMobile', function () {
                // noop
            });
            this.on('leftMobile', function () {
                // noop
            });

            this.render(hbs`
                {{#gh-tags-management-container tags=tags selectedTag=selectedTag enteredMobile="enteredMobile" leftMobile="leftMobile"}}{{/gh-tags-management-container}}
            `);
            expect(this.$()).to.have.length(1);
        });
    }
);
