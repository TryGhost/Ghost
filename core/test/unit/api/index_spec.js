var should = require('should'),
    rewire = require('rewire'),
    config = rewire('../../../server/config'),
    api = rewire(config.get('paths').corePath + '/server/api');

describe('API: index', function () {
    describe('fn: cacheInvalidationHeader', function () {
        it('/schedules/posts should invalidate cache', function () {
            var cacheInvalidationHeader = api.__get__('cacheInvalidationHeader'),
                result = cacheInvalidationHeader({
                    _parsedUrl: {
                        pathname: '/schedules/posts/1'
                    },
                    method: 'PUT'
                }, {});

            result.should.eql('/*');
        });

        it('/schedules/something should NOT invalidate cache', function () {
            var cacheInvalidationHeader = api.__get__('cacheInvalidationHeader'),
                result = cacheInvalidationHeader({
                    _parsedUrl: {
                        pathname: '/schedules/something'
                    },
                    method: 'PUT'
                }, {});

            should.not.exist(result);
        });
    });
});
