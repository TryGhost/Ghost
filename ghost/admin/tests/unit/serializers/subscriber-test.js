import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit:Serializer: subscriber', function () {
    setupModelTest('subscriber', {
        // Specify the other units that are required for this test.
        needs: ['model:post', 'transform:moment-utc']
    });

    // Replace this with your real tests.
    it('serializes records', function () {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
