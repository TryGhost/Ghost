import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Instance initializer: ember-bridge-global', function () {
    setupTest();

    it('creates window.EmberBridge global', function () {
        expect(window.EmberBridge).to.exist;
    });

    it('has state bridge service instance', function () {
        expect(window.EmberBridge.state).to.equal(this.owner.lookup('service:state-bridge'));
    });

    it('allows state bridge service instance methods to be called', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');
        Object.defineProperty(stateBridge, 'onUpdate', {value: sinon.stub()});
        Object.defineProperty(stateBridge, 'onInvalidate', {value: sinon.stub()});
        Object.defineProperty(stateBridge, 'onDelete', {value: sinon.stub()});

        window.EmberBridge.state.onUpdate('SettingsResponseType', {settings: [{key: 'title', value: 'Test Title'}]});
        expect(stateBridge.onUpdate).to.have.been.calledWith('SettingsResponseType', {settings: [{key: 'title', value: 'Test Title'}]});

        window.EmberBridge.state.onInvalidate('SettingsResponseType');
        expect(stateBridge.onInvalidate).to.have.been.calledWith('SettingsResponseType');

        window.EmberBridge.state.onDelete('SettingsResponseType', '1');
        expect(stateBridge.onDelete).to.have.been.calledWith('SettingsResponseType', '1');
    });
});
