const assert = require('node:assert/strict');

describe('api-framework module exports', function () {
    it('exposes all lazy getters', function () {
        const apiFramework = require('../lib/api-framework');

        assert.ok(apiFramework.headers);
        assert.ok(apiFramework.http);
        assert.ok(apiFramework.Frame);
        assert.ok(apiFramework.pipeline);
        assert.ok(apiFramework.validators);
        assert.ok(apiFramework.serializers);
        assert.ok(apiFramework.utils);
    });

    it('exposes serializer output module', function () {
        const serializers = require('../lib/serializers');
        assert.deepEqual(serializers.output, {});
    });
});
