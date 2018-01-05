import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: ui', function () {
    setupTest('service:ui', {
        needs: [
            'service:dropdown',
            'service:mediaQueries'
        ]
    });

    // Replace this with your real tests.
    it('exists', function () {
        let service = this.subject();
        expect(service).to.be.ok;
    });
});
