import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-publishmenu-draft', function () {
    setupComponentTest('gh-publishmenu-draft', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-publishmenu-draft}}
        //     template content
        //   {{/gh-publishmenu-draft}}
        // `);

        this.render(hbs`{{gh-publishmenu-draft}}`);
        expect(this.$()).to.have.length(1);
    });
});
