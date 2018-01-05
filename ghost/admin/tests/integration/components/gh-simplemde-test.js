import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-simplemde', function () {
    setupComponentTest('gh-simplemde', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-simplemde}}
        //     template content
        //   {{/gh-simplemde}}
        // `);

        this.render(hbs`{{gh-simplemde}}`);
        expect(this.$()).to.have.length(1);
    });
});
