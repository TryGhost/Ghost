import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modal-new-subscriber', function () {
    setupComponentTest('modal-new-subscriber', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#modal-new-subscriber}}
        //     template content
        //   {{/modal-new-subscriber}}
        // `);

        this.render(hbs`{{modal-new-subscriber}}`);
        expect(this.$()).to.have.length(1);
    });
});
