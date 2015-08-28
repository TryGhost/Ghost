/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-search-input',
    'GhSearchInputComponent',
    {
        needs: ['component:gh-selectize']
    },
    function () {
        it('renders', function () {
            // creates the component instance
            var component = this.subject();
            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');
        });
    }
);
