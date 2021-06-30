const rewire = require('rewire');
const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const events = require('../../../../core/server/lib/common/events');
const publicSettings = require('../../../../core/server/services/settings/public');
let cache = rewire('../../../../core/server/services/settings/cache');

should.equal(true, true);

describe('UNIT: settings cache', function () {
    beforeEach(function () {
        cache = rewire('../../../../core/server/services/settings/cache');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('does not auto convert string into number', function () {
        cache.set('key1', {value: '1'});
        (typeof cache.get('key1')).should.eql('string');
    });

    it('does not auto convert string into number: float', function () {
        cache.set('key1', {value: '1.4'});
        (typeof cache.get('key1')).should.eql('string');
    });

    it('stringified JSON get\'s parsed', function () {
        cache.set('key2', {value: '{"a":"1","b":"hallo","c":{"d":[]},"e":2}'});
        (typeof cache.get('key2')).should.eql('object');
        cache.get('key2').a.should.eql('1');
        cache.get('key2').b.should.eql('hallo');
        cache.get('key2').c.should.eql({d: []});
        cache.get('key2').e.should.eql(2);
    });

    it('can get all values', function () {
        cache.set('key1', {value: '1'});
        cache.get('key1').should.eql('1');
        cache.getAll().should.eql({key1: {value: '1'}});
    });

    it('correctly filters and formats public values', function () {
        cache.set('key1', {value: 'something'});
        cache.set('title', {value: 'hello world'});
        cache.set('timezone', {value: 'PST'});

        cache.getAll().should.eql({
            key1: {value: 'something'},
            title: {value: 'hello world'},
            timezone: {value: 'PST'}
        });

        let values = _.zipObject(_.keys(publicSettings), _.fill(Array(_.size(publicSettings)), null));
        values.title = 'hello world';
        values.timezone = 'PST';

        cache.getPublic().should.eql(values);
    });

    it('can reset and init without double handling of events', function () {
        const setSpy = sinon.spy(cache, 'set');

        const settingsCollection = {
            models: [{
                get: () => 'key1',
                toJSON: () => ({value: 'init value'})
            }]
        };

        cache.init(events, settingsCollection);
        cache.get('key1').should.equal('init value');

        // check handler only called once on settings.edit
        setSpy.callCount.should.equal(1);
        events.emit('settings.edited', {
            get: () => 'key1',
            toJSON: () => ({value: 'first edit'})
        });
        setSpy.callCount.should.equal(2);
        cache.get('key1').should.equal('first edit');

        // init does a reset by default
        cache.init(events, settingsCollection);
        setSpy.callCount.should.equal(3);
        cache.get('key1').should.equal('init value');

        // edit again, check event only fired once
        events.emit('settings.edited', {
            get: () => 'key1',
            toJSON: () => ({value: 'second edit'})
        });
        setSpy.callCount.should.equal(4);
        cache.get('key1').should.equal('second edit');
    });
});
