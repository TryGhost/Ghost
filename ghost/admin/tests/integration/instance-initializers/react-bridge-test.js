import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Instance initializer: react-bridge', function () {
    setupTest();

    it('creates window.EmberBridge global', function () {
        expect(window.EmberBridge).to.exist;
        expect(window.EmberBridge.getService).to.be.a('function');
    });

    it('can lookup services', function () {
        const session = window.EmberBridge.getService('session');
        expect(session).to.exist;
    });
});
