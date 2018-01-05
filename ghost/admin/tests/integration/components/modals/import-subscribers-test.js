import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modal-import-subscribers', function () {
    setupComponentTest('modal-import-subscribers', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#modal-import-subscribers}}
        //     template content
        //   {{/modal-import-subscribers}}
        // `);

        this.render(hbs`{{modal-import-subscribers}}`);
        expect(this.$()).to.have.length(1);
    });
});
