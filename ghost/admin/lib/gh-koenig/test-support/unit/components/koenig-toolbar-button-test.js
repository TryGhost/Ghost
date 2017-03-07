/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';


describe.skip('Unit: Component: koenig-toolbar-button', function () {
    setupComponentTest('koenig-toolbar-button', {
        unit: true
    });

    it('renders', function () {
        let component = this.subject();
        expect(component._state).to.equal('preRender');

        // renders the component on the page
        this.render();
        expect(component._state).to.equal('inDOM');
    });
});
