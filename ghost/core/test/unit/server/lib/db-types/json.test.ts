import assert from 'node:assert/strict';
import { z } from 'zod';
import { DbJson } from '../../../../../core/server/lib/db-types/json';

const Settings = z.object({ enabled: z.boolean(), tags: z.array(z.string()) });

describe('DbJson', function () {
  describe('decode', function () {
    it('reads JSON text against the schema', function () {
      const StoredSettings = DbJson(Settings);

      assert.deepStrictEqual(StoredSettings.decode('{"enabled":true,"tags":["a"]}'), {
        enabled: true,
        tags: ['a'],
      });
    });

    it('rejects text that is not JSON with one issue', function () {
      const StoredSettings = DbJson(Settings);
      const result = StoredSettings.safeDecode('{not json');

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(
        result.error?.issues.map(({ code, message, path }) => ({ code, message, path })),
        [{ code: 'custom', message: 'The stored value is not JSON.', path: [] }],
      );
    });

    it('names the value in the issue when given a message', function () {
      const StoredSettings = DbJson(Settings, { message: 'The stored settings are not JSON.' });
      const result = StoredSettings.safeDecode('');

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(
        result.error?.issues.map(({ message }) => message),
        ['The stored settings are not JSON.'],
      );
    });

    it('rejects JSON that does not match the schema', function () {
      const StoredSettings = DbJson(Settings);
      const result = StoredSettings.safeDecode('{"enabled":"yes","tags":[]}');

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(
        result.error?.issues.map(({ path }) => path),
        [['enabled']],
      );
    });

    it('rejects anything that is not text', function () {
      const StoredSettings = DbJson(Settings);

      for (const stored of [null, undefined, 42, { enabled: true, tags: [] }]) {
        assert.throws(() => StoredSettings.decode(stored as never));
      }
    });
  });

  describe('encode', function () {
    it('writes the value as JSON text the decode reads back', function () {
      const StoredSettings = DbJson(Settings);
      const value = { enabled: false, tags: ['a', 'b'] };
      const text = StoredSettings.encode(value);

      assert.strictEqual(text, '{"enabled":false,"tags":["a","b"]}');
      assert.deepStrictEqual(StoredSettings.decode(text), value);
    });

    it('rejects a value that does not match the schema', function () {
      const StoredSettings = DbJson(Settings);

      assert.throws(() => StoredSettings.encode({ enabled: true } as never));
    });
  });
});
