import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-plus-menu', function () {
    setupComponentTest('koenig-plus-menu', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-plus-menu}}
        //     template content
        //   {{/koenig-plus-menu}}
        // `);

        this.render(hbs`{{koenig-plus-menu}}`);
        expect(this.$()).to.have.length(1);
    });
});
