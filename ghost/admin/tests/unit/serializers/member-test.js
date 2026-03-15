import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Serializer: member', function () {
    setupTest();

    let store;
    let serializer;

    beforeEach(function () {
        store = this.owner.lookup('service:store');
        serializer = store.serializerFor('member');
    });

    it('does not include stripe in serialized payload', function () {
        let member = store.createRecord('member', {
            email: 'test@example.com'
        });
        let serialized = serializer.serialize(member._createSnapshot());

        expect(serialized.stripe).to.be.undefined;
    });

    it('does not include geolocation in serialized payload', function () {
        let member = store.createRecord('member', {
            email: 'test@example.com',
            geolocation: '{"country": "US"}'
        });
        let serialized = serializer.serialize(member._createSnapshot());

        expect(serialized.geolocation).to.be.undefined;
    });

    it('does not include status in serialized payload', function () {
        let member = store.createRecord('member', {
            email: 'test@example.com',
            status: 'paid'
        });
        let serialized = serializer.serialize(member._createSnapshot());

        expect(serialized.status).to.be.undefined;
    });

    it('does not include last_seen_at in serialized payload', function () {
        let member = store.createRecord('member', {
            email: 'test@example.com'
        });
        let serialized = serializer.serialize(member._createSnapshot());

        expect(serialized.last_seen_at).to.be.undefined;
    });

    it('does not include comped in serialized payload', function () {
        let member = store.createRecord('member', {
            email: 'test@example.com',
            comped: true
        });
        let serialized = serializer.serialize(member._createSnapshot());

        expect(serialized.comped).to.be.undefined;
    });

    it('does not include tiers in serialized payload', function () {
        let member = store.createRecord('member', {
            email: 'test@example.com',
            tiers: [{id: 'tier-1', name: 'Premium'}]
        });
        let serialized = serializer.serialize(member._createSnapshot());

        expect(serialized.tiers).to.be.undefined;
    });
});
