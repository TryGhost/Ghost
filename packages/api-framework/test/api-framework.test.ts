import assert from 'node:assert/strict';
import * as apiFramework from '../src/index.ts';
import * as serializers from '../src/serializers/index.ts';

describe('api-framework module exports', function () {
  it('exposes all lazy getters', function () {
    assert.ok(apiFramework.headers);
    assert.ok(apiFramework.http);
    assert.ok(apiFramework.Frame);
    assert.ok(apiFramework.pipeline);
    assert.ok(apiFramework.validators);
    assert.ok(apiFramework.serializers);
    assert.ok(apiFramework.utils);
  });

  it('exposes serializer output module', function () {
    assert.deepEqual(serializers.output, {});
  });
});
