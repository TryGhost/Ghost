import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Serializer: user', function () {
    setupModelTest('user', {
        // Specify the other units that are required for this test.
        needs: [
            'model:role',
            'service:ajax',
            'service:config',
            'service:ghostPaths',
            'service:notifications',
            'service:session',
            'transform:facebook-url-user',
            'transform:json-string',
            'transform:moment-utc',
            'transform:raw',
            'transform:twitter-url-user'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function () {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
