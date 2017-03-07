/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import {editorShim} from '../../utils';

describe.skip('Unit: Component: koenig-menu', function () {
    setupComponentTest('koenig-menu', {
        unit: true
    });

    it('renders', function () {
        let component = this.subject();
        component.editor = editorShim;
        expect(component._state).to.equal('preRender');

        // renders the component on the page
        this.render();
        expect(component._state).to.equal('inDOM');
    });
});
