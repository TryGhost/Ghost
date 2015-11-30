/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-search-input',
    'Unit: Component: gh-search-input',
    {
        unit: true,
        needs: ['component:gh-selectize']
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
