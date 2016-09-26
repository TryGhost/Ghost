import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import Post from 'ghost-admin/models/post';

describeModule(
    'transform:json-string',
    'Unit: Transform: json-string',
    {},
    function() {
        it('exists', function() {
            let transform = this.subject();
            expect(transform).to.be.ok;
        });

        it('serialises an Object to a JSON String', function() {
            let transform = this.subject();
            let obj = {one: 'one', two: 'two'};
            expect(transform.serialize(obj)).to.equal(JSON.stringify(obj));
        });

        it('deserialises a JSON String to an Object', function() {
            let transform = this.subject();
            let obj = {one: 'one', two: 'two'};
            expect(transform.deserialize(JSON.stringify(obj))).to.deep.equal(obj);
        });
    }
);
