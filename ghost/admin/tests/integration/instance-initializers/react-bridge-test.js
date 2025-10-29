import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Instance initializer: react-bridge', function () {
    setupTest();

    it('creates window.EmberBridge global', function () {
        expect(window.EmberBridge).to.exist;
    });

    it('has state bridge service instance', function () {
        expect(window.EmberBridge.state).to.equal(this.owner.lookup('service:state-bridge'));
    });
});
