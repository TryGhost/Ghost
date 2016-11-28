/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-spin-button', function () {
    setupComponentTest('gh-spin-button', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    });

    it('renders', function () {
        // creates the component instance
        let component = this.subject();

        expect(component._state).to.equal('preRender');

        // renders the component on the page
        this.render();
        expect(component._state).to.equal('inDOM');
    });
});
