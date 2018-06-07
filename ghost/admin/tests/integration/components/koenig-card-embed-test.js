import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-card-embed', function () {
    setupComponentTest('koenig-card-embed', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-card-embed}}
        //     template content
        //   {{/koenig-card-embed}}
        // `);

        this.render(hbs`{{koenig-card-embed}}`);
        expect(this.$()).to.have.length(1);
    });
});
