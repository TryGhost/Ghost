var rewire = require('rewire'),
    should = require('should'),
    cache = rewire('../../../server/settings/cache');

should.equal(true, true);

describe('UNIT: settings cache', function () {
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
});
