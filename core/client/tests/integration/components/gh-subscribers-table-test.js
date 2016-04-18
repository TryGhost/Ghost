/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'gh-subscribers-table',
    'Integration: Component: gh-subscribers-table',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            this.set('subscribers', []);

            this.render(hbs`{{gh-subscribers-table subscribers=subscribers}}`);
            expect(this.$()).to.have.length(1);
        });
    }
);
