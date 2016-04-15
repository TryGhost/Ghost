/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'modals/new-subscriber',
    'Integration: Component: modals/new-subscriber',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#modals/new-subscriber}}
            //     template content
            //   {{/modals/new-subscriber}}
            // `);

            this.render(hbs`{{modals/new-subscriber}}`);
            expect(this.$()).to.have.length(1);
        });
    }
);
