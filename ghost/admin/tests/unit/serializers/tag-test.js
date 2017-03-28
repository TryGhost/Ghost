/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Serializer: tag', function() {
    setupModelTest('tag', {
        // Specify the other units that are required for this test.
        needs: [
            'service:feature',
            'transform:moment-utc',
            'transform:raw'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function() {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
