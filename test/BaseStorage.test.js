import assert from 'node:assert/strict';
import path from 'node:path';
import {afterEach, describe, it, vi} from 'vitest';

import StorageBase from '../BaseStorage.js';

describe('Storage Base', function () {
    afterEach(function () {
        vi.useRealTimers();
    });

    it('defines the adapter methods required by Ghost storage as a non-writable property', function () {
        const storage = new StorageBase();

        assert.deepEqual(storage.requiredFns, ['exists', 'save', 'serve', 'delete', 'read']);
        assert.throws(() => {
            storage.requiredFns = [];
        }, TypeError);
    });

    it('getTargetDir: returns a year/month path', function () {
        const storage = new StorageBase();

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-04T12:00:00Z'));

        assert.equal(storage.getTargetDir(), path.join('2026', '06'));
    });

    it('getTargetDir: returns a year/month path inside a base directory', function () {
        const storage = new StorageBase();

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-04T12:00:00Z'));

        assert.equal(storage.getTargetDir('content/images'), path.join('content/images', '2026', '06'));
    });

    it('getTargetDir: treats falsy base directories as no base directory', function () {
        const storage = new StorageBase();

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-04T12:00:00Z'));

        const expected = path.join('2026', '06');
        assert.equal(storage.getTargetDir(''), expected);
        assert.equal(storage.getTargetDir(null), expected);
        assert.equal(storage.getTargetDir(undefined), expected);
    });

    it('getSanitizedFileName: escapes non accepted characters in filenames', function () {
        const storage = new StorageBase();

        assert.equal(storage.getSanitizedFileName('(abc*@#123).zip'), '-abc-@-123-.zip');
    });

    it('getSanitizedFileName: replaces unicode characters with hyphens', function () {
        const storage = new StorageBase();

        assert.equal(storage.getSanitizedFileName('город.zip'), '-----.zip');
    });

    it('getSanitizedFileName: returns an empty string when given an empty string', function () {
        const storage = new StorageBase();

        assert.equal(storage.getSanitizedFileName(''), '');
    });

    it('getSanitizedFileName: leaves clean ASCII filenames untouched', function () {
        const storage = new StorageBase();

        assert.equal(storage.getSanitizedFileName('photo.jpg'), 'photo.jpg');
    });

    it('getSanitizedFileName: preserves underscores and digits', function () {
        const storage = new StorageBase();

        assert.equal(storage.getSanitizedFileName('snake_case_2024.txt'), 'snake_case_2024.txt');
    });

    it('getSanitizedFileName: replaces whitespace with hyphens', function () {
        const storage = new StorageBase();

        assert.equal(storage.getSanitizedFileName('My Photo.jpg'), 'My-Photo.jpg');
    });

    it('generateUnique: returns the original filename when it does not exist', async function () {
        const storage = new StorageBase();
        const calls = [];

        storage.exists = function (filename, dir) {
            calls.push({filename, dir});
            return Promise.resolve(false);
        };

        assert.equal(await storage.generateUnique('target-dir', 'something', '.jpg', 0), path.join('target-dir', 'something.jpg'));
        assert.deepEqual(calls, [{filename: 'something.jpg', dir: 'target-dir'}]);
    });

    it('generateUnique: increments the suffix until the filename is unique', async function () {
        const storage = new StorageBase();
        const existingFilenames = new Set(['something.jpg', 'something-1.jpg', 'something-2.jpg']);

        storage.exists = function (filename) {
            return Promise.resolve(existingFilenames.has(filename));
        };

        assert.equal(await storage.generateUnique('target-dir', 'something', '.jpg', 0), path.join('target-dir', 'something-3.jpg'));
    });

    it('generateUnique: supports filenames without extensions', async function () {
        const storage = new StorageBase();
        const existingFilenames = new Set(['something']);

        storage.exists = function (filename) {
            return Promise.resolve(existingFilenames.has(filename));
        };

        assert.equal(await storage.generateUnique('target-dir', 'something', null, 0), path.join('target-dir', 'something-1'));
    });

    it('generateUnique: propagates exists errors', async function () {
        const storage = new StorageBase();
        const error = new Error('exists failed');

        storage.exists = function () {
            return Promise.reject(error);
        };

        await assert.rejects(
            storage.generateUnique('target-dir', 'something', '.jpg', 0),
            error
        );
    });

    it('getUniqueFileName: accepts jpg', async function () {
        const storage = new StorageBase();
        let i = 0;

        storage.exists = function () {
            i = i + 1;

            return Promise.resolve(i < 2);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something.jpg'}, 'target-dir'), path.join('target-dir', 'something-1.jpg'));
    });

    it('getUniqueFileName: accepts png', async function () {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something.png'}, 'target-dir'), path.join('target-dir', 'something.png'));
    });

    it('getUniqueFileName: accepts mp4', async function () {
        const storage = new StorageBase();
        let i = 0;

        storage.exists = function () {
            i = i + 1;

            return Promise.resolve(i < 2);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something.mp4'}, 'target-dir'), path.join('target-dir', 'something-1.mp4'));
    });

    it('getUniqueFileName: accepts uppercase extensions', async function () {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something.JPG'}, 'target-dir'), path.join('target-dir', 'something.JPG'));
    });

    it('getUniqueFileName: preserves multiple dot filenames', async function () {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: 'archive.tar.gz'}, 'target-dir'), path.join('target-dir', 'archive.tar.gz'));
    });

    it('getUniqueFileName: supports filenames without extensions', async function () {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something'}, 'target-dir'), path.join('target-dir', 'something'));
    });

    it('getUniqueFileName: treats leading-dot filenames as having no extension', async function () {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: '.env'}, 'target-dir'), path.join('target-dir', '.env'));
    });

    it('getUniqueFileName: denies numeric extensions', async function () {
        const storage = new StorageBase();
        let i = 0;

        storage.exists = function () {
            i = i + 1;

            return Promise.resolve(i < 2);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something.1'}, 'target-dir'), path.join('target-dir', 'something.1-1'));
    });

    it('getUniqueFileName: denies longer numeric extensions', async function () {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: 'something.342'}, 'target-dir'), path.join('target-dir', 'something.342'));
    });

    it('getUniqueFileName: sanitizes filenames before checking uniqueness', async function () {
        const storage = new StorageBase();
        const calls = [];

        storage.exists = function (filename, dir) {
            calls.push({filename, dir});

            return Promise.resolve(false);
        };

        assert.equal(await storage.getUniqueFileName({name: '(abc*@#123).zip'}, 'target-dir'), path.join('target-dir', '-abc-@-123-.zip'));
        assert.deepEqual(calls, [{filename: '-abc-@-123-.zip', dir: 'target-dir'}]);
    });
});
