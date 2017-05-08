import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration: Component: gh-uploader', function() {
    setupComponentTest('gh-uploader', {
        integration: true
    });

    it('renders', function() {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-uploader}}
        //     template content
        //   {{/gh-uploader}}
        // `);

        this.render(hbs`{{gh-uploader}}`);
        expect(this.$()).to.have.length(1);
    });
});
