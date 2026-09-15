import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { describe, it } from 'vitest';

import errors from '@tryghost/errors';

import {
  ImportFileStoreBase,
  assertValidKey,
  importFileNotFoundError,
  isImportFileNotFound,
  isInvalidImportFileKey,
  type PutOptions,
  type StoredFile,
} from '../src/base.ts';

class TestStore extends ImportFileStoreBase {
  async put(_key: string, _body: Buffer | Readable, options: PutOptions): Promise<StoredFile> {
    return { size: 0, contentType: options.contentType };
  }
  async get(): Promise<Readable> {
    return Readable.from([]);
  }
  async head(): Promise<StoredFile | null> {
    return null;
  }
  async delete(): Promise<void> {
    return;
  }
}

describe('adapter-base-import-files', function () {
  describe('ImportFileStoreBase', function () {
    it('declares put, get, head and delete as required', function () {
      const store = new TestStore();

      assert.deepEqual(store.requiredFns, ['put', 'get', 'head', 'delete']);
    });

    it('does not let a subclass shrink the required list', function () {
      const store = new TestStore();

      assert.ok(Object.isFrozen(store.requiredFns));
      assert.throws(() => {
        (store as { requiredFns: unknown }).requiredFns = ['put'];
      }, TypeError);
    });
  });

  describe('assertValidKey', function () {
    it('accepts relative keys made of safe segments', function () {
      for (const key of [
        'members-import/68c8f1e2a9b3c4d5e6f70123/rows-9f1c.ndjson',
        'content-csv-import/run_1/upload-1.csv',
        'a/b',
        'x.y_z-1',
      ]) {
        assert.doesNotThrow(() => assertValidKey(key), key);
      }
    });

    it('refuses traversal, absolute, empty, oversized and non-ASCII keys', function () {
      const refused = [
        '',
        '/a/b',
        'a//b',
        'a/b/',
        '../a',
        'a/../b',
        'a/./b',
        '.',
        '..',
        'a b',
        'a\\b',
        'a/b?c',
        'a/b\0c',
        'a/ü',
        `${'x'.repeat(1025)}`,
      ];

      for (const key of refused) {
        assert.throws(
          () => assertValidKey(key),
          (err: unknown) => {
            assert.ok(isInvalidImportFileKey(err), `expected a key error for ${key}`);
            assert.equal((err as { errorType?: string }).errorType, 'IncorrectUsageError');
            return true;
          },
          JSON.stringify(key),
        );
      }
    });

    it('refuses anything that is not a string', function () {
      for (const key of [undefined, null, 42, {}, ['a']]) {
        assert.throws(
          () => assertValidKey(key as unknown as string),
          (err: unknown) => isInvalidImportFileKey(err),
        );
      }
    });

    it('allows a key of exactly the maximum length', function () {
      assert.doesNotThrow(() => assertValidKey('x'.repeat(1024)));
    });
  });

  describe('importFileNotFoundError', function () {
    it('is a Ghost NotFoundError carrying the key and a stable code', function () {
      const err = importFileNotFoundError('members-import/1/rows.ndjson');

      assert.equal(err.errorType, 'NotFoundError');
      assert.equal(err.code, 'IMPORT_FILE_NOT_FOUND');
      assert.equal(err.context, 'members-import/1/rows.ndjson');
      assert.match(err.message, /members-import\/1\/rows\.ndjson/);
    });

    it('is recognised by the guard by its code alone', function () {
      assert.equal(isImportFileNotFound(importFileNotFoundError('a/b')), true);
      // A second copy of this package in an adapter's own node_modules would
      // build the error from a different class; the code still identifies it.
      assert.equal(isImportFileNotFound({ code: 'IMPORT_FILE_NOT_FOUND' }), true);
      assert.equal(isImportFileNotFound(new errors.NotFoundError({ message: 'nope' })), false);
      assert.equal(isImportFileNotFound(null), false);
      assert.equal(isImportFileNotFound('IMPORT_FILE_NOT_FOUND'), false);
    });
  });
});
