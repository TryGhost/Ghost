import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: koenig-editor', function () {
    setupComponentTest('koenig-editor', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#koenig-editor}}
        //     template content
        //   {{/koenig-editor}}
        // `);

        this.render(hbs`{{koenig-editor}}`);
        expect(this.$()).to.have.length(1);
    });
});
