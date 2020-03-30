const rewire = require('rewire');
const should = require('should');
const _ = require('lodash');
const publicSettings = require('../../../../core/server/services/settings/public');
let cache = rewire('../../../../core/server/services/settings/cache');

should.equal(true, true);

describe('UNIT: settings cache', function () {
    beforeEach(function () {
        cache = rewire('../../../../core/server/services/settings/cache');
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
        cache.set('active_timezone', {value: 'PST'});

        cache.getAll().should.eql({
            key1: {value: 'something'},
            title: {value: 'hello world'},
            active_timezone: {value: 'PST'}
        });

        let values = _.zipObject(_.values(publicSettings), _.fill(Array(_.size(publicSettings)), null));
        values.title = 'hello world';
        values.timezone = 'PST';

        cache.getPublic().should.eql(values);
    });
});
