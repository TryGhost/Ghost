import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-basic-html-input', function () {
    setupComponentTest('koenig-basic-html-input', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-basic-html-input}}
        //     template content
        //   {{/koenig-basic-html-input}}
        // `);

        this.render(hbs`{{koenig-basic-html-input}}`);
        expect(this.$()).to.have.length(1);
    });
});
