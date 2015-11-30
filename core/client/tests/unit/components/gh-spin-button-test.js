/* jshint expr:true */
import {expect} from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-spin-button',
    'Unit: Component: gh-spin-button',
    {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    },
    function () {
        it('renders', function () {
            // creates the component instance
            let component = this.subject();

            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');
        });
    }
);
