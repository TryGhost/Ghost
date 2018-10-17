import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Serializer: integration', function () {
    setupModelTest('integration', {
        // Specify the other units that are required for this test.
        needs: [
            'serializer:integration',
            'transform:moment-utc',
            'model:api-key',
            'model:webhook'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function () {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
