import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: facebook-url-user', function () {
    setupTest();

    it('deserializes facebook url', function () {
        let transform = this.owner.lookup('transform:facebook-url-user');
        let serialized = 'testuser';
        let result = transform.deserialize(serialized);

        expect(result).to.equal('https://www.facebook.com/testuser');
    });

    it('serializes url to facebook username', function () {
        let transform = this.owner.lookup('transform:facebook-url-user');
        let deserialized = 'https://www.facebook.com/testuser';
        let result = transform.serialize(deserialized);

        expect(result).to.equal('testuser');
    });
});
