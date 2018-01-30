import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-toolbar', function () {
    setupComponentTest('koenig-toolbar', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-toolbar}}
        //     template content
        //   {{/koenig-toolbar}}
        // `);

        this.render(hbs`{{koenig-toolbar}}`);
        expect(this.$()).to.have.length(1);
    });
});
