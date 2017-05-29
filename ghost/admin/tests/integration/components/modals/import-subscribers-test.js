/* jshint expr:true */
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modals/import-subscribers', function() {
    setupComponentTest('modals/import-subscribers', {
        integration: true
    });

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
});
