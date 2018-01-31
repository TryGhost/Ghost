import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-card-markdown', function () {
    setupComponentTest('koenig-card-markdown', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-card-markdown}}
        //     template content
        //   {{/koenig-card-markdown}}
        // `);

        this.render(hbs`{{koenig-card-markdown}}`);
        expect(this.$()).to.have.length(1);
    });
});
