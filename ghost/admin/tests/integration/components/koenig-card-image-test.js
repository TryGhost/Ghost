import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-card-image', function () {
    setupComponentTest('koenig-card-image', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-card-image}}
        //     template content
        //   {{/koenig-card-image}}
        // `);

        this.render(hbs`{{koenig-card-image}}`);
        expect(this.$()).to.have.length(1);
    });
});
