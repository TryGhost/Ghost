import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: facebook-url-user', function () {
    setupTest('transform:facebook-url-user', {});
    it('deserializes facebook url', function () {
        let transform = this.subject();
        let serialized = 'testuser';
        let result = transform.deserialize(serialized);

        expect(result).to.equal('https://www.facebook.com/testuser');
    });

    it('serializes url to facebook username', function () {
        let transform = this.subject();
        let deserialized = 'https://www.facebook.com/testuser';
        let result = transform.serialize(deserialized);

        expect(result).to.equal('testuser');
    });
});
