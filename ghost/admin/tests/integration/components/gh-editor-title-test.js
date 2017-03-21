import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration | Component | gh title', function() {
    setupComponentTest('gh-editor-title', {
        integration: true
    });

    it('renders', function() {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-editor-title}}
        //     template content
        //   {{/gh-editor-title}}
        // `);

        this.render(hbs`{{gh-editor-title}}`);
        expect(this.$()).to.have.length(1);
    });
});
