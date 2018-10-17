import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Serializer: webhook', function () {
    setupModelTest('webhook', {
        // Specify the other units that are required for this test.
        needs: [
            'transform:moment-utc',
            'serializer:webhook',
            'model:integration'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function () {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
