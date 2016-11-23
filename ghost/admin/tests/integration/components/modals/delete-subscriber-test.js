/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration: Component: modals/delete-subscriber', function() {
    setupComponentTest('modals/delete-subscriber', {
        integration: true
    });

    it('renders', function() {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#modals/delete-subscriber}}
        //     template content
        //   {{/modals/delete-subscriber}}
        // `);

        this.render(hbs`{{modals/delete-subscriber}}`);
        expect(this.$()).to.have.length(1);
    });
});
