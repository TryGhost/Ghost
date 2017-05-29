/* jshint expr:true */
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: modals/upload-theme', function() {
    setupComponentTest('modals/upload-theme', {
        integration: true
    });

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
});
