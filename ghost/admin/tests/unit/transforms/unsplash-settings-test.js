import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: unsplash-settings', function () {
    setupTest('transform:unsplash-settings', {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    });

    it('deserializes to default value when null', function () {
        let serialized = null;
        let result = this.subject().deserialize(serialized);
        expect(result.isActive).to.be.true;
    });

    it('deserializes to default value when blank string', function () {
        let serialized = '';
        let result = this.subject().deserialize(serialized);
        expect(result.isActive).to.be.true;
    });

    it('deserializes to default value when invalid JSON', function () {
        let serialized = 'not JSON';
        let result = this.subject().deserialize(serialized);
        expect(result.isActive).to.be.true;
    });

    it('deserializes valid JSON object', function () {
        let serialized = '{"isActive":false}';
        let result = this.subject().deserialize(serialized);
        expect(result.isActive).to.be.false;
    });

    it('serializes to JSON string', function () {
        let deserialized = {isActive: false};
        let result = this.subject().serialize(deserialized);
        expect(result).to.equal('{"isActive":false}');
    });

    it('serializes to default value when blank', function () {
        let deserialized = '';
        let result = this.subject().serialize(deserialized);
        expect(result).to.equal('{"isActive":true}');
    });
});
