/* jshint expr:true */
import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';

describeModel(
    'tag',
    'Unit:Serializer: tag',
    {
        // Specify the other units that are required for this test.
        needs: ['transform:moment-utc', 'transform:raw']
    },

    function() {
        // Replace this with your real tests.
        it('serializes records', function() {
            let record = this.subject();

            let serializedRecord = record.serialize();

            expect(record).to.be.ok;
        });
    }
);
