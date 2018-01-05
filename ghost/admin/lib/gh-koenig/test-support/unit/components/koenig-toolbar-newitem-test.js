import {describe, it} from 'mocha';
import {editorShim} from '../../utils';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('gh-koenig: Unit: Component: koenig-toolbar-newitem', function () {
    setupComponentTest('koenig-toolbar-newitem', {
        unit: true,
        needs: [
            'component:koenig-toolbar-button'
        ]
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
