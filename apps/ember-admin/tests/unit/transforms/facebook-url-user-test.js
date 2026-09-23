import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: facebook-url-user', function () {
    setupTest();

    it('deserializes facebook url', function () {
        const transform = this.owner.lookup('transform:facebook-url-user');
        const serialized = 'testuser';
        const result = transform.deserialize(serialized);

        expect(result).to.equal('https://www.facebook.com/testuser');
    });

    it('serializes url to facebook username', function () {
        const transform = this.owner.lookup('transform:facebook-url-user');
        const deserialized = 'https://www.facebook.com/testuser';
        const result = transform.serialize(deserialized);

        expect(result).to.equal('testuser');
    });
});
