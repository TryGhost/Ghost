import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as apiFramework from '../src/index.ts';
import * as serializers from '../src/serializers/index.ts';

const require = createRequire(import.meta.url);

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

  it('exposes the Ghost consumer contract from the compiled CommonJS package', async function () {
    const compiledApiFramework: typeof apiFramework = require('@tryghost/api-framework');

    assert.equal(typeof compiledApiFramework.pipeline, 'function');
    assert.equal(typeof compiledApiFramework.http, 'function');
    assert.equal(typeof compiledApiFramework.serializers.handle.output, 'function');
    assert.equal(typeof compiledApiFramework.utils.options.trimAndLowerCase, 'function');

    const controller = compiledApiFramework.pipeline(
      {
        echo(frame: apiFramework.Frame) {
          return frame.original.options?.value;
        },
      },
      {},
    );

    assert.equal(await controller.echo({ value: 'compiled' }), 'compiled');
    assert.deepEqual(compiledApiFramework.utils.options.trimAndLowerCase(' A, B '), ['a', 'b']);
  });
});
