/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'modals/upload-theme',
    'Integration: Component: modals/upload-theme',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#modals/upload-theme}}
            //     template content
            //   {{/modals/upload-theme}}
            // `);

            this.render(hbs`{{modals/upload-theme}}`);
            expect(this.$()).to.have.length(1);
        });
    }
);
