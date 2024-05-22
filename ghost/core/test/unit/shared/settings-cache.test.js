const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const events = require('../../../core/server/lib/common/events');

// Testing  the Private API
let CacheManager = require('../../../core/shared/settings-cache/CacheManager');
const publicSettings = require('../../../core/shared/settings-cache/public');
const InMemoryCache = require('../../../core/server/adapters/cache/MemoryCache');

should.equal(true, true);

describe('UNIT: settings cache', function () {
    let cache;

    beforeEach(function () {
        let cacheStore = new InMemoryCache();
        cache = new CacheManager({
            publicSettings
        });
        cache.init(events, {}, [], cacheStore);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('.get() does not auto convert string into number', function () {
        cache.set('key1', {value: '1'});
        (typeof cache.get('key1')).should.eql('string');
    });

    it('.get() does not auto convert string into number: float', function () {
        cache.set('key1', {value: '1.4'});
        (typeof cache.get('key1')).should.eql('string');
    });

    it('.get() parses stringified JSON', function () {
        cache.set('key2', {value: '{"a":"1","b":"hallo","c":{"d":[]},"e":2}'});
        (typeof cache.get('key2')).should.eql('object');
        cache.get('key2').a.should.eql('1');
        cache.get('key2').b.should.eql('hallo');
        cache.get('key2').c.should.eql({d: []});
        cache.get('key2').e.should.eql(2);
    });

    it('.get() respects the resolve option', function () {
        cache.set('foo', {value: 'bar'});
        cache.get('foo', {resolve: false}).should.be.an.Object().with.property('value', 'bar');
        cache.get('foo', {resolve: true}).should.be.a.String().and.eql('bar');
    });

    it('.get() can handle miscellaneous values', function () {
        // THis value is not set
        should(cache.get('bar')).be.undefined();

        // Using set with a string instead of an object
        cache.set('foo', 'bar');
        should(cache.get('foo')).eql(null);

        // Various built-in values
        cache.set('null', {value: null});
        cache.set('nan', {value: NaN});

        cache.set('true', {value: true});
        cache.set('false', {value: false});
        cache.set('object', {value: {}});
        cache.set('array', {value: []});

        should(cache.get('null')).eql(null);
        should(cache.get('nan')).eql(null);

        should(cache.get('true')).eql(true);
        should(cache.get('false')).eql(false);
        should(cache.get('object')).eql({});
        should(cache.get('array')).eql([]);

        // Built-ins as strings
        cache.set('empty', {value: ''});
        cache.set('stringnull', {value: 'null'});
        cache.set('stringnan', {value: 'NaN'});
        cache.set('stringtrue', {value: 'true'});
        cache.set('stringfalse', {value: 'false'});
        cache.set('stringobj', {value: '{}'});
        cache.set('stringarr', {value: '[]'});

        should(cache.get('empty')).eql(null);
        should(cache.get('stringnull')).eql(null);
        should(cache.get('stringnan')).eql('NaN');
        should(cache.get('stringtrue')).eql(true);
        should(cache.get('stringfalse')).eql(false);
        should(cache.get('stringobj')).eql({});
        should(cache.get('stringarr')).eql([]);
    });

    it('.getAll() returns all values', function () {
        cache.set('key1', {value: '1'});
        cache.get('key1').should.eql('1');
        cache.getAll().should.eql({key1: {value: '1'}});
    });

    it('.getPublic() correctly filters and formats public values', function () {
        cache.set('key1', {value: 'something'});
        cache.set('title', {value: 'hello world'});
        cache.set('timezone', {value: 'PST'});
        cache.set('secondary_navigation', {value: false});

        cache.getAll().should.eql({
            key1: {value: 'something'},
            title: {value: 'hello world'},
            timezone: {value: 'PST'},
            secondary_navigation: {value: false}
        });

        let values = _.zipObject(_.keys(publicSettings), _.fill(Array(_.size(publicSettings)), null));
        values.title = 'hello world';
        values.timezone = 'PST';
        values.secondary_navigation = false;

        cache.getPublic().should.eql(values);
    });

    it('.reset() and .init() do not double up events', function () {
        const setSpy = sinon.spy(cache, 'set');

        const settingsCollection = {
            models: [{
                get: () => 'key1',
                toJSON: () => ({value: 'init value'})
            }]
        };

        let cacheStore = new InMemoryCache();
        cache.init(events, settingsCollection, [], cacheStore);
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
        let cacheStoreForReset = new InMemoryCache();
        cache.init(events, settingsCollection, [], cacheStoreForReset);
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
