import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-card-gallery', function () {
    setupComponentTest('koenig-card-gallery', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-card-gallery}}
        //     template content
        //   {{/koenig-card-gallery}}
        // `);

        this.render(hbs`{{koenig-card-gallery}}`);
        expect(this.$()).to.have.length(1);
    });
});
