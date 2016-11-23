/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupModelTest} from 'ember-mocha';

describe('Unit:Serializer: user', function() {
    setupModelTest('user', {
        // Specify the other units that are required for this test.
        needs: [
            'transform:moment-utc',
            'transform:raw',
            'transform:facebook-url-user',
            'transform:twitter-url-user',
            'model:role'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function() {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
