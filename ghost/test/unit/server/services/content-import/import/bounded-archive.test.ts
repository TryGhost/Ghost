import { importFiles } from '../../../../../utils/csv-import-files';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { readBoundedArchive } from '../../../../../../core/server/services/content-import/import/bounded-archive';
import {
  assertCSVUploadSize,
  MAX_CSV_UPLOAD_BYTES,
} from '../../../../../../core/server/services/content-import/import/limits';

const { compress } = require('@tryghost/zip');

describe('bounded import archives', function () {
  let root: string;
  let zip: string;
  let files: typeof importFiles;
  let inspectionDirectories: string[];

  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'bounded-import-'));
    const input = path.join(root, 'input');
    await fs.outputFile(path.join(input, 'safe/row.csv'), 'title\nPost\n');
    await fs.outputFile(path.join(input, 'photo.jpg'), 'abcd');
    zip = path.join(root, 'import.zip');
    await compress(input, zip);
    inspectionDirectories = [];
    files = {
      ...importFiles,
      async createTempDirectory() {
        const directory = await fs.mkdtemp(path.join(root, 'inspect-'));
        inspectionDirectories.push(directory);
        return directory;
      },
    };
  });

  afterEach(async function () {
    for (const directory of inspectionDirectories) {
      assert.equal(await fs.pathExists(directory), false, 'inspection must clean its extraction');
    }
    await fs.remove(root);
  });

  it('inspects and extracts entries without buffering the expanded ZIP', async function () {
    const expected = ['photo.jpg', 'safe/row.csv'];
    assert.deepEqual((await readBoundedArchive(files, zip)).sort(), expected);
    assert.equal(inspectionDirectories.length, 1);
    assert.equal(await fs.pathExists(zip), true, 'the request still owns its uploaded ZIP');
    const directory = path.join(root, 'output');
    const entries = await readBoundedArchive(files, zip, { directory, maxBytes: 15 });
    assert.deepEqual(entries.sort(), expected);
    assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
    assert.equal(await fs.readFile(path.join(directory, 'safe/row.csv'), 'utf8'), 'title\nPost\n');
  });

  it('rejects archives over their expanded byte or entry budgets', async function () {
    await assert.rejects(readBoundedArchive(files, zip, { maxBytes: 14 }), {
      code: 'CSV_ZIP_TOO_LARGE',
    });
    await assert.rejects(readBoundedArchive(files, zip, { maxEntries: 1 }), {
      code: 'CSV_ZIP_TOO_MANY_ENTRIES',
    });
  });

  it('rejects traversal in archive entry names', async function () {
    const original = Buffer.from('safe/row.csv');
    const traversal = Buffer.from('../x/row.csv');
    const bytes = await fs.readFile(zip);
    let offset = bytes.indexOf(original);
    assert.ok(offset >= 0);
    while (offset >= 0) {
      traversal.copy(bytes, offset);
      offset = bytes.indexOf(original, offset + original.length);
    }
    await fs.writeFile(zip, bytes);
    await assert.rejects(readBoundedArchive(files, zip), /invalid relative path/i);
  });

  async function changeEntry(name: string, change: (bytes: Buffer, offset: number) => void) {
    const bytes = await fs.readFile(zip);
    const signature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    let offset = bytes.indexOf(signature);
    let changed = false;
    while (offset >= 0) {
      const length = bytes.readUInt16LE(offset + 28);
      if (bytes.subarray(offset + 46, offset + 46 + length).toString() === name) {
        change(bytes, offset);
        changed = true;
      }
      offset = bytes.indexOf(signature, offset + 4);
    }
    assert.equal(changed, true);
    await fs.writeFile(zip, bytes);
  }

  it('cleans partial extraction when streamed data exceeds its declared size', async function () {
    await changeEntry('safe/row.csv', (bytes, offset) => bytes.writeUInt32LE(1, offset + 24));
    let partialFiles: string[] = [];
    files.removeDirectory = async (directory) => {
      partialFiles = await fs.readdir(directory);
      await importFiles.removeDirectory(directory);
    };
    await assert.rejects(readBoundedArchive(files, zip), { code: 'INVALID_ENTRY_SIZE' });
    assert.ok(partialFiles.includes('photo.jpg'));
  });

  it('cleans its inspection directory when the ZIP cannot be opened', async function () {
    await fs.writeFile(zip, 'not a ZIP');
    await assert.rejects(readBoundedArchive(files, zip));
    assert.equal(inspectionDirectories.length, 1);
  });

  it('rejects ambiguous duplicate paths before overwriting an extracted file', async function () {
    await fs.outputFile(path.join(root, 'input/other.jpg'), 'second');
    await compress(path.join(root, 'input'), zip);
    await changeEntry('other.jpg', (bytes, offset) => {
      Buffer.from('PHOTO.JPG').copy(bytes, offset + 46);
    });
    await assert.rejects(readBoundedArchive(files, zip), /duplicate paths/);
  });

  it.each([
    { mode: 0o120777, reason: /Symlinks are not allowed/ },
    { mode: 0o010600, reason: /unsafe entry/ },
    { mode: 0o040700, reason: /invalid directory/ },
  ])('rejects unsafe archive entry modes ($mode)', async function ({ mode, reason }) {
    await changeEntry('photo.jpg', (bytes, offset) => {
      bytes.writeUInt32LE((mode << 16) >>> 0, offset + 38);
    });
    await assert.rejects(readBoundedArchive(files, zip), reason);
  });

  it.each([
    { name: 'dot segment', fileName: './fe/row.csv' },
    { name: 'null byte', fileName: 'safe/row\0csv' },
  ])('rejects unsafe path components ($name)', async function ({ fileName }) {
    await changeEntry('safe/row.csv', (bytes, offset) => {
      Buffer.from(fileName).copy(bytes, offset + 46);
    });
    await assert.rejects(readBoundedArchive(files, zip), /unsafe entry/);
  });

  it('uses shared ZIP normalization and skips macOS metadata', async function () {
    await fs.outputFile(path.join(root, 'input/__MACOSX/._photo.jpg'), 'metadata');
    await compress(path.join(root, 'input'), zip);
    await changeEntry('safe/row.csv', (bytes, offset) => {
      Buffer.from('safe\\row.csv').copy(bytes, offset + 46);
    });
    assert.deepEqual((await readBoundedArchive(files, zip)).sort(), ['photo.jpg', 'safe/row.csv']);
  });

  it.each(['unix', 'dos'])(
    'recognizes %s directories without a trailing slash',
    async function (platform) {
      await fs.outputFile(path.join(root, 'input/empty-dir'), '');
      await compress(path.join(root, 'input'), zip);
      await changeEntry('empty-dir', (bytes, offset) => {
        if (platform === 'unix') {
          bytes.writeUInt32LE((0o040700 << 16) >>> 0, offset + 38);
        } else {
          bytes.writeUInt16LE(20, offset + 4);
          bytes.writeUInt32LE(16, offset + 38);
        }
      });
      assert.deepEqual((await readBoundedArchive(files, zip)).sort(), [
        'photo.jpg',
        'safe/row.csv',
      ]);
    },
  );

  it('makes read-only archive directories writable for extraction and cleanup', async function () {
    await changeEntry('safe/', (bytes, offset) => {
      bytes.writeUInt32LE((0o040555 << 16) >>> 0, offset + 38);
    });
    assert.deepEqual((await readBoundedArchive(files, zip)).sort(), ['photo.jpg', 'safe/row.csv']);
  });

  it('accepts the exact upload size boundary and rejects one byte more', async function () {
    const source = path.join(root, 'sparse.csv');
    await fs.writeFile(source, '');
    await fs.truncate(source, MAX_CSV_UPLOAD_BYTES);
    assertCSVUploadSize(await importFiles.getSize(source));
    await fs.truncate(source, MAX_CSV_UPLOAD_BYTES + 1);
    const size = await importFiles.getSize(source);
    assert.throws(() => assertCSVUploadSize(size), { code: 'CSV_UPLOAD_TOO_LARGE' });
  });
});
