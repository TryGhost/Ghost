const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const events = require('../../../core/server/lib/common/events');

// Testing  the Private API
let CacheManager = require('../../../core/shared/settings-cache/cache-manager');
const publicSettings = require('../../../core/shared/settings-cache/public');
const InMemoryCache = require('../../../core/server/adapters/cache/MemoryCache');

function createCacheManager(settingsOverrides = {}) {
    const cacheStore = new InMemoryCache();
    const cache = new CacheManager({
        publicSettings
    });
    cache.init(events, {}, [], cacheStore, settingsOverrides);
    return cache;
}

describe('UNIT: settings cache', function () {
    let cache;

    beforeEach(function () {
        cache = createCacheManager();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('.get() does not auto convert string into number', function () {
        cache.set('key1', {value: '1'});
        assert.equal(typeof cache.get('key1'), 'string');
    });

    it('.get() does not auto convert string into number: float', function () {
        cache.set('key1', {value: '1.4'});
        assert.equal(typeof cache.get('key1'), 'string');
    });

    it('.get() parses stringified JSON', function () {
        cache.set('key2', {value: '{"a":"1","b":"hallo","c":{"d":[]},"e":2}'});
        assert.equal(typeof cache.get('key2'), 'object');
        assert.equal(cache.get('key2').a, '1');
        assert.equal(cache.get('key2').b, 'hallo');
        assert.deepEqual(cache.get('key2').c, {d: []});
        assert.equal(cache.get('key2').e, 2);
    });

    it('.get() respects the resolve option', function () {
        cache.set('foo', {value: 'bar'});
        assert.deepEqual(cache.get('foo', {resolve: false}), {value: 'bar'});
        assert.equal(cache.get('foo', {resolve: true}), 'bar');
    });

    it('.get() can handle miscellaneous values', function () {
        // This value is not set
        assert.equal(cache.get('bar'), undefined);

        // Using set with a string instead of an object
        cache.set('foo', 'bar');
        assert.equal(cache.get('foo'), null);

        // Various built-in values
        cache.set('null', {value: null});
        cache.set('nan', {value: NaN});

        cache.set('true', {value: true});
        cache.set('false', {value: false});
        cache.set('object', {value: {}});
        cache.set('array', {value: []});

        assert.equal(cache.get('null'), null);
        assert.equal(cache.get('nan'), null);

        assert.equal(cache.get('true'), true);
        assert.equal(cache.get('false'), false);
        assert.deepEqual(cache.get('object'), {});
        assert.deepEqual(cache.get('array'), []);

        // Built-ins as strings
        cache.set('empty', {value: ''});
        cache.set('stringnull', {value: 'null'});
        cache.set('stringnan', {value: 'NaN'});
        cache.set('stringtrue', {value: 'true'});
        cache.set('stringfalse', {value: 'false'});
        cache.set('stringobj', {value: '{}'});
        cache.set('stringarr', {value: '[]'});

        assert.equal(cache.get('empty'), null);
        assert.equal(cache.get('stringnull'), null);
        assert.equal(cache.get('stringnan'), 'NaN');
        assert.equal(cache.get('stringtrue'), true);
        assert.equal(cache.get('stringfalse'), false);
        assert.deepEqual(cache.get('stringobj'), {});
        assert.deepEqual(cache.get('stringarr'), []);
    });

    it('.get() respects settingsOverrides', function () {
        cache = createCacheManager({
            email_track_clicks: false
        });
        cache.set('email_track_clicks', {value: true});
        assert.equal(cache.get('email_track_clicks'), false);
        assert.deepEqual(cache.get('email_track_clicks', {resolve: false}), {value: false, is_read_only: true});
    });

    it('.get() only returns an override if the key is set to begin with', function () {
        assert.equal(cache.get('email_track_clicks', {resolve: false}), undefined);
    });

    it('.getAll() returns all values', function () {
        cache.set('key1', {value: '1'});
        assert.equal(cache.get('key1'), '1');
        assert.deepEqual(cache.getAll(), {key1: {value: '1'}});
    });

    it('.getAll() respects settingsOverrides', function () {
        cache = createCacheManager({
            email_track_clicks: false
        });
        cache.set('email_track_clicks', {
            id: '67996cef430e5905ab385357',
            group: 'email',
            key: 'email_track_clicks',
            value: true,
            type: 'boolean'
        });
        assert.deepEqual(cache.getAll(), {email_track_clicks: {
            id: '67996cef430e5905ab385357',
            group: 'email',
            key: 'email_track_clicks',
            value: false,
            is_read_only: true,
            type: 'boolean'
        }});
    });

    it('handles multiple settingsOverrides correctly', function () {
        cache = createCacheManager({
            setting1: false,
            setting2: 'test'
        });
        cache.set('setting1', {value: true});
        cache.set('setting2', {value: 'original'});
        assert.equal(cache.get('setting1'), false);
        assert.equal(cache.get('setting2'), 'test');
    });

    it('.getPublic() correctly filters and formats public values', function () {
        cache.set('key1', {value: 'something'});
        cache.set('title', {value: 'hello world'});
        cache.set('timezone', {value: 'PST'});
        cache.set('secondary_navigation', {value: false});

        assert.deepEqual(cache.getAll(), {
            key1: {value: 'something'},
            title: {value: 'hello world'},
            timezone: {value: 'PST'},
            secondary_navigation: {value: false}
        });

        let values = _.zipObject(_.keys(publicSettings), _.fill(Array(_.size(publicSettings)), null));
        values.title = 'hello world';
        values.timezone = 'PST';
        values.secondary_navigation = false;

        assert.deepEqual(cache.getPublic(), values);
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
        assert.equal(cache.get('key1'), 'init value');

        // check handler only called once on settings.edit
        sinon.assert.calledOnce(setSpy);
        events.emit('settings.edited', {
            get: () => 'key1',
            toJSON: () => ({value: 'first edit'})
        });
        sinon.assert.calledTwice(setSpy);
        assert.equal(cache.get('key1'), 'first edit');

        // init does a reset by default
        let cacheStoreForReset = new InMemoryCache();
        cache.init(events, settingsCollection, [], cacheStoreForReset);
        sinon.assert.calledThrice(setSpy);
        assert.equal(cache.get('key1'), 'init value');

        // edit again, check event only fired once
        events.emit('settings.edited', {
            get: () => 'key1',
            toJSON: () => ({value: 'second edit'})
        });
        sinon.assert.callCount(setSpy, 4);
        assert.equal(cache.get('key1'), 'second edit');
    });
});
