import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-publishmenu-published', function () {
    setupComponentTest('gh-publishmenu-published', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-publishmenu-published}}
        //     template content
        //   {{/gh-publishmenu-published}}
        // `);

        this.render(hbs`{{gh-publishmenu-published}}`);
        expect(this.$()).to.have.length(1);
    });
});
