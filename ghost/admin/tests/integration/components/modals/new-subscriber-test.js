/* jshint expr:true */
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modals/new-subscriber', function() {
    setupComponentTest('modals/new-subscriber', {
        integration: true
    });

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
});
