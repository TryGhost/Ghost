/* jshint expr:true */
import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';

describeModel(
    'setting',
    'Unit:Serializer: setting',
    {
        // Specify the other units that are required for this test.
        needs: [
            'transform:moment-utc',
            'transform:facebook-url-user',
            'transform:twitter-url-user',
            'transform:navigation-settings',
            'transform:slack-settings'
        ]
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
