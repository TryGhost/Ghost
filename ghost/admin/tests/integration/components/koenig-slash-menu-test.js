import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-slash-menu', function () {
    setupComponentTest('koenig-slash-menu', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-slash-menu}}
        //     template content
        //   {{/koenig-slash-menu}}
        // `);

        this.render(hbs`{{koenig-slash-menu}}`);
        expect(this.$()).to.have.length(1);
    });
});
