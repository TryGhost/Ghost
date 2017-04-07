/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-editor-save-button', function () {
    setupComponentTest('gh-editor-save-button', {
        unit: true,
        needs: [
            'component:gh-dropdown-button',
            'component:gh-dropdown',
            'component:gh-spin-button',
            'service:dropdown',
            'helper:inline-svg'
        ]
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
