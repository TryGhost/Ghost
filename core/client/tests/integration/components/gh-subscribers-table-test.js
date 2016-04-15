/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'gh-subscribers-table',
    'Integration: GhSubscribersTableComponent',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#gh-subscribers-table}}
            //     template content
            //   {{/gh-subscribers-table}}
            // `);

            this.render(hbs`{{gh-subscribers-table}}`);
            expect(this.$()).to.have.length(1);
        });
    }
);
