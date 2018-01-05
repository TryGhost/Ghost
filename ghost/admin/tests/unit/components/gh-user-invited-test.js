import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-user-invited', function () {
    setupComponentTest('gh-user-invited', {
        unit: true,
        // specify the other units that are required for this test
        needs: ['service:notifications']
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
