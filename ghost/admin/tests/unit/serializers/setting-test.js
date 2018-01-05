import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit:Serializer: setting', function () {
    setupModelTest('setting', {
        // Specify the other units that are required for this test.
        needs: [
            'transform:moment-utc',
            'transform:facebook-url-user',
            'transform:twitter-url-user',
            'transform:navigation-settings',
            'transform:slack-settings',
            'transform:unsplash-settings'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function () {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
