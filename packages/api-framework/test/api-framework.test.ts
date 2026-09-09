const assert = require('node:assert/strict');

describe('api-framework module exports', function () {
  it('exposes all lazy getters', function () {
    const apiFramework = require('../src/api-framework.ts');

    assert.ok(apiFramework.headers);
    assert.ok(apiFramework.http);
    assert.ok(apiFramework.Frame);
    assert.ok(apiFramework.pipeline);
    assert.ok(apiFramework.validators);
    assert.ok(apiFramework.serializers);
    assert.ok(apiFramework.utils);
  });

  it('exposes serializer output module', function () {
    const serializers = require('../src/serializers/index.ts');
    assert.deepEqual(serializers.output, {});
  });
});
