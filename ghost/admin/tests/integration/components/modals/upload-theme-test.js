import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modal-upload-theme', function () {
    setupComponentTest('modal-upload-theme', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#modal-upload-theme}}
        //     template content
        //   {{/modal-upload-theme}}
        // `);

        this.render(hbs`{{modal-upload-theme}}`);
        expect(this.$()).to.have.length(1);
    });
});
