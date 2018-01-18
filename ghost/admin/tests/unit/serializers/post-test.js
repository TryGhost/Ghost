import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Serializer: post', function () {
    setupModelTest('post', {
        // Specify the other units that are required for this test.
        needs: [
            'transform:moment-utc',
            'transform:json-string',
            'model:user',
            'model:tag',
            'service:ajax',
            'service:clock',
            'service:config',
            'service:feature',
            'service:ghostPaths',
            'service:lazyLoader',
            'service:notifications',
            'service:session',
            'service:settings'
        ]
    });

    // Replace this with your real tests.
    it('serializes records', function () {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
