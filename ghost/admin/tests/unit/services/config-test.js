import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: config', function () {
    setupTest('service:config', {
        needs: [
            'service:ajax',
            'service:ghostPaths'
        ]
    });

    // Replace this with your real tests.
    it('exists', function () {
        let service = this.subject();
        expect(service).to.be.ok;
    });
});
