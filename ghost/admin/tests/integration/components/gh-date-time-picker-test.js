import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration: Component: gh-date-time-picker', function() {
    setupComponentTest('gh-date-time-picker', {
        integration: true
    });

    it.skip('renders', function() {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-date-time-picker}}
        //     template content
        //   {{/gh-date-time-picker}}
        // `);

        this.render(hbs`{{gh-date-time-picker}}`);
        expect(this.$()).to.have.length(1);
    });
});
