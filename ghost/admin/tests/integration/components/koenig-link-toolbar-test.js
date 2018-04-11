import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-link-toolbar', function () {
    setupComponentTest('koenig-link-toolbar', {
        integration: true
    });

    it.skip('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-link-toolbar}}
        //     template content
        //   {{/koenig-link-toolbar}}
        // `);

        this.render(hbs`{{koenig-link-toolbar}}`);
        expect(this.$()).to.have.length(1);
    });
});
