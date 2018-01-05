import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modal-delete-subscriber', function () {
    setupComponentTest('modal-delete-subscriber', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#modal-delete-subscriber}}
        //     template content
        //   {{/modal-delete-subscriber}}
        // `);

        this.render(hbs`{{modal-delete-subscriber}}`);
        expect(this.$()).to.have.length(1);
    });
});
