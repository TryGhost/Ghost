import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-link-input', function () {
    setupComponentTest('koenig-link-input', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-link-input}}
        //     template content
        //   {{/koenig-link-input}}
        // `);

        this.render(hbs`{{koenig-link-input}}`);
        expect(this.$()).to.have.length(1);
    });
});
