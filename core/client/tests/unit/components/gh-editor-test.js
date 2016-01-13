/* jshint expr:true */
import {expect} from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-editor',
    'Unit: Component: gh-editor',
    {
        unit: true,
        // specify the other units that are required for this test
        needs: [
            'component:gh-ed-editor',
            'component:gh-ed-preview',
            'helper:gh-count-words',
            'helper:route-action',
            'service:notifications'
        ]
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
