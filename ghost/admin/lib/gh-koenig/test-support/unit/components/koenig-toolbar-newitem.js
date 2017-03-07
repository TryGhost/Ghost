/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import sinon from 'sinon';

describe.skip('Unit: Component: koenig-toolbar', function () {
    setupComponentTest('koenig-toolbar', {
        unit: true
    });

    it('The toolbar is not rendered by default.', function () {
        let component = this.subject();
        expect(component.isVisible).to.be.false;
    });

    it('The toolbar contains tools.', function () {
        let component = this.subject();
        expect(component.get('toolbar').length).to.be.greaterThan(0); // the standard toolbar tools (strong, em, strikethrough, link)
        expect(component.get('toolbarBlocks').length).to.be.greaterThan(0); // extended toolbar block bases tools (h1, h2, quote);
    });
});
