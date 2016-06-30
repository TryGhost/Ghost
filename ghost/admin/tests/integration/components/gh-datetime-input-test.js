/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import run from 'ember-runloop';

describeComponent(
    'gh-datetime-input',
    'Integration: Component: gh-datetime-input',
    {
        integration: true
    },
    function () {
        it('renders', function () {
            // renders the component on the page
            // this.render(hbs`{{gh-datetime-input}}`);
            //
            // expect(this.$('.ember-text-field gh-input')).to.have.length(1);
        });
    }
);
