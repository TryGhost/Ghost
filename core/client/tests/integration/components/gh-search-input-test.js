/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

const {run} = Ember;

describeComponent(
    'gh-search-input',
    'Integration: Component: gh-search-input',
    {
        integration: true
    },
    function () {
        it('renders', function () {
            // renders the component on the page
            this.render(hbs`{{gh-search-input}}`);

            expect(this.$('.ember-power-select-search input')).to.have.length(1);
        });
    }
);
