import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Helper: clean-basic-html', function () {
    setupComponentTest('clean-basic-html', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#clean-basic-html}}
        //     template content
        //   {{/clean-basic-html}}
        // `);
        this.set('inputValue', '1234');

        this.render(hbs`{{clean-basic-html inputValue}}`);

        expect(this.$().text().trim()).to.equal('1234');
    });
});

