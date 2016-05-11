/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'modals/import-subscribers',
    'Integration: Component: modals/import-subscribers',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#modals/import-subscribers}}
            //     template content
            //   {{/modals/import-subscribers}}
            // `);

            this.render(hbs`{{modals/import-subscribers}}`);
            expect(this.$()).to.have.length(1);
        });
    }
);
