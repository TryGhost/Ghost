import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-card-html', function () {
    setupComponentTest('koenig-card-html', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-card-html}}
        //     template content
        //   {{/koenig-card-html}}
        // `);

        this.render(hbs`{{koenig-card-html}}`);
        expect(this.$()).to.have.length(1);
    });
});
